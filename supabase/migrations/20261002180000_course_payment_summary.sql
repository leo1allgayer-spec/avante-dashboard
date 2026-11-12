-- Financial information is only available to the financial management team.
create or replace function public.course_payment_summary()
returns table(student_name text, course_name text, remaining numeric)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or lower(coalesce(auth.jwt()->>'email','')) not in (
    'digitalavante3@gmail.com', 'nicolaspatzlaff02@gmail.com',
    'lucadsilva666@gmail.com', 'leonardowebster.ja@gmail.com'
  ) then
    raise exception using errcode = '42501', message = 'Sem acesso financeiro';
  end if;
  return query
  select a.nome::text, item->>'nome',
    case when item->>'valor_pendente' ~ '^[0-9]+([.][0-9]+)?$'
      then (item->>'valor_pendente')::numeric else null end
  from public.alunos_futuros a
  cross join lateral jsonb_array_elements(coalesce(a.itens, '[]'::jsonb)) item;
end;
$$;
revoke all on function public.course_payment_summary() from public, anon;
grant execute on function public.course_payment_summary() to authenticated;
notify pgrst, 'reload schema';
