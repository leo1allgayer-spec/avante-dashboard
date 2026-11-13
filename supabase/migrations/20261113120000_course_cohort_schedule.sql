-- Nicolas teaches this course only; unconfigured dates/turns remain closed.
begin;
alter table public.course_instructor_availability
  drop constraint if exists course_instructor_availability_course_name_check;
alter table public.course_instructor_availability
  add constraint course_instructor_availability_course_name_check
  check (course_name in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online','Curso em Turma'));

create or replace function public.course_instructor_enabled(p_instructor text,p_course text,p_date date,p_shift text)
returns boolean language sql stable security definer set search_path='' as $$
 select case when p_course='Curso em Turma' then
   p_instructor='Nicolas' and coalesce((select a.enabled from public.course_instructor_availability a
     where a.instructor=p_instructor and a.course_name=p_course and a.date=p_date
       and a.shift=case when public.course_booking_shift(p_shift)='Manhã' then '08:30' else '14:00' end),false)
 else coalesce((select a.enabled from public.course_instructor_availability a
     where a.instructor=p_instructor and a.course_name=p_course and a.date=p_date
       and a.shift=case when public.course_booking_shift(p_shift)='Manhã' then '08:30' else '14:00' end),
     p_instructor='Nicolas' and not public.legacy_course_shift_disabled(p_course,p_date,p_shift)) end;
$$;

create or replace function public.is_course_shift_disabled(p_course text,p_date date,p_shift text)
returns boolean language sql stable security definer set search_path='' as $$
 select case when p_course in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online','Curso em Turma')
   then not (public.course_instructor_enabled('Nicolas',p_course,p_date,p_shift)
     or (p_course<>'Curso em Turma' and public.course_instructor_enabled('Henrique',p_course,p_date,p_shift)))
   else public.legacy_course_shift_disabled(p_course,p_date,p_shift) end;
$$;

create or replace function public.choose_course_instructor(p_course text,p_date date,p_shift text,p_exclude uuid default null)
returns text language plpgsql stable security definer set search_path='' as $$
declare teacher text; existing_teacher text; teachers text[];
begin
 if p_course not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online','Curso em Turma') then return null;end if;
 select b.instructor into existing_teacher from public.course_bookings b
  where b.course_name=p_course and b.date=p_date and public.course_booking_shift(b.time)=public.course_booking_shift(p_shift)
    and b.id is distinct from p_exclude and b.status='confirmed'
    and coalesce(b.course_status,'') not in ('cancelado','concluido','concluído') and b.instructor is not null
  order by b.created_at limit 1;
 teachers:=case when p_course='Curso em Turma' then array['Nicolas']
   when existing_teacher is null then array['Nicolas','Henrique'] else array[existing_teacher] end;
 for teacher in select unnest(teachers) loop
  if public.course_instructor_enabled(teacher,p_course,p_date,p_shift)
   and not exists(select 1 from public.course_bookings b where b.id is distinct from p_exclude and b.date=p_date
     and public.course_booking_shift(b.time)=public.course_booking_shift(p_shift) and b.status='confirmed'
     and coalesce(b.course_status,'') not in ('cancelado','concluido','concluído')
     and b.instructor=teacher and b.course_name<>p_course) then return teacher;end if;
 end loop;
 return null;
end;$$;

create or replace function public.get_course_instructor_calendar(p_course text,p_start date,p_end date)
returns table(booking_date date,booking_shift text,instructor text) language sql stable security definer set search_path='' as $$
 select day::date,shift,public.choose_course_instructor(p_course,day::date,shift)
 from generate_series(p_start::timestamp,least(p_end,p_start+92)::timestamp,interval '1 day') day
 cross join unnest(array['Manhã','Tarde']) shift
 where p_course in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online','Curso em Turma');
$$;

-- Extend the existing trigger without replacing its video and Meta-specific rules.
do $migration$
declare definition text; anchor text;
begin
 definition:=pg_get_functiondef('public.assign_course_instructor()'::regprocedure);
 anchor:=$old$if new.course_name not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online') then new.instructor:=null;return new;end if;$old$;
 if position(anchor in definition)=0 then raise exception 'Unexpected instructor trigger definition';end if;
 definition:=replace(definition,anchor,$new$if new.course_name='Curso em Turma' then
  if new.status<>'confirmed' or coalesce(new.course_status,'') in ('cancelado','concluido','concluído') then return new;end if;
  if tg_op='UPDATE' and new.course_name=old.course_name and new.date=old.date
    and public.course_booking_shift(new.time)=public.course_booking_shift(old.time) and new.instructor='Nicolas' then return new;end if;
  perform pg_advisory_xact_lock(hashtextextended('course-online:'||new.date::text||':'||public.course_booking_shift(new.time),0));
  new.instructor:=public.choose_course_instructor(new.course_name,new.date,new.time,new.id);
  if new.instructor is null then raise exception 'Nicolas não está disponível para este curso, data e turno';end if;
  return new;
 end if;
 if new.course_name not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online') then new.instructor:=null;return new;end if;
$new$);
 execute definition;
end $migration$;

-- Public registrations for this catalog course have a 15-student limit per turn.
do $migration$
declare definition text; anchor text;
begin
 definition:=pg_get_functiondef('public.create_public_course_booking(text,text,text,text,text,text,text,text)'::regprocedure);
 anchor:='v_capacity integer := 5;';
 if position(anchor in definition)=0 then raise exception 'Unexpected booking capacity declaration';end if;
 definition:=replace(definition,anchor,'v_capacity integer := case when p_course_name=''Curso em Turma'' then 15 else 5 end;');
 anchor:='insert into public.course_slots(course_name,date,time,max_students) values(p_course_name,v_requested_date,v_slot_time,5) returning id into v_slot_id;';
 if position(anchor in definition)=0 then raise exception 'Unexpected default slot capacity insert';end if;
 definition:=replace(definition,anchor,'insert into public.course_slots(course_name,date,time,max_students) values(p_course_name,v_requested_date,v_slot_time,case when p_course_name=''Curso em Turma'' then 15 else 5 end) returning id into v_slot_id;');
 execute definition;
end $migration$;

insert into public.course_instructor_availability(instructor,course_name,date,shift,enabled) values
 ('Nicolas','Curso em Turma','2026-11-28','08:30',true),
 ('Nicolas','Curso em Turma','2026-11-28','14:00',true),
 ('Nicolas','Curso em Turma','2026-12-12','08:30',true),
 ('Nicolas','Curso em Turma','2026-12-12','14:00',true)
on conflict(instructor,course_name,date,shift) do update set enabled=excluded.enabled;

grant execute on function public.get_course_instructor_calendar(text,date,date) to anon,authenticated;
revoke all on function public.choose_course_instructor(text,date,text,uuid) from public,anon,authenticated;
revoke all on function public.course_instructor_enabled(text,text,date,text) from public,anon,authenticated;
select pg_notify('pgrst','reload schema');
commit;
