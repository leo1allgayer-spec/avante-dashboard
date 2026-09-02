do $$
declare v_future_id uuid; v_items jsonb; v_total_paid numeric;
begin
  select id, itens into v_future_id, v_items
  from public.alunos_futuros
  where cpf_limpo = '02512478050'
  order by created_at desc limit 1
  for update;
  if v_future_id is null then raise exception 'Cadastro futuro do Elton não encontrado'; end if;

  select jsonb_agg(
    case
      when lower(trim(coalesce(item->>'nome', ''))) in ('curso meta ads', 'curso de meta ads')
      then item || jsonb_build_object('valor_sinal', 1197, 'valor_pendente', 0, 'data', '2026-09-02')
      else item
    end
    order by ordinality
  ) into v_items
  from jsonb_array_elements(coalesce(v_items, '[]'::jsonb)) with ordinality as entry(item, ordinality);

  if not exists (
    select 1 from jsonb_array_elements(coalesce(v_items, '[]'::jsonb)) item
    where lower(trim(coalesce(item->>'nome', ''))) in ('curso meta ads', 'curso de meta ads')
  ) then raise exception 'Item Curso Meta Ads do Elton não encontrado'; end if;

  select coalesce(sum(coalesce((item->>'valor_sinal')::numeric, 0)), 0)
  into v_total_paid from jsonb_array_elements(v_items) item;

  update public.alunos_futuros
  set valor_sinal = v_total_paid,
      itens = v_items,
      observacao = concat_ws(E'
', nullif(observacao, ''), 'Pagamento quitado: sinal de R$ 100,00 e saldo de R$ 1.097,00 em 3x no cartão.'),
      updated_at = now()
  where id = v_future_id;

  if not exists (
    select 1 from public.alunos_futuros aluno
    join public.vendas venda on venda.aluno_futuro_id = aluno.id
    join public.fechamentos_diarios fechamento on fechamento.venda_id = venda.id
    cross join lateral jsonb_array_elements(aluno.itens) item
    where aluno.id = v_future_id
      and lower(trim(coalesce(item->>'nome', ''))) in ('curso meta ads', 'curso de meta ads')
      and (item->>'valor_sinal')::numeric = 1197
      and (item->>'valor_pendente')::numeric = 0
      and venda.valor = 1197 and venda.status = 'pago'
      and fechamento.valor_sinal = 1197 and fechamento.valor_a_entrar = 0
      and fechamento.status = 'recebido'
  ) then raise exception 'Falha na validação financeira consolidada do Elton'; end if;
end;
$$;