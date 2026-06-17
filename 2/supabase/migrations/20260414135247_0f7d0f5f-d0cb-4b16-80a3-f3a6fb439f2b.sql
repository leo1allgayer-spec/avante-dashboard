ALTER TABLE public.daily_metrics
ADD COLUMN super_meta_mensal numeric DEFAULT 0,
ADD COLUMN super_meta_diaria numeric DEFAULT 0;