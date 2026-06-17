ALTER TABLE public.course_bookings
DROP CONSTRAINT IF EXISTS unique_email_slot;

CREATE UNIQUE INDEX IF NOT EXISTS unique_booking_student_email_slot
ON public.course_bookings (slot_id, lower(email), lower(student_name));