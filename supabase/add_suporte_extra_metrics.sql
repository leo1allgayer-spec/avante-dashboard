alter table public.daily_metrics
  add column if not exists meta_suporte_extra numeric not null default 0,
  add column if not exists super_meta_suporte_extra numeric not null default 0,
  add column if not exists valor_suporte_extra numeric not null default 0,
  add column if not exists super_valor_suporte_extra numeric not null default 0;

select pg_notify('pgrst', 'reload schema');
