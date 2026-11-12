BEGIN;
CREATE TABLE IF NOT EXISTS public.annual_revenue_goals (
  year integer PRIMARY KEY CHECK (year BETWEEN 2000 AND 2200),
  amount numeric NOT NULL CHECK (amount >= 0),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.annual_revenue_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY annual_goals_read ON public.annual_revenue_goals FOR SELECT TO authenticated
  USING (NOT public.is_client_summary_user());
CREATE POLICY annual_goals_insert ON public.annual_revenue_goals FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_client_summary_user() AND updated_by = auth.uid());
CREATE POLICY annual_goals_update ON public.annual_revenue_goals FOR UPDATE TO authenticated
  USING (NOT public.is_client_summary_user()) WITH CHECK (NOT public.is_client_summary_user() AND updated_by = auth.uid());
COMMIT;
