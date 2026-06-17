ALTER TABLE public.daily_metrics
ADD COLUMN IF NOT EXISTS curso_marcado integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS curso_feito integer DEFAULT 0;