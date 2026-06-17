
-- Create RPC for public booking availability (no PII exposed)
CREATE OR REPLACE FUNCTION public.get_booking_counts(p_course_name text)
RETURNS TABLE(booking_date text, booking_time text, booking_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cb.date, cb.time, COUNT(*)::bigint
  FROM public.course_bookings cb
  WHERE cb.course_name = p_course_name
    AND cb.status = 'confirmed'
  GROUP BY cb.date, cb.time
$$;

-- Remove anon write on whatsapp_scheduled_messages
DROP POLICY IF EXISTS "Anon can insert scheduled" ON public.whatsapp_scheduled_messages;
DROP POLICY IF EXISTS "Anon can update scheduled" ON public.whatsapp_scheduled_messages;

-- Remove anon write on whatsapp_message_logs
DROP POLICY IF EXISTS "Anon can insert logs" ON public.whatsapp_message_logs;
DROP POLICY IF EXISTS "Anon can update logs" ON public.whatsapp_message_logs;
