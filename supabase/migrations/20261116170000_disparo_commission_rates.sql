create or replace function public.sale_commission_rate(p_origin text)
returns numeric
language sql
immutable
as $$
  select case
    when lower(trim(coalesce(p_origin, ''))) = 'disparo' then 0.075
    when lower(trim(coalesce(p_origin, ''))) = 'social seller' then 0.10
    else 0.15
  end;
$$;

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

  select venda.id, public.sale_commission_rate(venda.origem)
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

-- Keep synced future-student entries from resetting a Disparo commission to 15%.
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
        comissao = greatest(public.vendas.comissao, round(v_signal * public.sale_commission_rate(public.vendas.origem), 2)),
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
        v_total,'A definir',null,null,round(v_signal * public.sale_commission_rate('Cadastro do aluno'), 2),'pendente',
        case when v_pending<=0 then 'pago' else 'pendente' end,
        'Cadastro do aluno',new.id,v_item_key,now()
      )
      on conflict (aluno_futuro_id,aluno_futuro_item)
        where aluno_futuro_id is not null and aluno_futuro_item is not null
      do update set
        cliente=excluded.cliente,
        valor=greatest(public.vendas.valor, excluded.valor),
        comissao=round(v_signal * public.sale_commission_rate(public.vendas.origem), 2),
        status=excluded.status,
        updated_at=now()
      returning id into v_sale_id;
    end if;

    select fechamento.id into v_closing_id
    from public.fechamentos_diarios fechamento where fechamento.venda_id = v_sale_id limit 1;

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

select pg_notify('pgrst', 'reload schema');
