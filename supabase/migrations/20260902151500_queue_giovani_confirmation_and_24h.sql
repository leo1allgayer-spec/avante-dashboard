do $$
declare
  v_booking_id uuid;
begin
  select id into v_booking_id
  from public.course_bookings
  where lower(trim(email)) = 'giovaninostrani@gmail.com'
    and course_name = 'Curso Google Ads'
    and date = date '2026-09-03'
    and status = 'confirmed'
    and coalesce(course_status, '') not in ('cancelado', 'concluído', 'concluido')
  order by created_at desc
  limit 1;

  if v_booking_id is null then
    raise exception 'Agendamento atual do Giovani não encontrado';
  end if;

  update public.whatsapp_scheduled_messages
  set status = 'cancelled', updated_at = now()
  where booking_id = v_booking_id
    and status = 'pending'
    and message_type in ('confirmation', 'reminder_24h');

  insert into public.whatsapp_scheduled_messages(booking_id, message_type, scheduled_for, status)
  values
    (v_booking_id, 'confirmation', now(), 'pending'),
    (v_booking_id, 'reminder_24h', now(), 'pending');
end;
$$;