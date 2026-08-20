-- Social Seller recebe 10% de comissão; as demais origens permanecem em 15%.
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
  v_taxa_comissao numeric := 0.15;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;

  select * into v_boleto from public.boletos_recebimentos where id = p_boleto_id for update;
  if v_boleto.id is null then raise exception 'Boleto não encontrado'; end if;
  if auth.uid() not in (
    '7aefc8ff-cc00-4704-9a07-be45791fb539'::uuid,
    '4b2d0f41-d422-4b69-8a7b-419890dbcfe7'::uuid,
    'a4178654-ba1c-4ab9-aae6-efcd7444114d'::uuid
  ) then
    raise exception 'Conta sem permissão financeira';
  end if;
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

  select venda.id,
    case when lower(trim(coalesce(venda.origem, ''))) = 'social seller' then 0.10 else 0.15 end
  into v_venda_id, v_taxa_comissao
  from public.vendas venda
  where lower(trim(venda.cliente)) = lower(trim(v_fechamento.cliente))
    and lower(coalesce(venda.status, '')) <> 'cancelada'
    and trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(venda.servico, ''), venda.produto), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g'))
      = trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(v_fechamento.categoria, ''), v_fechamento.produto_servico), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g'))
  order by venda.updated_at desc
  limit 1;

  if v_venda_id is not null then
    update public.vendas set
      comissao = round(coalesce(comissao, 0) + (v_valor * v_taxa_comissao), 2),
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
