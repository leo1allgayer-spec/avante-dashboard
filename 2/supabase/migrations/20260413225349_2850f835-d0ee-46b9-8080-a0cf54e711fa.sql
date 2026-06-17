ALTER TABLE public.daily_metrics
  ADD COLUMN meta_cursos numeric DEFAULT 0,
  ADD COLUMN meta_site numeric DEFAULT 0,
  ADD COLUMN meta_negocio_local numeric DEFAULT 0,
  ADD COLUMN meta_crm numeric DEFAULT 0,
  ADD COLUMN meta_upsell numeric DEFAULT 0;