create or replace function public.guard_course_disabled_days_changes()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(coalesce(auth.jwt()->>'email', ''));
  v_course text := case when tg_op = 'DELETE' then old.course_name else new.course_name end;
begin
  if auth.uid() is null then
    if auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin') then
      return case when tg_op = 'DELETE' then old else new end;
    end if;
    raise exception using errcode = '42501', message = 'Usuario nao autenticado';
  end if;

  if v_email in (
    'digitalavante3@gmail.com',
    'nicolaspatzlaff02@gmail.com',
    'lucadsilva666@gmail.com',
    'leonardowebster.ja@gmail.com'
  ) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if v_email = 'hjasiulzwicz@gmail.com' and lower(trim(v_course)) = 'curso google ads' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  raise exception using errcode = '42501', message = 'Sem permissao para alterar a disponibilidade deste curso';
end;
$$;

drop trigger if exists guard_course_disabled_days_changes_trigger on public.course_disabled_days;
create trigger guard_course_disabled_days_changes_trigger
before insert or update or delete on public.course_disabled_days
for each row execute function public.guard_course_disabled_days_changes();

select pg_notify('pgrst', 'reload schema');