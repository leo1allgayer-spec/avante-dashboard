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
  v_closing_id uuid;
  v_sale_date date;
begin
  if new.itens is null or jsonb_typeof(new.itens) <> 'array' or jsonb_array_length(new.itens) = 0 then return new; end if;

  select venda.user_id into v_user_id from public.vendas venda
  where venda.user_id is not null order by venda.created_at desc limit 1;
  if v_user_id is null then
    select usuario.id into v_user_id from auth.users usuario order by usuario.created_at limit 1;
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
    v_closing_id := null;

    -- Uma atualizacao financeira nunca deve procurar outra venda quando o item
    -- do aluno ja possui uma venda vinculada.
    select venda.id into v_sale_id
    from public.vendas venda
    where venda.aluno_futuro_id = new.id
      and trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(venda.aluno_futuro_item, ''), nullif(venda.produto, ''), venda.servico), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g')) = v_item_match_key
    order by venda.updated_at desc
    limit 1;

    if v_sale_id is null then
      select (array_agg(venda.id order by venda.created_at desc))[1] into v_sale_id
      from public.vendas venda
      where venda.aluno_futuro_id is null
        and trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(venda.produto, ''), venda.servico), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g')) = v_item_match_key
        and (
          select count(*) from unnest(regexp_split_to_array(lower(trim(regexp_replace(venda.cliente, '\s+', ' ', 'g'))), ' ')) token
          where token = any(regexp_split_to_array(lower(trim(regexp_replace(new.nome, '\s+', ' ', 'g'))), ' '))
        ) >= 2
      having count(*) = 1;
    end if;

    if v_sale_id is not null then
      update public.vendas set
        cliente = trim(new.nome),
        produto = case when v_item_type in ('curso','produto') then v_item_name else '' end,
        servico = case when v_item_type = 'servico' then v_item_name else '' end,
        valor = greatest(public.vendas.valor, v_total),
        comissao = greatest(public.vendas.comissao, round(v_signal * case when lower(coalesce(public.vendas.origem, '')) = 'social seller' then 0.10 else 0.15 end, 2)),
        status = case when lower(coalesce(public.vendas.status, '')) in ('pago','paga') then public.vendas.status when v_pending <= 0 then 'pago' else 'pendente' end,
        aluno_futuro_id = new.id,
        aluno_futuro_item = v_item_key,
        updated_at = now()
      where id = v_sale_id;
    else
      insert into public.vendas (
        user_id,data,vendedor,cliente,produto,servico,valor,pagamento,parcelas,
        valor_com_juros,comissao,status_comissao,status,origem,
        aluno_futuro_id,aluno_futuro_item,updated_at
      ) values (
        v_user_id,v_sale_date,'A preencher',trim(new.nome),
        case when v_item_type in ('curso','produto') then v_item_name else '' end,
        case when v_item_type='servico' then v_item_name else '' end,
        v_total,'A definir',null,null,round(v_signal*0.15,2),'pendente',
        case when v_pending<=0 then 'pago' else 'pendente' end,
        'Cadastro do aluno',new.id,v_item_key,now()
      )
      on conflict (aluno_futuro_id,aluno_futuro_item)
        where aluno_futuro_id is not null and aluno_futuro_item is not null
      do update set
        cliente=excluded.cliente,
        valor=greatest(public.vendas.valor, excluded.valor),
        comissao=round(v_signal * case when lower(coalesce(public.vendas.origem, '')) = 'social seller' then 0.10 else 0.15 end, 2),
        status=excluded.status,
        updated_at=now()
      returning id into v_sale_id;
    end if;

    select fechamento.id into v_closing_id
    from public.fechamentos_diarios fechamento
    where fechamento.venda_id = v_sale_id
    limit 1;

    if v_closing_id is null then
      select (array_agg(fechamento.id order by fechamento.updated_at desc))[1] into v_closing_id
      from public.fechamentos_diarios fechamento
      where fechamento.venda_id is null
        and lower(trim(fechamento.cliente)) = lower(trim(new.nome))
        and lower(coalesce(fechamento.origem, '')) = 'cadastro do aluno'
        and lower(coalesce(fechamento.status, '')) <> 'cancelado'
        and trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(fechamento.categoria, ''), fechamento.produto_servico), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g')) = v_item_match_key
      having count(*) = 1;
    end if;

    if v_closing_id is null then
      insert into public.fechamentos_diarios (
        venda_id, user_id, data, cliente, vendedor, produto_servico, categoria, origem,
        valor_sinal, valor_sinal_liquido, valor_a_entrar, valor_recorrente,
        status, pagamento_sinal, updated_at
      ) values (
        v_sale_id, v_user_id, v_sale_date, trim(new.nome), 'A preencher', v_item_name, v_item_name, 'Cadastro do aluno',
        v_signal, v_signal, v_pending, 0,
        case when v_pending <= 0 then 'recebido' else 'a receber' end,
        'A definir', now()
      );
    else
      update public.fechamentos_diarios
      set venda_id = v_sale_id,
          valor_sinal = v_signal,
          valor_sinal_liquido = v_signal,
          valor_a_entrar = v_pending,
          status = case when v_pending <= 0 then 'recebido' else 'a receber' end,
          updated_at = now()
      where id = v_closing_id;
    end if;
  end loop;
  return new;
end;
$$;


create or replace function public.sync_closing_to_future_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.vendas%rowtype;
  v_item_name text;
  v_match_key text;
begin
  if pg_trigger_depth() > 1 then return new; end if;

  v_item_name := trim(coalesce(nullif(new.categoria, ''), new.produto_servico, ''));
  v_match_key := lower(trim(regexp_replace(v_item_name, '\s+', ' ', 'g')));
  if v_match_key = '' then return new; end if;

  -- Sem o ID da venda nao ha sincronizacao automatica: registros historicos
  -- ambiguos devem ser revisados, nunca associados apenas pelo nome.
  if new.venda_id is null then return new; end if;
  select sale.* into v_sale from public.vendas sale where sale.id = new.venda_id;
  if v_sale.id is null or v_sale.aluno_futuro_id is null then return new; end if;

  perform public.update_future_student_item_values(
    v_sale.aluno_futuro_id,
    coalesce(nullif(v_sale.aluno_futuro_item, ''), v_match_key),
    greatest(coalesce(new.valor_sinal, 0), 0),
    greatest(coalesce(new.valor_a_entrar, 0), 0),
    v_item_name
  );
  return new;
end;
$$;

drop trigger if exists sync_closing_to_future_student_update_trigger on public.fechamentos_diarios;
create trigger sync_closing_to_future_student_update_trigger
after update of venda_id, valor_sinal, valor_a_entrar, categoria, produto_servico, cliente, status
on public.fechamentos_diarios
for each row execute function public.sync_closing_to_future_student();

select pg_notify('pgrst', 'reload schema');
