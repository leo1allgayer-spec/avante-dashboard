UPDATE whatsapp_scheduled_messages s
SET scheduled_for = s.scheduled_for + interval '30 minutes'
FROM course_bookings b
WHERE s.booking_id = b.id
  AND s.status = 'pending'
  AND b.time = 'Tarde';