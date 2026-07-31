insert into public.whatsapp_scheduled_messages (booking_id, message_type, scheduled_for, status)
select
  b.id,
  reminders.message_type,
  reminders.scheduled_for,
  'pending'
from public.course_bookings b
cross join lateral (
  values
    (
      'reminder_24h',
      (
        case
          when lower(coalesce(b.time, '')) like '%tarde%' then (b.date::timestamp + time '14:00')
          when lower(coalesce(b.time, '')) like '%manh%' then (b.date::timestamp + time '08:30')
          when b.time ~ '^[0-9]{1,2}:[0-9]{2}$' then (b.date::timestamp + b.time::time)
          else (b.date::timestamp + time '08:30')
        end
      ) - interval '24 hours'
    ),
    (
      'reminder_1h',
      (
        case
          when lower(coalesce(b.time, '')) like '%tarde%' then (b.date::timestamp + time '14:00')
          when lower(coalesce(b.time, '')) like '%manh%' then (b.date::timestamp + time '08:30')
          when b.time ~ '^[0-9]{1,2}:[0-9]{2}$' then (b.date::timestamp + b.time::time)
          else (b.date::timestamp + time '08:30')
        end
      ) - interval '1 hour'
    )
) as reminders(message_type, scheduled_for)
where b.status = 'confirmed'
  and coalesce(b.course_status, '') not in ('cancelado', 'concluído')
  and reminders.scheduled_for > now()
  and not exists (
    select 1
    from public.whatsapp_scheduled_messages existing
    where existing.booking_id = b.id
      and existing.message_type = reminders.message_type
      and existing.status in ('pending', 'sent')
  );

select pg_notify('pgrst', 'reload schema');
