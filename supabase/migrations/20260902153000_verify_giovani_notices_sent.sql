do $$
declare
  v_booking_id uuid;
  v_sent integer;
begin
  select id into v_booking_id from public.course_bookings
  where lower(trim(email)) = 'giovaninostrani@gmail.com'
    and course_name = 'Curso Google Ads' and date = date '2026-09-03'
  order by created_at desc limit 1;

  select count(distinct message_type) into v_sent
  from public.whatsapp_message_logs
  where booking_id = v_booking_id
    and message_type in ('confirmation', 'reminder_24h')
    and status = 'sent'
    and created_at >= now() - interval '15 minutes';

  if v_sent <> 2 then
    raise exception 'Os dois avisos ainda não constam como enviados (% de 2)', v_sent;
  end if;
end;
$$;