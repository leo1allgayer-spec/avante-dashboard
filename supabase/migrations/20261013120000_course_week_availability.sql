begin;
create table if not exists public.course_day_overrides (
  course_name text not null,
  date date not null,
  shift text not null check (shift in ('08:30', '14:00')),
  enabled boolean not null,
  primary key (course_name, date, shift)
);
alter table public.course_day_overrides enable row level security;
grant select on public.course_day_overrides to anon, authenticated;
grant insert, update, delete on public.course_day_overrides to authenticated;
create policy "Read course date availability" on public.course_day_overrides for select to anon, authenticated using (true);
create policy "Manage course date availability" on public.course_day_overrides for all to authenticated
  using (true) with check (true);
-- Reuse the existing course-specific authorization guard for every mutation.
create trigger guard_course_day_overrides_changes
  before insert or update or delete on public.course_day_overrides
  for each row execute function public.guard_course_disabled_days_changes();

create or replace function public.is_course_shift_disabled(p_course text, p_date date, p_shift text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select not enabled from public.course_day_overrides
      where course_name = p_course and date = p_date
      and shift = case when p_shift in ('Manhã', '08:30') then '08:30' else '14:00' end),
    exists (select 1 from public.course_disabled_days
      where course_name = p_course and day_of_week = extract(dow from p_date)::integer
      and (shift is null or shift in (
        p_shift,
        case when p_shift in ('Manhã', '08:30') then '08:30' else '14:00' end,
        case when p_shift in ('Manhã', '08:30') then 'Manhã' else 'Tarde' end
      )))
  );
$$;

-- Keep the deployed booking function and its other rules intact.
do $$
declare v_definition text;
begin
  select pg_get_functiondef(oid) into strict v_definition from pg_proc
    where oid = 'public.create_public_course_booking(text,text,text,text,text,text,text,text)'::regprocedure;
  if position('is_course_shift_disabled' in v_definition) = 0 then
    v_definition := regexp_replace(v_definition, '\mbegin\M', $code$begin
      if p_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and p_shift in ('Manhã', 'Tarde')
        and public.is_course_shift_disabled(p_course_name, p_date::date, p_shift) then
        raise exception 'Este dia ou turno está desativado';
      end if;
    $code$, 'i');
    execute v_definition;
  end if;
end;
$$;
select pg_notify('pgrst', 'reload schema');
commit;
