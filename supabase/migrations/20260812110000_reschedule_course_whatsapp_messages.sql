create or replace function public.reschedule_course_whatsapp_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_at timestamptz;
begin
  if new.date is not distinct from old.date and new.time is not distinct from old.time then
    return new;
  end if;

  update public.whatsapp_scheduled_messages
  set status = 'cancelled', updated_at = now()
  where booking_id = new.id
    and status = 'pending'
    and message_type in ('reminder_24h', 'reminder_1h', 'post_course');

  if new.status <> 'confirmed' or coalesce(new.course_status, '') in ('cancelado', 'concluído') then
    return new;
  end if;

  v_course_at := (new.date::timestamp + case
    when lower(coalesce(new.time, '')) like '%tarde%' then time '14:00'
    when lower(coalesce(new.time, '')) like '%manh%' then time '08:30'
    when new.time ~ '^[0-9]{1,2}:[0-9]{2}$' then new.time::time
    else time '08:30'
  end) at time zone 'America/Sao_Paulo';

  insert into public.whatsapp_scheduled_messages (booking_id, message_type, scheduled_for, status)
  select new.id, message_type, scheduled_for, 'pending'
  from (values
    ('reminder_24h'::text, v_course_at - interval '24 hours'),
    ('reminder_1h'::text, v_course_at - interval '1 hour'),
    ('post_course'::text, v_course_at + interval '7 days')
  ) as messages(message_type, scheduled_for)
  where scheduled_for > now();

  return new;
end;
$$;

drop trigger if exists course_booking_reschedule_whatsapp on public.course_bookings;
create trigger course_booking_reschedule_whatsapp
after update of date, time on public.course_bookings
for each row
execute function public.reschedule_course_whatsapp_messages();
