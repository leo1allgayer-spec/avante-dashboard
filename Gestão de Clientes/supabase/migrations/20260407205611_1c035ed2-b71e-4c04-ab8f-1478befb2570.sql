CREATE TABLE public.course_disabled_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (course_name, day_of_week)
);

ALTER TABLE public.course_disabled_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view disabled days" ON public.course_disabled_days FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can insert disabled days" ON public.course_disabled_days FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete disabled days" ON public.course_disabled_days FOR DELETE TO authenticated USING (true);