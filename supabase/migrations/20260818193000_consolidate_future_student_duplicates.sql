-- Consolida vendas que foram duplicadas quando o cadastro trouxe o nome
-- completo e a venda antiga usava uma versao abreviada.
begin;

-- Remove primeiro somente as copias automaticas.
delete from public.vendas
where id in (
  '27871c64-4517-4fe8-b612-dfe4edeea9a8',
  '4aa4cbbc-091f-4d2d-a28c-0ce4fc993dae',
  'f43f1900-6f0b-4c48-9c66-64b5a127c812',
  'ceb7b352-bfae-41c8-9414-d0d48db8141e'
)
and origem = 'Cadastro do aluno';

-- Preserva as vendas originais, nomes completos e vinculo com o cadastro.
update public.vendas set
  cliente = 'Alessandra Aparecida Araujo Oliveira',
  valor = greatest(valor, 1178),
  aluno_futuro_id = '037f72b1-984c-4a22-b87f-3b19e3b33ee5',
  aluno_futuro_item = 'curso meta ads', updated_at = now()
where id = '2027b99c-8c75-4784-9a06-7288fa6916ae';

update public.vendas set
  cliente = 'Raiana Marli siqueira maia',
  aluno_futuro_id = '10bc7c61-7860-4fce-876f-a85b1157feac',
  aluno_futuro_item = 'curso meta ads', updated_at = now()
where id = '0c55c9b7-8d3f-46c7-83c8-572cb19716e4';

update public.vendas set
  cliente = 'Tiago Sparremberger Bernardes',
  aluno_futuro_id = '8177c2f9-069c-4928-a625-b43b7d49ff89',
  aluno_futuro_item = 'curso meta ads', updated_at = now()
where id = 'ae1abd0a-43da-4b60-a581-45c53cfb026c';

update public.vendas set
  cliente = 'Wellington Alexandre Machado',
  aluno_futuro_id = '10b42e3c-ec3e-4022-8b8a-060f3b832b72',
  aluno_futuro_item = 'curso meta ads', updated_at = now()
where id = '9d9f039e-c4cf-4156-901a-9b538f7bae8f';

-- Mantem um unico fechamento correto do Tiago: R$ 200 coletados e R$ 997.
delete from public.fechamentos_diarios
where id in (
  '54b1797e-3d94-4b5b-a12e-0236fb9ee608',
  '9a3f381f-775e-4f81-99c5-c361a7e38527',
  'f7e98cb8-64aa-4c75-a2c6-a28bc11e08f6',
  'dad77916-b08d-4768-bb35-78b19d6572a0'
);

update public.fechamentos_diarios set
  cliente = 'Tiago Sparremberger Bernardes',
  valor_sinal = 200, valor_a_entrar = 997,
  status = 'a receber', updated_at = now()
where id = 'a59d056b-1e6b-47c9-9d20-64d826f42ecc';

update public.fechamentos_diarios set
  cliente = 'Alessandra Aparecida Araujo Oliveira',
  valor_sinal = 100, valor_a_entrar = 1078,
  status = 'a receber', updated_at = now()
where id = '39d730e3-66b5-4c7f-a244-0237d88b2450';

update public.fechamentos_diarios set cliente = 'Raiana Marli siqueira maia', updated_at = now()
where id = '4e857087-7a9f-4076-8c55-57b35cf20614';

update public.fechamentos_diarios set cliente = 'Wellington Alexandre Machado', updated_at = now()
where id = '035a6382-4b18-4e6c-aebd-f06c72465c6d';

commit;

-- A sincronizacao futura passa a reconhecer nomes abreviados quando houver
-- pelo menos duas palavras em comum e o mesmo produto/servico.
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

    select venda.id into v_sale_id from public.vendas venda
    where venda.aluno_futuro_id is null
      and trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(venda.produto, ''), venda.servico), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g')) = v_item_match_key
      and (
        select count(*) from unnest(regexp_split_to_array(lower(trim(regexp_replace(venda.cliente, '\s+', ' ', 'g'))), ' ')) token
        where token = any(regexp_split_to_array(lower(trim(regexp_replace(new.nome, '\s+', ' ', 'g'))), ' '))
      ) >= 2
    order by venda.created_at desc limit 1;

    if v_sale_id is not null then
      update public.vendas set
        cliente = trim(new.nome), aluno_futuro_id = new.id,
        aluno_futuro_item = v_item_key, updated_at = now()
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
        valor=case when public.vendas.origem='Cadastro do aluno' then excluded.valor else public.vendas.valor end,
        comissao=case when public.vendas.origem='Cadastro do aluno' then excluded.comissao else public.vendas.comissao end,
        status=case when public.vendas.origem='Cadastro do aluno' then excluded.status else public.vendas.status end,
        updated_at=now();
    end if;
  end loop;
  return new;
end;
$$;

select pg_notify('pgrst', 'reload schema');
