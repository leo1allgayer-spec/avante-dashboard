insert into public.planilha_daily_metrics (
  user_id,
  date,
  ads,
  leads,
  lead_mql,
  custo_por_lead,
  custo_por_lead_mql,
  curso_marcado,
  curso_feito,
  faturamento_marcado,
  faturamento_dia,
  roas,
  cac,
  updated_at
)
select
  user_id,
  date,
  ads,
  leads,
  lead_mql,
  custo_por_lead,
  custo_por_lead_mql,
  curso_marcado,
  curso_feito,
  faturamento_marcado,
  faturamento_dia,
  roas,
  cac,
  updated_at
from public.daily_metrics
where user_id = '7aefc8ff-cc00-4704-9a07-be45791fb539'
  and date >= '2026-08-01'
  and date <= '2026-08-31'
on conflict (user_id, date) do update set
  ads = excluded.ads,
  leads = excluded.leads,
  lead_mql = excluded.lead_mql,
  custo_por_lead = excluded.custo_por_lead,
  custo_por_lead_mql = excluded.custo_por_lead_mql,
  curso_marcado = excluded.curso_marcado,
  curso_feito = excluded.curso_feito,
  faturamento_marcado = excluded.faturamento_marcado,
  faturamento_dia = excluded.faturamento_dia,
  roas = excluded.roas,
  cac = excluded.cac,
  updated_at = excluded.updated_at;
