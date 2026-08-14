alter table public.vendas
  add column if not exists aluno_futuro_id uuid references public.alunos_futuros(id) on delete set null,
  add column if not exists aluno_futuro_item text;

create unique index if not exists vendas_aluno_futuro_item_unique
  on public.vendas (aluno_futuro_id, aluno_futuro_item)
  where aluno_futuro_id is not null and aluno_futuro_item is not null;

create or replace function public.sync_future_student_items_to_sales()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_item jsonb;
  v_item_name text;
  v_item_type text;
  v_item_key text;
  v_signal numeric;
  v_user_id uuid;
begin
  if new.itens is null or jsonb_typeof(new.itens) <> 'array' or jsonb_array_length(new.itens) = 0 then
    return new;
  end if;

  -- As vendas do cadastro público pertencem ao mesmo usuário que já opera a
  -- planilha. Em uma instalação nova, usamos o primeiro usuário do projeto.
  select venda.user_id into v_user_id
  from public.vendas as venda
  where venda.user_id is not null
  order by venda.created_at desc
  limit 1;

  if v_user_id is null then
    select usuario.id into v_user_id
    from auth.users as usuario
    order by usuario.created_at
    limit 1;
  end if;

  if v_user_id is null then return new; end if;

  for v_item in select value from jsonb_array_elements(new.itens)
  loop
    v_item_name := trim(coalesce(v_item->>'nome', ''));
    if v_item_name = '' then continue; end if;

    v_item_type := lower(coalesce(v_item->>'tipo', 'curso'));
    v_item_key := lower(regexp_replace(v_item_name, '\s+', ' ', 'g'));
    v_signal := greatest(coalesce((v_item->>'valor_sinal')::numeric, 0), 0);

    insert into public.vendas (
      user_id, data, vendedor, cliente, produto, servico, valor, pagamento,
      parcelas, valor_com_juros, comissao, status_comissao, status, origem,
      aluno_futuro_id, aluno_futuro_item, updated_at
    ) values (
      v_user_id,
      (coalesce(v_item->>'data', new.created_at::text)::timestamptz at time zone 'America/Sao_Paulo')::date,
      'A preencher', trim(new.nome),
      case when v_item_type in ('curso', 'produto') then v_item_name else '' end,
      case when v_item_type = 'servico' then v_item_name else '' end,
      v_signal, 'A definir', null, null, 0, 'pendente', 'pendente',
      'Cadastro do aluno', new.id, v_item_key, now()
    )
    on conflict (aluno_futuro_id, aluno_futuro_item)
      where aluno_futuro_id is not null and aluno_futuro_item is not null
    do update set
      cliente = excluded.cliente,
      produto = case when public.vendas.produto = '' then excluded.produto else public.vendas.produto end,
      servico = case when public.vendas.servico = '' then excluded.servico else public.vendas.servico end,
      valor = case when public.vendas.status = 'pendente' and public.vendas.origem = 'Cadastro do aluno' then excluded.valor else public.vendas.valor end,
      updated_at = now();
  end loop;

  return new;
end;
$$;

drop trigger if exists sync_future_student_items_to_sales_trigger on public.alunos_futuros;
create trigger sync_future_student_items_to_sales_trigger
after insert or update of nome, itens on public.alunos_futuros
for each row execute function public.sync_future_student_items_to_sales();

-- Inclui na planilha os cadastros já existentes, sem duplicar linhas.
update public.alunos_futuros set updated_at = now() where jsonb_array_length(coalesce(itens, '[]'::jsonb)) > 0;

select pg_notify('pgrst', 'reload schema');
