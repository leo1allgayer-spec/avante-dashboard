begin;

-- A course shift is unavailable whenever an instructor has a future meeting
-- that overlaps the teaching window. All meeting categories/types participate.
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
      and (
        m.responsible = p_instructor
        or m.professional = p_instructor
        or p_instructor = any(coalesce(m.participants, array[]::text[]))
      )
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

revoke all on function public.course_instructor_meeting_conflict(text,date,text) from public, anon, authenticated;

create or replace function public.get_course_instructor_meeting_conflicts(
  p_instructor text,
  p_start date,
  p_end date
)
returns table(booking_date date, booking_shift text)
language sql
stable
security definer
set search_path = ''
as $$
  select days.day::date, shifts.shift
  from generate_series(p_start::timestamp, least(p_end, p_start + 92)::timestamp, interval '1 day') days(day)
  cross join (values ('08:30'::text), ('14:00'::text)) shifts(shift)
  where public.course_instructor_meeting_conflict(p_instructor, days.day::date, shifts.shift);
$$;

grant execute on function public.get_course_instructor_meeting_conflicts(text,date,date) to authenticated;

-- A busy instructor is skipped when choosing a teacher for a newly booked
-- course. Existing bookings are not changed by this function replacement.
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
begin
  if p_course not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online','Curso em Turma') then return null; end if;

  select b.instructor into existing_teacher
  from public.course_bookings b
  where b.course_name = p_course
    and b.date = p_date
    and public.course_booking_shift(b.time) = public.course_booking_shift(p_shift)
    and b.id is distinct from p_exclude
    and b.status = 'confirmed'
    and coalesce(b.course_status, '') not in ('cancelado','concluido','concluído')
    and b.instructor is not null
  order by b.created_at
  limit 1;

  teachers := case when p_course = 'Curso em Turma' then array['Nicolas']
    when existing_teacher is null then array['Nicolas','Henrique']
    else array[existing_teacher] end;

  for teacher in select unnest(teachers) loop
    if public.course_instructor_enabled(teacher, p_course, p_date, p_shift)
      and not public.course_instructor_meeting_conflict(teacher, p_date, p_shift)
      and not exists (
        select 1 from public.course_bookings b
        where b.id is distinct from p_exclude
          and b.date = p_date
          and public.course_booking_shift(b.time) = public.course_booking_shift(p_shift)
          and b.status = 'confirmed'
          and coalesce(b.course_status, '') not in ('cancelado','concluido','concluído')
          and b.instructor = teacher
          and b.course_name <> p_course
      ) then
      return teacher;
    end if;
  end loop;
  return null;
end;
$$;

-- Do not create or move a future meeting over an already-confirmed course
-- booking assigned to one of its participants/responsibles. Historical rows
-- are deliberately left untouched.
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

drop trigger if exists prevent_meeting_over_confirmed_course on public.meetings;
create trigger prevent_meeting_over_confirmed_course
before insert or update of date, time, duration_minutes, responsible, professional, participants, status
on public.meetings
for each row execute function public.prevent_meeting_over_confirmed_course();

revoke all on function public.prevent_meeting_over_confirmed_course() from public, anon, authenticated;
select pg_notify('pgrst', 'reload schema');
commit;
