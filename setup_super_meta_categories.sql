alter table public.daily_metrics
  add column if not exists super_meta_cursos numeric default 0,
  add column if not exists super_meta_site numeric default 0,
  add column if not exists super_meta_negocio_local numeric default 0,
  add column if not exists super_meta_crm numeric default 0,
  add column if not exists super_meta_upsell numeric default 0,
  add column if not exists super_valor_cursos numeric default 0,
  add column if not exists super_valor_site numeric default 0,
  add column if not exists super_valor_negocio_local numeric default 0,
  add column if not exists super_valor_crm numeric default 0,
  add column if not exists super_valor_upsell numeric default 0;

notify pgrst, 'reload schema';
