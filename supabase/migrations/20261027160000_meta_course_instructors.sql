begin;
alter table public.course_bookings add column if not exists instructor text check(instructor in ('Nicolas','Henrique'));
create table public.course_instructor_availability (
 instructor text not null check(instructor in ('Nicolas','Henrique')),
 course_name text not null check(course_name in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online')),
 date date not null,shift text not null check(shift in ('08:30','14:00')),enabled boolean not null,
 primary key(instructor,course_name,date,shift)
);
alter table public.course_instructor_availability enable row level security;
grant select on public.course_instructor_availability to authenticated;
grant insert,update,delete on public.course_instructor_availability to authenticated;
create policy instructor_availability_read on public.course_instructor_availability for select to authenticated using(true);
create policy instructor_availability_manage on public.course_instructor_availability for all to authenticated using(
 lower(auth.jwt()->>'email') in ('digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com') or (instructor='Henrique' and lower(auth.jwt()->>'email')='hjasiulzwicz@gmail.com')
) with check(lower(auth.jwt()->>'email') in ('digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com') or (instructor='Henrique' and lower(auth.jwt()->>'email')='hjasiulzwicz@gmail.com'));
-- Preserve the former course rules as the initial Nicolas schedule.
alter function public.is_course_shift_disabled(text,date,text) rename to legacy_course_shift_disabled;
create function public.course_instructor_enabled(p_instructor text,p_course text,p_date date,p_shift text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select a.enabled from public.course_instructor_availability a where a.instructor=p_instructor and a.course_name=p_course and a.date=p_date and a.shift=case when public.course_booking_shift(p_shift)='Manhã' then '08:30' else '14:00' end),p_instructor='Nicolas' and not public.legacy_course_shift_disabled(p_course,p_date,p_shift));
$$;
create or replace function public.is_course_shift_disabled(p_course text,p_date date,p_shift text) returns boolean language sql stable security definer set search_path='' as $$
 select case when p_course in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online') then not (public.course_instructor_enabled('Nicolas',p_course,p_date,p_shift) or public.course_instructor_enabled('Henrique',p_course,p_date,p_shift)) else public.legacy_course_shift_disabled(p_course,p_date,p_shift) end;
$$;
-- Existing bookings keep their course/date; historic rows remain unassigned.
update public.course_bookings set instructor='Nicolas' where instructor is null and course_name in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online') and date >= (now() at time zone 'America/Sao_Paulo')::date and status='confirmed' and coalesce(course_status,'') not in ('cancelado','concluído','concluido');
create function public.choose_course_instructor(p_course text,p_date date,p_shift text,p_exclude uuid default null) returns text language plpgsql stable security definer set search_path='' as $$
declare teacher text;existing_teacher text;
begin
 if p_course not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online') then return null;end if;
 select b.instructor into existing_teacher from public.course_bookings b where b.course_name=p_course and b.date=p_date and public.course_booking_shift(b.time)=public.course_booking_shift(p_shift) and b.id is distinct from p_exclude and b.status='confirmed' and coalesce(b.course_status,'') not in ('cancelado','concluido','concluído') and b.instructor is not null order by b.created_at limit 1;
 for teacher in select unnest(case when existing_teacher is null then array['Nicolas','Henrique'] else array[existing_teacher] end) loop
  if public.course_instructor_enabled(teacher,p_course,p_date,p_shift) and not exists(select 1 from public.course_bookings b where b.id is distinct from p_exclude and b.date=p_date and public.course_booking_shift(b.time)=public.course_booking_shift(p_shift) and b.status='confirmed' and coalesce(b.course_status,'') not in ('cancelado','concluido','concluído') and b.instructor=teacher and b.course_name<>p_course) then return teacher;end if;
 end loop;
 return null;
end;$$;
create function public.assign_course_instructor() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.course_name not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online') then new.instructor:=null;return new;end if;
 if new.status<>'confirmed' or coalesce(new.course_status,'') in ('cancelado','concluido','concluído') then return new;end if;
 if tg_op='UPDATE' then
  if new.course_name=old.course_name and new.date=old.date and public.course_booking_shift(new.time)=public.course_booking_shift(old.time) and new.instructor is not distinct from old.instructor then return new;end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('course-online:'||new.date::text||':'||public.course_booking_shift(new.time),0));
 new.instructor:=public.choose_course_instructor(new.course_name,new.date,new.time,new.id);
 if new.instructor is null then raise exception 'Nenhum professor disponível neste curso, dia e turno. Escolha outro horário.';end if;
 return new;
end;$$;
create trigger assign_course_instructor before insert or update of course_name,date,time,instructor on public.course_bookings for each row execute function public.assign_course_instructor();
create function public.get_course_instructor_calendar(p_course text,p_start date,p_end date) returns table(booking_date date,booking_shift text,instructor text) language sql stable security definer set search_path='' as $$
 select day::date,shift,public.choose_course_instructor(p_course,day::date,shift) from generate_series(p_start::timestamp,least(p_end,p_start+92)::timestamp,interval '1 day') day cross join unnest(array['Manhã','Tarde']) shift where p_course in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online');
$$;
grant execute on function public.get_course_instructor_calendar(text,date,date) to anon,authenticated;
revoke all on function public.choose_course_instructor(text,date,text,uuid) from public,anon,authenticated;
revoke all on function public.course_instructor_enabled(text,text,date,text) from public,anon,authenticated;
select pg_notify('pgrst','reload schema');
commit;
