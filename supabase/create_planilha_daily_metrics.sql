create table if not exists public.planilha_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  ads numeric not null default 0,
  leads integer not null default 0,
  lead_mql integer not null default 0,
  custo_por_lead numeric not null default 0,
  custo_por_lead_mql numeric not null default 0,
  curso_marcado integer not null default 0,
  curso_feito integer not null default 0,
  faturamento_marcado numeric not null default 0,
  faturamento_dia numeric not null default 0,
  roas numeric not null default 0,
  cac numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.planilha_daily_metrics enable row level security;

drop policy if exists "Authenticated can manage planilha metrics" on public.planilha_daily_metrics;
create policy "Authenticated can manage planilha metrics"
  on public.planilha_daily_metrics
  for all
  to authenticated
  using (true)
  with check (true);

select pg_notify('pgrst', 'reload schema');
