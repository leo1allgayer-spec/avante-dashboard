
ALTER TABLE public.daily_metrics
  ADD COLUMN IF NOT EXISTS valor_cursos numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_site numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_negocio_local numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_crm numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_upsell numeric DEFAULT 0;
