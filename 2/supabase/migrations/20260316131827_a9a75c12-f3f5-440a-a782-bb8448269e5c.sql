ALTER TABLE public.daily_metrics
ADD COLUMN IF NOT EXISTS ads numeric NOT NULL DEFAULT 0;

UPDATE public.daily_metrics
SET ads = COALESCE(custo_por_lead, 0) * COALESCE(leads, 0)
WHERE COALESCE(ads, 0) = 0;