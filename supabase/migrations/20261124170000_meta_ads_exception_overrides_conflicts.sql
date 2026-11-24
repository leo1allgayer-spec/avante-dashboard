begin;

-- A date/shift exception for Meta Ads and Meta Ads Avançado overrides the
-- selected shift's calendar restrictions and assigns the turn to Nicolas.
create or replace function public.course_instructor_meeting_conflict(
  p_instructor text,
  p_date date,
  p_shift text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.meetings m
    where m.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      and m.date::date between p_date - 1 and p_date
      and m.time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
      and lower(trim(coalesce(m.status, ''))) not in ('cancelled','canceled','cancelado','cancelada','completed','concluido','concluída','concluida')
      and (m.responsible = p_instructor or m.professional = p_instructor or p_instructor = any(coalesce(m.participants, array[]::text[])))
      and tsrange(
        m.date::date + m.time::time,
        m.date::date + m.time::time + make_interval(mins => greatest(coalesce(m.duration_minutes, 60), 0)),
        '[)'
      ) && tsrange(
        p_date + case when public.course_booking_shift(p_shift) = 'Manhã' then time '08:30' else time '14:00' end,
        p_date + case when public.course_booking_shift(p_shift) = 'Manhã' then time '12:00' else time '18:00' end,
        '[)'
      )
      and m.date::date + m.time::time + make_interval(mins => greatest(coalesce(m.duration_minutes, 60), 0))
        > (now() at time zone 'America/Sao_Paulo')
  );
$$;

create or replace function public.choose_course_instructor(
  p_course text,
  p_date date,
  p_shift text,
  p_exclude uuid default null
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  teacher text;
  existing_teacher text;
  teachers text[];
  has_exception boolean;
begin
  if p_course not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online','Curso em Turma') then return null; end if;

  select exists (
    select 1 from public.meta_ads_exceptions e
    where e.date = p_date
      and p_course in ('Curso Meta Ads','Curso Meta Ads Avançado')
      and (e.shift is null or public.course_booking_shift(e.shift) = public.course_booking_shift(p_shift))
  ) into has_exception;

  select b.instructor into existing_teacher
  from public.course_bookings b
  where b.course_name = p_course
    and b.date = p_date
    and public.course_booking_shift(b.time) = public.course_booking_shift(p_shift)
    and b.id is distinct from p_exclude
    and b.status = 'confirmed'
    and coalesce(b.course_status, '') not in ('cancelado','concluido','concluído')
    and b.instructor is not null
    and b.course_name in ('Curso Meta Ads','Curso Meta Ads Avançado')
  order by b.created_at
  limit 1;

  if has_exception and p_course in ('Curso Meta Ads','Curso Meta Ads Avançado') then
    return 'Nicolas';
  end if;

  teachers := case when p_course = 'Curso em Turma' then array['Nicolas']
    when existing_teacher is null then array['Nicolas','Henrique']
    else array[existing_teacher] end;

  for teacher in select unnest(teachers) loop
    if public.course_instructor_enabled(teacher, p_course, p_date, p_shift)
      and (has_exception or (
        not public.course_instructor_meeting_conflict(teacher, p_date, p_shift)
        and not exists (
          select 1 from public.course_bookings b
          where b.id is distinct from p_exclude
            and b.date = p_date
            and public.course_booking_shift(b.time) = public.course_booking_shift(p_shift)
            and b.status = 'confirmed'
            and coalesce(b.course_status, '') not in ('cancelado','concluido','concluído')
            and b.instructor = teacher
            and b.course_name <> p_course
        )
      )) then
      return teacher;
    end if;
  end loop;
  return null;
end;
$$;

-- An exception also overrides the meeting-versus-confirmed-course guard for
-- that exact Meta Ads turn.
create or replace function public.prevent_meeting_over_confirmed_course()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conflicting_course text;
  conflicting_date date;
  conflicting_time text;
begin
  if lower(trim(coalesce(new.status, ''))) in ('cancelled','canceled','cancelado','cancelada','completed','concluido','concluída','concluida')
    or new.date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or new.time !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then
    return new;
  end if;
  if new.date::date < (now() at time zone 'America/Sao_Paulo')::date then return new; end if;
  if new.date::date + new.time::time + make_interval(mins => greatest(coalesce(new.duration_minutes, 60), 0))
    <= (now() at time zone 'America/Sao_Paulo') then return new; end if;

  select b.course_name, b.date, b.time
    into conflicting_course, conflicting_date, conflicting_time
  from public.course_bookings b
  where b.status = 'confirmed'
    and coalesce(b.course_status, '') not in ('cancelado','cancelada','concluido','concluído','faltou','não compareceu','nao compareceu')
    and b.instructor is not null
    and b.date between new.date::date - 1 and new.date::date + 1
    and b.course_name in ('Curso Meta Ads','Curso Meta Ads Avançado')
    and not exists (
      select 1 from public.meta_ads_exceptions e
      where e.date = b.date
        and (e.shift is null or public.course_booking_shift(e.shift) = public.course_booking_shift(b.time))
    )
    and (
      new.responsible = b.instructor
      or new.professional = b.instructor
      or b.instructor = any(coalesce(new.participants, array[]::text[]))
    )
    and tsrange(
      new.date::date + new.time::time,
      new.date::date + new.time::time + make_interval(mins => greatest(coalesce(new.duration_minutes, 60), 0)),
      '[)'
    ) && tsrange(
      b.date::date + case when public.course_booking_shift(b.time) = 'Manhã' then time '08:30' else time '14:00' end,
      b.date::date + case when public.course_booking_shift(b.time) = 'Manhã' then time '12:00' else time '18:00' end,
      '[)'
    )
  limit 1;

  if conflicting_course is not null then
    raise exception 'Este horário conflita com um curso confirmado de % em % (%). Escolha outro horário ou responsável.',
      conflicting_course, to_char(conflicting_date, 'DD/MM/YYYY'), conflicting_time;
  end if;
  return new;
end;
$$;

-- Public registration enforces the same calendar restrictions. Skip those
-- restrictions only when the operator explicitly created a Meta exception.
do $migration$
declare
  definition text;
  updated text;
begin
  definition := pg_get_functiondef('public.create_public_course_booking(text,text,text,text,text,text,text,text)'::regprocedure);
  updated := replace(definition, 'v_has_exception boolean := false;', 'v_has_exception boolean := false; v_exception_override boolean := false;');
  if updated = definition then raise exception 'Could not add Meta exception flag to booking RPC'; end if;
  definition := updated;
  updated := replace(definition,
    'v_booking_shift:=public.course_booking_shift(to_char(v_shift_time,''HH24:MI''));',
    'v_booking_shift:=public.course_booking_shift(to_char(v_shift_time,''HH24:MI'')); select exists(select 1 from public.meta_ads_exceptions e where e.date=v_requested_date and p_course_name in (''Curso Meta Ads'',''Curso Meta Ads Avançado'') and (e.shift is null or public.course_booking_shift(e.shift)=v_booking_shift)) into v_exception_override;');
  if updated = definition then raise exception 'Could not locate booking shift calculation'; end if;
  definition := updated;
  updated := replace(definition, 'if (v_requested_date+v_shift_time)<', 'if not v_exception_override and (v_requested_date+v_shift_time)<');
  if updated = definition then raise exception 'Could not locate booking lead-time check'; end if;
  definition := updated;
  updated := replace(definition, 'if not v_is_special and p_course_name not in (''Curso Meta Ads'',''Curso Meta Ads Avançado'',''Curso Meta Ads Online'',''Curso em Turma'') and exists(select 1 from public.course_disabled_days', 'if not v_exception_override and not v_is_special and p_course_name not in (''Curso Meta Ads'',''Curso Meta Ads Avançado'',''Curso Meta Ads Online'',''Curso em Turma'') and exists(select 1 from public.course_disabled_days');
  if updated = definition then raise exception 'Could not locate disabled weekday check'; end if;
  definition := updated;
  updated := replace(definition, 'if exists(select 1 from public.course_blocked_dates', 'if not v_exception_override and exists(select 1 from public.course_blocked_dates');
  if updated = definition then raise exception 'Could not locate blocked date check'; end if;
  execute updated;
end
$migration$;

-- Let the operator's exception override the separate Meta Online exclusion
-- trigger for Basic and Advanced Meta course bookings on that same turn.
do $migration$
declare
  definition text;
  updated text;
begin
  definition := pg_get_functiondef('public.guard_course_online_exclusivity()'::regprocedure);
  updated := regexp_replace(definition, 'begin', $inject$begin
  if tg_table_name = 'course_bookings' then
    if new.course_name in ('Curso Meta Ads','Curso Meta Ads Avançado') and exists (
      select 1 from public.meta_ads_exceptions e
      where e.date = new.date
        and (e.shift is null or public.course_booking_shift(e.shift) = public.course_booking_shift(new.time))
    ) then return new; end if;
  end if;
  $inject$, 'i');
  if updated = definition then raise exception 'Could not add Meta exception to online exclusivity guard'; end if;
  execute updated;
end
$migration$;

-- Set this exception specifically to tomorrow afternoon, preserving other
-- dates and shifts.
update public.meta_ads_exceptions set shift = 'Tarde'
where date = date '2026-11-25' and shift is null
  and not exists (select 1 from public.meta_ads_exceptions where date = date '2026-11-25' and shift = 'Tarde');
insert into public.meta_ads_exceptions(date, shift)
select date '2026-11-25', 'Tarde'
where not exists (select 1 from public.meta_ads_exceptions where date = date '2026-11-25' and shift = 'Tarde');
insert into public.course_instructor_availability(instructor, course_name, date, shift, enabled)
values ('Nicolas', 'Curso Meta Ads Avançado', date '2026-11-25', '14:00', true)
on conflict (instructor, course_name, date, shift) do update set enabled = true;

select pg_notify('pgrst', 'reload schema');
insert into supabase_migrations.schema_migrations(version, name)
values ('20261124170000', 'meta_ads_exception_overrides_conflicts')
on conflict (version) do nothing;
commit;
