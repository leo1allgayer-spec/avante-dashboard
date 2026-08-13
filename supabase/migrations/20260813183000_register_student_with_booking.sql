create or replace function public.register_future_student_from_booking(
  p_nome text,
  p_telefone text,
  p_cpf text,
  p_valor_sinal numeric,
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
begin
  if trim(coalesce(p_nome, '')) = '' then
    raise exception 'Nome obrigatório';
  end if;
  if trim(coalesce(p_telefone, '')) = '' then
    raise exception 'Telefone obrigatório';
  end if;
  if length(v_cpf_limpo) <> 11 then
    raise exception 'CPF inválido';
  end if;
  if coalesce(p_valor_sinal, 0) <= 0 then
    raise exception 'Valor do sinal deve ser maior que zero';
  end if;

  insert into public.alunos_futuros (nome, telefone, cpf, valor_sinal, status, observacao, updated_at)
  values (trim(p_nome), trim(p_telefone), trim(p_cpf), p_valor_sinal, 'sinal_pago', coalesce(p_observacao, ''), now())
  on conflict (cpf_limpo) where cpf_limpo <> ''
  do update set
    nome = excluded.nome,
    telefone = excluded.telefone,
    cpf = excluded.cpf,
    valor_sinal = excluded.valor_sinal,
    status = 'sinal_pago',
    observacao = excluded.observacao,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.register_future_student_from_booking(text, text, text, numeric, text) from public;
grant execute on function public.register_future_student_from_booking(text, text, text, numeric, text) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');
