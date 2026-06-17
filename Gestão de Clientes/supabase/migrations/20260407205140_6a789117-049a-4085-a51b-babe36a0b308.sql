CREATE TABLE public.course_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  course_name text DEFAULT NULL,
  shift text DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.course_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked dates" ON public.course_blocked_dates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can insert blocked dates" ON public.course_blocked_dates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete blocked dates" ON public.course_blocked_dates FOR DELETE TO authenticated USING (true);