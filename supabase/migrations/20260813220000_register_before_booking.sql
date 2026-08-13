drop function if exists public.register_future_student_from_booking(text, text, text, text, numeric, text);

create or replace function public.register_future_student_from_booking(
  p_nome text,
  p_telefone text,
  p_cpf text,
  p_curso text,
  p_valor_sinal numeric,
  p_prazo text default 'agendar_agora',
  p_observacao text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_cpf_limpo text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_item_nome text := trim(coalesce(p_curso, ''));
  v_itens jsonb;
  v_sinal_total numeric;
begin
  if trim(coalesce(p_nome, '')) = '' then raise exception 'Nome obrigatório'; end if;
  if trim(coalesce(p_telefone, '')) = '' then raise exception 'Telefone obrigatório'; end if;
  if length(v_cpf_limpo) <> 11 then raise exception 'CPF inválido'; end if;
  if v_item_nome = '' then raise exception 'Curso obrigatório'; end if;
  if coalesce(p_valor_sinal, 0) <= 0 then raise exception 'Valor do sinal deve ser maior que zero'; end if;
  if p_prazo not in ('agendar_agora', '15_dias', '30_dias') then raise exception 'Prazo inválido'; end if;

  select id, coalesce(itens, '[]'::jsonb) into v_id, v_itens
  from public.alunos_futuros where cpf_limpo = v_cpf_limpo for update;

  v_itens := coalesce((
    select jsonb_agg(elements.item)
    from jsonb_array_elements(coalesce(v_itens, '[]'::jsonb)) as elements(item)
    where elements.item->>'nome' <> v_item_nome
  ), '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'tipo', 'curso', 'nome', v_item_nome, 'valor_sinal', p_valor_sinal,
    'valor_pendente', 0, 'prazo', p_prazo, 'data', now()
  ));

  select coalesce(sum((elements.item->>'valor_sinal')::numeric), 0) into v_sinal_total
  from jsonb_array_elements(v_itens) as elements(item);

  if v_id is null then
    insert into public.alunos_futuros (nome, telefone, cpf, curso, itens, valor_sinal, status, observacao, updated_at)
    values (trim(p_nome), trim(p_telefone), trim(p_cpf), v_item_nome, v_itens, v_sinal_total, 'sinal_pago', coalesce(p_observacao, ''), now())
    returning id into v_id;
  else
    update public.alunos_futuros
    set nome = trim(p_nome), telefone = trim(p_telefone), cpf = trim(p_cpf), curso = v_item_nome,
        itens = v_itens, valor_sinal = v_sinal_total, status = 'sinal_pago',
        observacao = coalesce(p_observacao, ''), updated_at = now()
    where id = v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function public.register_future_student_from_booking(text, text, text, text, numeric, text, text) from public;
grant execute on function public.register_future_student_from_booking(text, text, text, text, numeric, text, text) to anon, authenticated;
select pg_notify('pgrst', 'reload schema');
