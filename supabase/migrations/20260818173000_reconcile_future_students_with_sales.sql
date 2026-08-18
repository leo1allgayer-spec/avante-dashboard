-- Mantem vendas manuais independentes de Alunos Futuros e, quando existe um
-- cadastro, vincula/reaproveita a venda equivalente antes de criar outra.
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
  v_item_match_key text;
  v_signal numeric;
  v_pending numeric;
  v_total numeric;
  v_user_id uuid;
  v_sale_id uuid;
  v_sale_date date;
begin
  if new.itens is null
     or jsonb_typeof(new.itens) <> 'array'
     or jsonb_array_length(new.itens) = 0 then
    return new;
  end if;

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
    v_item_match_key := trim(regexp_replace(' ' || v_item_key || ' ', '\s+de\s+', ' ', 'g'));
    v_signal := greatest(coalesce(nullif(replace(regexp_replace(coalesce(v_item->>'valor_sinal', '0'), '[^0-9,.-]', '', 'g'), ',', '.'), '')::numeric, 0), 0);
    v_pending := greatest(coalesce(nullif(replace(regexp_replace(coalesce(v_item->>'valor_pendente', '0'), '[^0-9,.-]', '', 'g'), ',', '.'), '')::numeric, 0), 0);
    v_total := v_signal + v_pending;
    v_sale_date := (coalesce(nullif(v_item->>'data', ''), new.created_at::text)::timestamptz at time zone 'America/Sao_Paulo')::date;
    v_sale_id := null;

    -- Primeiro tenta adotar uma venda antiga equivalente que ainda esteja
    -- sem o vinculo tecnico. Isso evita duplicar cadastros anteriores.
    select venda.id into v_sale_id
    from public.vendas as venda
    where venda.aluno_futuro_id is null
      and lower(trim(regexp_replace(venda.cliente, '\s+', ' ', 'g')))
          = lower(trim(regexp_replace(new.nome, '\s+', ' ', 'g')))
      and trim(regexp_replace(
            ' ' || lower(trim(regexp_replace(coalesce(nullif(venda.produto, ''), venda.servico), '\s+', ' ', 'g'))) || ' ',
            '\s+de\s+', ' ', 'g'
          )) = v_item_match_key
    order by venda.created_at desc
    limit 1;

    if v_sale_id is not null then
      update public.vendas
      set aluno_futuro_id = new.id,
          aluno_futuro_item = v_item_key,
          updated_at = now()
      where id = v_sale_id;
    else
      insert into public.vendas (
        user_id, data, vendedor, cliente, produto, servico, valor, pagamento,
        parcelas, valor_com_juros, comissao, status_comissao, status, origem,
        aluno_futuro_id, aluno_futuro_item, updated_at
      ) values (
        v_user_id, v_sale_date, 'A preencher', trim(new.nome),
        case when v_item_type in ('curso', 'produto') then v_item_name else '' end,
        case when v_item_type = 'servico' then v_item_name else '' end,
        v_total, 'A definir', null, null, round(v_signal * 0.15, 2),
        'pendente', case when v_pending <= 0 then 'pago' else 'pendente' end,
        'Cadastro do aluno', new.id, v_item_key, now()
      )
      on conflict (aluno_futuro_id, aluno_futuro_item)
        where aluno_futuro_id is not null and aluno_futuro_item is not null
      do update set
        cliente = excluded.cliente,
        valor = case when public.vendas.origem = 'Cadastro do aluno' then excluded.valor else public.vendas.valor end,
        comissao = case when public.vendas.origem = 'Cadastro do aluno' then excluded.comissao else public.vendas.comissao end,
        status = case when public.vendas.origem = 'Cadastro do aluno' then excluded.status else public.vendas.status end,
        updated_at = now();
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists sync_future_student_items_to_sales_trigger on public.alunos_futuros;
create trigger sync_future_student_items_to_sales_trigger
after insert or update of nome, cpf, itens on public.alunos_futuros
for each row execute function public.sync_future_student_items_to_sales();

-- Reprocessa os existentes. O indice (aluno + item) e a adocao acima tornam
-- esta operacao idempotente.
update public.alunos_futuros
set itens = itens, updated_at = now()
where jsonb_array_length(coalesce(itens, '[]'::jsonb)) > 0;

select pg_notify('pgrst', 'reload schema');
