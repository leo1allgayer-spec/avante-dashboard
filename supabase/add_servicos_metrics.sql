alter table public.daily_metrics
  add column if not exists meta_servicos numeric not null default 0,
  add column if not exists super_meta_servicos numeric not null default 0,
  add column if not exists valor_servicos numeric not null default 0,
  add column if not exists super_valor_servicos numeric not null default 0;

select pg_notify('pgrst', 'reload schema');
