
-- Add shift column to course_disabled_days
ALTER TABLE public.course_disabled_days ADD COLUMN shift text DEFAULT NULL;

-- Drop old unique constraint if exists and add new one
ALTER TABLE public.course_disabled_days DROP CONSTRAINT IF EXISTS course_disabled_days_course_name_day_of_week_key;
CREATE UNIQUE INDEX course_disabled_days_unique ON public.course_disabled_days (course_name, day_of_week, COALESCE(shift, '__all__'));
