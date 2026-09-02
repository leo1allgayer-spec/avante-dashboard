do $$
declare
  v_survey public.survey_responses%rowtype;
  v_future_id uuid;
  v_sale_id uuid;
  v_user_id uuid;
  v_item_key text := 'curso meta ads';
begin
  select * into v_survey
  from public.survey_responses
  where regexp_replace(coalesce(cpf, ''), '[^0-9]', '', 'g') = '02512478050'
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Formulário do Elton não encontrado pelo CPF';
  end if;

  insert into public.alunos_futuros(
    nome, telefone, cpf, valor_sinal, status, observacao,
    survey_response_id, itens, created_at, updated_at
  ) values (
    'Elton Espíndola',
    coalesce(nullif(trim(v_survey.whatsapp), ''), '51997200592'),
    '025.124.780-50',
    100,
    'sinal_pago',
    'Sinal de R$ 100,00 e saldo de R$ 1.097,00 quitado em 3x no cartão.',
    v_survey.id,
    jsonb_build_array(jsonb_build_object(
      'nome', 'Curso Meta Ads',
      'tipo', 'curso',
      'valor_sinal', 100,
      'valor_pendente', 1097,
      'data', '2026-09-02'
    )),
    now(),
    now()
  )
  on conflict (cpf_limpo) where cpf_limpo <> ''
  do update set
    nome = excluded.nome,
    telefone = excluded.telefone,
    cpf = excluded.cpf,
    valor_sinal = excluded.valor_sinal,
    status = excluded.status,
    observacao = excluded.observacao,
    survey_response_id = excluded.survey_response_id,
    itens = excluded.itens,
    updated_at = now()
  returning id into v_future_id;

  update public.survey_responses
  set aluno_futuro_id = v_future_id
  where id = v_survey.id;

  select id, user_id into v_sale_id, v_user_id
  from public.vendas
  where aluno_futuro_id = v_future_id
    and aluno_futuro_item = v_item_key
  order by created_at desc
  limit 1;

  if v_sale_id is null then
    raise exception 'A sincronização não criou nem encontrou a venda do Elton';
  end if;

  update public.vendas
  set data = date '2026-09-02',
      cliente = 'Elton Espíndola',
      produto = 'Curso Meta Ads',
      servico = '',
      valor = 1197,
      pagamento = 'A definir',
      pagamento_saldo = 'Cartão de crédito — 3x',
      parcelas = '3x',
      valor_com_juros = null,
      comissao = 179.55,
      status_comissao = 'pendente',
      status = 'pago',
      origem = 'Cadastro do aluno',
      updated_at = now()
  where id = v_sale_id;

  select user_id into v_user_id from public.vendas where id = v_sale_id;

  insert into public.fechamentos_diarios(
    venda_id, user_id, data, cliente, vendedor, produto_servico,
    categoria, origem, valor_sinal, valor_sinal_liquido, valor_a_entrar,
    valor_recorrente, parcelas_total, valor_parcela, previsao_entrada,
    parcelas_datas, status, observacao, pagamento_sinal, pagamento_saldo,
    created_at, updated_at
  )
  select
    venda.id, venda.user_id, date '2026-09-02', venda.cliente, venda.vendedor,
    'Curso Meta Ads', 'Curso Meta Ads', venda.origem,
    1197, 1197, 0, 0, null, 0, null, '[]'::jsonb,
    'recebido',
    'Sinal de R$ 100,00. Saldo de R$ 1.097,00 pago em 3x no cartão.',
    'A definir', 'Cartão de crédito — 3x', now(), now()
  from public.vendas venda
  where venda.id = v_sale_id
  on conflict (venda_id) where venda_id is not null do update set
    user_id = excluded.user_id, data = excluded.data, cliente = excluded.cliente,
    vendedor = excluded.vendedor, produto_servico = excluded.produto_servico,
    categoria = excluded.categoria, origem = excluded.origem,
    valor_sinal = excluded.valor_sinal, valor_sinal_liquido = excluded.valor_sinal_liquido,
    valor_a_entrar = excluded.valor_a_entrar, valor_recorrente = excluded.valor_recorrente,
    parcelas_total = excluded.parcelas_total, valor_parcela = excluded.valor_parcela,
    previsao_entrada = excluded.previsao_entrada, parcelas_datas = excluded.parcelas_datas,
    status = excluded.status, observacao = excluded.observacao,
    pagamento_sinal = excluded.pagamento_sinal, pagamento_saldo = excluded.pagamento_saldo,
    updated_at = now();

  if not exists (
    select 1 from public.vendas venda
    join public.fechamentos_diarios fechamento on fechamento.venda_id = venda.id
    where venda.id = v_sale_id and venda.valor = 1197 and venda.status = 'pago'
      and fechamento.valor_sinal = 1197 and fechamento.valor_a_entrar = 0
      and fechamento.status = 'recebido'
  ) then
    raise exception 'Falha ao validar a venda quitada do Elton';
  end if;
end;
$$;