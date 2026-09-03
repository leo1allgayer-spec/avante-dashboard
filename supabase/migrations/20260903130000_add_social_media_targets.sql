alter table public.daily_metrics
  add column if not exists meta_social_media numeric not null default 0,
  add column if not exists super_meta_social_media numeric not null default 0,
  add column if not exists valor_social_media numeric not null default 0,
  add column if not exists super_valor_social_media numeric not null default 0;
