-- Allow anonymous users to insert course slots (needed for public booking page)
DROP POLICY "Authenticated can insert slots" ON public.course_slots;
CREATE POLICY "Anyone can insert slots" ON public.course_slots FOR INSERT WITH CHECK (true);