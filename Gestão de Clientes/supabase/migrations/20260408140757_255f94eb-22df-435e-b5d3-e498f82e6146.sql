ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS email text DEFAULT '';
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS instagram text DEFAULT '';