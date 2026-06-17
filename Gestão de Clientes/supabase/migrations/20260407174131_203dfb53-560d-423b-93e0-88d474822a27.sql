
CREATE TABLE public.course_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_type text NOT NULL,
  student_name text NOT NULL,
  contact text DEFAULT '',
  date text DEFAULT '',
  time text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all enrollments"
  ON public.course_enrollments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert enrollments"
  ON public.course_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all enrollments"
  ON public.course_enrollments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete all enrollments"
  ON public.course_enrollments FOR DELETE TO authenticated USING (true);
