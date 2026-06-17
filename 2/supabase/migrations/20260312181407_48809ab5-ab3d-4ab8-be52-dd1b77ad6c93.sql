
DROP POLICY "Users can view their own metrics" ON public.daily_metrics;
CREATE POLICY "All authenticated users can view metrics" ON public.daily_metrics FOR SELECT TO authenticated USING (true);
