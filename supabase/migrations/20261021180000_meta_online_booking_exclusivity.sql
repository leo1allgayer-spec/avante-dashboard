begin;
create or replace function public.course_booking_shift(p_time text)
returns text language sql immutable set search_path='' as $$
 select case when lower(trim(p_time)) in ('manhã','manha') then 'Manhã' when lower(trim(p_time))='tarde' then 'Tarde'
 when trim(p_time) ~ '^[0-9]{2}:[0-9]{2}' then case when substring(trim(p_time),1,2)::integer<12 then 'Manhã' else 'Tarde' end else trim(p_time) end;
$$;
create or replace function public.course_name_for_enrollment(p_type text)
returns text language sql immutable set search_path='' as $$
 select case p_type when 'meta_ads' then 'Curso Meta Ads' when 'meta_ads_advanced' then 'Curso Meta Ads Avançado' when 'meta_ads_online' then 'Curso Meta Ads Online' when 'google' then 'Curso Google Ads' when 'social_media' then 'Curso Social Media' when 'canva' then 'Curso Canva' when 'ia' then 'Curso Inteligência Artificial' when 'video' then 'Curso Captação e Edição de Vídeo' else p_type end;
$$;
-- Mirrored enrollments follow their booking, including cancellations.
create or replace function public.course_online_occupied_shifts(p_exclude_booking uuid default null,p_exclude_enrollment uuid default null)
returns table(booking_date date,booking_shift text,is_online boolean)
language sql stable security definer set search_path='' as $$
 select b.date,public.course_booking_shift(b.time),b.course_name='Curso Meta Ads Online' from public.course_bookings b
 where b.id is distinct from p_exclude_booking and b.status='confirmed' and coalesce(b.course_status,'')<>'cancelado'
 union all
 select e.date::date,public.course_booking_shift(e.time),e.course_type='meta_ads_online' from public.course_enrollments e
 where e.id is distinct from p_exclude_enrollment and e.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and coalesce(e.time,'')<>''
 and not exists(select 1 from public.course_bookings b where lower(trim(b.student_name))=lower(trim(e.student_name)) and b.date::text=e.date and public.course_booking_shift(b.time)=public.course_booking_shift(e.time) and b.course_name=public.course_name_for_enrollment(e.course_type));
$$;
revoke all on function public.course_online_occupied_shifts(uuid,uuid) from public;
create or replace function public.get_course_online_conflicts(p_course_name text)
returns table(booking_date date,booking_shift text)
language sql stable security definer set search_path='' as $$
 select distinct s.booking_date,s.booking_shift from public.course_online_occupied_shifts() s
 where s.is_online<>(p_course_name='Curso Meta Ads Online')
 and s.booking_date>=(now() at time zone 'America/Sao_Paulo')::date
 and s.booking_date<=(now() at time zone 'America/Sao_Paulo')::date+60;
$$;
revoke all on function public.get_course_online_conflicts(text) from public;
grant execute on function public.get_course_online_conflicts(text) to anon,authenticated;
create or replace function public.guard_course_online_exclusivity()
returns trigger language plpgsql security definer set search_path='' as $$
declare requested_date date; requested_shift text; online_course boolean; exclude_booking uuid; exclude_enrollment uuid;
begin
 if tg_table_name='course_bookings' then
  if new.status<>'confirmed' or coalesce(new.course_status,'')='cancelado' then return new;end if;
  if tg_op='UPDATE' and old.date=new.date and old.time=new.time and old.course_name=new.course_name and old.status='confirmed' and coalesce(old.course_status,'')<>'cancelado' then return new;end if;
  requested_date:=new.date;requested_shift:=public.course_booking_shift(new.time);online_course:=new.course_name='Curso Meta Ads Online';exclude_booking:=new.id;
 else
  if coalesce(new.date,'')='' or coalesce(new.time,'')='' then return new;end if;
  if tg_op='UPDATE' and old.date=new.date and old.time=new.time and old.course_type=new.course_type then return new;end if;
  requested_date:=new.date::date;requested_shift:=public.course_booking_shift(new.time);online_course:=new.course_type='meta_ads_online';exclude_enrollment:=new.id;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('course-online:'||requested_date::text||':'||requested_shift,0));
 if exists(select 1 from public.course_online_occupied_shifts(exclude_booking,exclude_enrollment) s where s.booking_date=requested_date and s.booking_shift=requested_shift and s.is_online<>online_course) then
  if online_course then raise exception 'Já existe outro curso marcado neste turno. Escolha outro horário para Meta Ads Online.';
  else raise exception 'Este turno está reservado para Meta Ads Online. Escolha outro horário.';end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_course_online_exclusivity() from public;
create trigger guard_course_online_exclusivity before insert or update on public.course_bookings for each row execute function public.guard_course_online_exclusivity();
create trigger guard_enrollment_online_exclusivity before insert or update on public.course_enrollments for each row execute function public.guard_course_online_exclusivity();
-- Keep the deployed administrator permissions and existing course rules intact.
do $$declare definition text;updated text;begin
 select pg_get_functiondef('public.update_course_booking_admin(uuid,jsonb)'::regprocedure) into definition;
 if position('Curso Meta Ads Online' in definition)=0 then
  updated:=replace(definition,'''Curso Meta Ads Avançado'',','''Curso Meta Ads Avançado'', ''Curso Meta Ads Online'',');
  if updated=definition then raise exception 'Cannot locate administrator course allowlist';end if;
  execute updated;
 end if;
 select pg_get_functiondef('public.create_public_course_booking(text,text,text,text,text,text,text,text)'::regprocedure) into definition;
 if position('course-online:' in definition)=0 then
  updated:=regexp_replace(definition,'\mbegin\M',$patch$begin
   perform pg_advisory_xact_lock(hashtextextended('course-online:'||p_date||':'||public.course_booking_shift(p_shift),0));
  $patch$,'i');execute updated;
 end if;
end $$;
insert into public.course_disabled_days(course_name,day_of_week,shift)
select 'Curso Meta Ads Online',d.day_of_week,d.shift from public.course_disabled_days d where d.course_name='Curso Meta Ads'
and not exists(select 1 from public.course_disabled_days o where o.course_name='Curso Meta Ads Online' and o.day_of_week=d.day_of_week and o.shift is not distinct from d.shift);
select pg_notify('pgrst','reload schema');
commit;
