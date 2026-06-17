
ALTER TABLE public.course_bookings ADD COLUMN instagram text DEFAULT '';

-- Update sync trigger function to also pass email and instagram
CREATE OR REPLACE FUNCTION public.sync_booking_to_enrollment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_course_type text;
BEGIN
  CASE NEW.course_name
    WHEN 'Curso Google Ads' THEN v_course_type := 'google';
    WHEN 'Curso Social Media' THEN v_course_type := 'social_media';
    WHEN 'Curso Meta Ads' THEN v_course_type := 'meta_ads';
    WHEN 'Curso Inteligência Artificial' THEN v_course_type := 'ia';
    WHEN 'Curso Captação e Edição de Vídeo' THEN v_course_type := 'video';
    ELSE v_course_type := 'other';
  END CASE;

  INSERT INTO public.course_enrollments (user_id, course_type, student_name, contact, email, instagram, date, time)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_course_type,
    NEW.student_name,
    NEW.phone,
    NEW.email,
    COALESCE(NEW.instagram, ''),
    NEW.date,
    NEW.time
  );

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS sync_booking_enrollment ON public.course_bookings;
CREATE TRIGGER sync_booking_enrollment
  AFTER INSERT ON public.course_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_booking_to_enrollment();
