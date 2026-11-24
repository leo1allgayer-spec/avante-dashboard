begin;

-- An explicitly opened Curso em Turma date/turn is an administrator
-- exception. Keep other courses subject to the normal meeting conflict rule.
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
      and (p_course = 'Curso em Turma' or not public.course_instructor_meeting_conflict(teacher, p_date, p_shift))
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

revoke all on function public.choose_course_instructor(text,date,text,uuid) from public,anon,authenticated;
select pg_notify('pgrst','reload schema');
commit;
