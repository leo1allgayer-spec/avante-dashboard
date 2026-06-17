
-- Drop restrictive policies
DROP POLICY IF EXISTS "Users can insert their own metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "Users can delete their own metrics" ON public.daily_metrics;

-- Allow all authenticated users to insert
CREATE POLICY "Authenticated users can insert metrics"
ON public.daily_metrics FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to update
CREATE POLICY "Authenticated users can update metrics"
ON public.daily_metrics FOR UPDATE TO authenticated
USING (true);

-- Allow all authenticated users to delete
CREATE POLICY "Authenticated users can delete metrics"
ON public.daily_metrics FOR DELETE TO authenticated
USING (true);
