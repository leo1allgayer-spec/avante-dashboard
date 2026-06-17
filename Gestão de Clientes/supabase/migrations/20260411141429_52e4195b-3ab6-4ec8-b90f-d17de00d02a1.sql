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
    WHEN 'Curso Meta Ads Avançado' THEN v_course_type := 'meta_ads_advanced';
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