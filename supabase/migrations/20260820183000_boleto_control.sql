create table if not exists public.boletos_recebimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  fechamento_id uuid not null references public.fechamentos_diarios(id) on delete cascade,
  parcela_numero integer not null check (parcela_numero > 0),
  vencimento date not null,
  valor numeric not null default 0 check (valor >= 0),
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  pago_em date,
  forma_pagamento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fechamento_id, parcela_numero)
);

alter table public.boletos_recebimentos enable row level security;
drop policy if exists "authenticated manage boletos" on public.boletos_recebimentos;
create policy "authenticated manage boletos" on public.boletos_recebimentos
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.sync_boletos_from_fechamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
  v_due date;
  v_amount numeric;
begin
  if lower(coalesce(new.status, '')) = 'cancelado' then
    update public.boletos_recebimentos
      set status = 'cancelado', updated_at = now()
    where fechamento_id = new.id and status = 'pendente';
    return new;
  end if;

  if coalesce(new.parcelas_total, 0) <= 0 or coalesce(new.valor_parcela, 0) <= 0 then
    return new;
  end if;

  for i in 1..new.parcelas_total loop
    v_due := coalesce(
      case
        when jsonb_typeof(to_jsonb(new.parcelas_datas)) = 'array'
          and jsonb_array_length(to_jsonb(new.parcelas_datas)) >= i
        then nullif(to_jsonb(new.parcelas_datas)->>(i - 1), '')::date
      end,
      new.previsao_entrada + ((i - 1) || ' month')::interval
    )::date;
    if v_due is null then continue; end if;
    v_amount := new.valor_parcela;

    insert into public.boletos_recebimentos (
      user_id, fechamento_id, parcela_numero, vencimento, valor
    ) values (
      new.user_id, new.id, i, v_due, v_amount
    )
    on conflict (fechamento_id, parcela_numero) do update set
      vencimento = case when public.boletos_recebimentos.status = 'pendente' then excluded.vencimento else public.boletos_recebimentos.vencimento end,
      valor = case when public.boletos_recebimentos.status = 'pendente' then excluded.valor else public.boletos_recebimentos.valor end,
      updated_at = now();
  end loop;

  update public.boletos_recebimentos
    set status = 'cancelado', updated_at = now()
  where fechamento_id = new.id
    and parcela_numero > new.parcelas_total
    and status = 'pendente';
  return new;
end;
$$;

drop trigger if exists sync_boletos_from_fechamento_trigger on public.fechamentos_diarios;
create trigger sync_boletos_from_fechamento_trigger
after insert or update of parcelas_total, valor_parcela, parcelas_datas, previsao_entrada, status
on public.fechamentos_diarios
for each row execute function public.sync_boletos_from_fechamento();

create or replace function public.confirmar_pagamento_boleto(
  p_boleto_id uuid,
  p_pago_em date default current_date,
  p_forma_pagamento text default 'Boleto'
)
returns public.boletos_recebimentos
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_boleto public.boletos_recebimentos;
  v_fechamento public.fechamentos_diarios;
  v_valor numeric;
  v_novo_saldo numeric;
  v_venda_id uuid;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;

  select * into v_boleto from public.boletos_recebimentos where id = p_boleto_id for update;
  if v_boleto.id is null then raise exception 'Boleto não encontrado'; end if;
  if v_boleto.user_id <> auth.uid() then raise exception 'Sem permissão para confirmar este boleto'; end if;
  if v_boleto.status = 'pago' then return v_boleto; end if;
  if v_boleto.status <> 'pendente' then raise exception 'Boleto não está pendente'; end if;

  select * into v_fechamento from public.fechamentos_diarios where id = v_boleto.fechamento_id for update;
  if v_fechamento.id is null then raise exception 'Fechamento financeiro não encontrado'; end if;

  v_valor := least(v_boleto.valor, greatest(v_fechamento.valor_a_entrar, 0));
  if v_valor <= 0 then raise exception 'A venda não possui saldo para receber'; end if;
  v_novo_saldo := greatest(0, v_fechamento.valor_a_entrar - v_valor);

  update public.fechamentos_diarios set
    valor_sinal = coalesce(valor_sinal, 0) + v_valor,
    valor_sinal_liquido = coalesce(valor_sinal_liquido, valor_sinal, 0) + v_valor,
    valor_a_entrar = v_novo_saldo,
    status = case when v_novo_saldo <= 0 then 'recebido' else 'a receber' end,
    pagamento_saldo = p_forma_pagamento,
    observacao = concat_ws(E'\n', nullif(trim(observacao), ''),
      '[PAGAMENTO_VENDA]' || jsonb_build_object(
        'id', 'boleto-' || v_boleto.id::text,
        'date', p_pago_em,
        'amount', v_valor,
        'netAmount', v_valor,
        'method', p_forma_pagamento
      )::text),
    updated_at = now()
  where id = v_fechamento.id;

  select venda.id into v_venda_id
  from public.vendas venda
  where lower(trim(venda.cliente)) = lower(trim(v_fechamento.cliente))
    and lower(coalesce(venda.status, '')) <> 'cancelada'
    and trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(venda.servico, ''), venda.produto), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g'))
      = trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(v_fechamento.categoria, ''), v_fechamento.produto_servico), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g'))
  order by venda.updated_at desc
  limit 1;

  if v_venda_id is not null then
    update public.vendas set
      comissao = round(coalesce(comissao, 0) + (v_valor * 0.15), 2),
      status_comissao = 'pendente',
      status = case when v_novo_saldo <= 0 then 'pago' else status end,
      pagamento_saldo = p_forma_pagamento,
      updated_at = now()
    where id = v_venda_id;
  end if;

  update public.boletos_recebimentos set
    status = 'pago', pago_em = p_pago_em,
    forma_pagamento = p_forma_pagamento, updated_at = now()
  where id = v_boleto.id
  returning * into v_boleto;
  return v_boleto;
end;
$$;

grant execute on function public.confirmar_pagamento_boleto(uuid, date, text) to authenticated;

-- Gera as parcelas das vendas por boleto já existentes.
update public.fechamentos_diarios
set parcelas_total = parcelas_total
where coalesce(parcelas_total, 0) > 0
  and lower(coalesce(status, '')) <> 'cancelado';

select pg_notify('pgrst', 'reload schema');
