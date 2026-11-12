begin;
create or replace function public.list_support_slots(p_from date default current_date, p_to date default (current_date + 60))
returns table(slot_date date, start_time time, capacity integer, booked integer)
language sql security definer set search_path = public
as $$
 with days as (
  select d::date as day from generate_series(greatest(p_from,(now() at time zone 'America/Sao_Paulo')::date)::timestamp,
   least(p_to,(now() at time zone 'America/Sao_Paulo')::date+90)::timestamp,interval '1 day') d
 ), effective as (
  select d.day,r.start_time,r.capacity from days d join public.support_availability_rules r
   on r.weekday=extract(dow from d.day)::integer and r.active
  where not exists(select 1 from public.support_date_overrides o where o.slot_date=d.day and o.start_time=r.start_time)
  union all
  select o.slot_date,o.start_time,o.capacity from public.support_date_overrides o join days d on d.day=o.slot_date where o.active
 )
 select rule.day,rule.start_time,rule.capacity,count(booking.id)::integer
 from effective rule
 left join public.support_bookings booking on booking.booking_date=rule.day and booking.start_time=rule.start_time and booking.status<>'cancelado'
 where rule.day+rule.start_time > now() at time zone 'America/Sao_Paulo'
 and not exists (
  select 1 from public.meetings m where m.date::date=rule.day and m.status<>'cancelled'
   and (m.responsible='Nicolas' or m.professional='Nicolas' or 'Nicolas'=any(coalesce(m.participants,array[]::text[])))
   and (m.time::time,m.time::time+(coalesce(m.duration_minutes,60)||' minutes')::interval)
    overlaps (rule.start_time,rule.start_time+interval '60 minutes')
 )
 and not exists (
  select 1 from public.agenda_blocks b
  where rule.day between b.start_date and b.end_date
   and lower(btrim(b.responsible))='nicolas'
   and (b.all_day or (b.start_time,b.end_time) overlaps (rule.start_time,rule.start_time+interval '60 minutes'))
 )
 group by rule.day,rule.start_time,rule.capacity having count(booking.id)<rule.capacity order by rule.day,rule.start_time;
$$;
revoke all on function public.list_support_slots(date,date) from public;
grant execute on function public.list_support_slots(date,date) to anon,authenticated;

commit;
