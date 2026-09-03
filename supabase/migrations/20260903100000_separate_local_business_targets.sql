alter table public.daily_metrics
  add column if not exists meta_captacao_edicao numeric not null default 0,
  add column if not exists super_meta_captacao_edicao numeric not null default 0,
  add column if not exists valor_captacao_edicao numeric not null default 0,
  add column if not exists super_valor_captacao_edicao numeric not null default 0;

-- Os campos *_negocio_local eram exibidos como Captação/Edição. Preserva os
-- valores históricos nos novos campos antes de reutilizá-los para Negócio Local.
update public.daily_metrics
set
  meta_captacao_edicao = meta_negocio_local,
  super_meta_captacao_edicao = super_meta_negocio_local,
  valor_captacao_edicao = valor_negocio_local,
  super_valor_captacao_edicao = super_valor_negocio_local,
  meta_negocio_local = 0,
  super_meta_negocio_local = 0,
  valor_negocio_local = 0,
  super_valor_negocio_local = 0
where coalesce(meta_captacao_edicao, 0) = 0
  and coalesce(super_meta_captacao_edicao, 0) = 0
  and coalesce(valor_captacao_edicao, 0) = 0
  and coalesce(super_valor_captacao_edicao, 0) = 0;

select pg_notify('pgrst', 'reload schema');