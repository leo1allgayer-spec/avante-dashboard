-- Trigger to delete corresponding enrollment when a booking is deleted
CREATE OR REPLACE FUNCTION public.delete_enrollment_on_booking_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_type text;
BEGIN
  CASE OLD.course_name
    WHEN 'Curso Google Ads' THEN v_course_type := 'google';
    WHEN 'Curso Social Media' THEN v_course_type := 'social_media';
    WHEN 'Curso Meta Ads' THEN v_course_type := 'meta_ads';
    WHEN 'Curso Meta Ads Avançado' THEN v_course_type := 'meta_ads_advanced';
    WHEN 'Curso Inteligência Artificial' THEN v_course_type := 'ia';
    WHEN 'Curso Captação e Edição de Vídeo' THEN v_course_type := 'video';
    ELSE v_course_type := 'other';
  END CASE;

  DELETE FROM public.course_enrollments
  WHERE student_name = OLD.student_name
    AND course_type = v_course_type
    AND date = OLD.date
    AND time = OLD.time;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS delete_enrollment_on_booking_delete_trg ON public.course_bookings;
CREATE TRIGGER delete_enrollment_on_booking_delete_trg
AFTER DELETE ON public.course_bookings
FOR EACH ROW
EXECUTE FUNCTION public.delete_enrollment_on_booking_delete();