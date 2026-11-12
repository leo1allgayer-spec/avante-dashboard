create or replace function public.list_support_slots(p_from date default current_date, p_to date default (current_date + 60))
returns table(slot_date date, start_time time, capacity integer, booked integer)
language sql security definer set search_path = public
as $$
  select day_value::date, rule.start_time, rule.capacity, count(booking.id)::integer
  from generate_series(greatest(p_from, (now() at time zone 'America/Sao_Paulo')::date)::timestamp,
    least(p_to, (now() at time zone 'America/Sao_Paulo')::date + 90)::timestamp, interval '1 day') day_value
  join public.support_availability_rules rule on rule.active and rule.weekday = extract(dow from day_value)::integer
  left join public.support_bookings booking on booking.booking_date = day_value::date and booking.start_time = rule.start_time and booking.status <> 'cancelado'
  where (day_value::date + rule.start_time) > (now() at time zone 'America/Sao_Paulo')
    and not exists (
      select 1 from public.meetings m
      where m.date::date = day_value::date and m.status <> 'cancelled'
        and (m.responsible = 'Nicolas' or m.professional = 'Nicolas' or 'Nicolas' = any(coalesce(m.participants, array[]::text[])))
        and (m.time::time, m.time::time + (coalesce(m.duration_minutes, 60) || ' minutes')::interval) overlaps
            (rule.start_time, rule.start_time + interval '60 minutes')
    )
  group by day_value, rule.start_time, rule.capacity
  having count(booking.id) < rule.capacity
  order by day_value, rule.start_time;
$$;

