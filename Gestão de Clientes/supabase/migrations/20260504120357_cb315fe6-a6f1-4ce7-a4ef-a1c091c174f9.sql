CREATE OR REPLACE FUNCTION public.get_booking_counts(p_course_name text)
 RETURNS TABLE(booking_date text, booking_time text, booking_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT cb.date, cb.time, COUNT(*)::bigint
  FROM public.course_bookings cb
  WHERE cb.course_name = p_course_name
    AND cb.status = 'confirmed'
    AND COALESCE(cb.course_status, '') <> 'cancelado'
  GROUP BY cb.date, cb.time
$function$;