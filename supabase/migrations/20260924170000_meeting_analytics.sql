alter table public.meeting_monthly_metrics
  add column if not exists analytics jsonb not null default '{}'::jsonb;

comment on column public.meeting_monthly_metrics.analytics is
  'Configuração mensal das métricas de reuniões: investimento, leads, faltas, reagendamentos e metas.';
notify pgrst, 'reload schema';
