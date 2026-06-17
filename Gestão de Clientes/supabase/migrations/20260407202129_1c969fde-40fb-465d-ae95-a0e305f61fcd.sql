
CREATE TABLE public.course_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  max_students integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.course_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view slots" ON public.course_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can insert slots" ON public.course_slots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update slots" ON public.course_slots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete slots" ON public.course_slots FOR DELETE TO authenticated USING (true);

CREATE TABLE public.course_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid REFERENCES public.course_slots(id) ON DELETE CASCADE NOT NULL,
  course_name text NOT NULL,
  student_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.course_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert bookings" ON public.course_bookings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can view bookings" ON public.course_bookings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can update bookings" ON public.course_bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete bookings" ON public.course_bookings FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.sync_booking_to_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  INSERT INTO public.course_enrollments (user_id, course_type, student_name, contact, date, time)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_course_type,
    NEW.student_name,
    NEW.phone,
    NEW.date,
    NEW.time
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.course_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_booking_to_enrollment();
