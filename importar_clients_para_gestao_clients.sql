insert into public.gestao_clients (
  user_id,
  name,
  company,
  instagram,
  manager,
  status,
  payment_status,
  monthly_budget,
  payment_date,
  commission_value,
  contract_value,
  last_balance_date,
  balance_note,
  last_report_date,
  report_day,
  last_account_update,
  start_date,
  next_charge_date,
  notes
)
select
  c.user_id,
  c.nome as name,
  '' as company,
  coalesce(c.instagram, '') as instagram,
  coalesce(c.consultor, 'Leonardo') as manager,
  case
    when lower(coalesce(c.status, 'ativo')) in ('ativo', 'active') then 'Ativo'
    when lower(coalesce(c.status, '')) in ('pausado', 'paused') then 'Pausado'
    else 'Ativo'
  end as status,
  case
    when lower(coalesce(c.enviado, '')) in ('pago', 'atrasado', 'a receber', 'permuta') then lower(c.enviado)
    else 'a receber'
  end as payment_status,
  coalesce(c.valor, 0) as monthly_budget,
  1 as payment_date,
  0 as commission_value,
  coalesce(c.valor, 0) as contract_value,
  c.ultima_atividade as last_balance_date,
  '' as balance_note,
  c.ultima_atividade as last_report_date,
  'Segunda-feira' as report_day,
  c.ultima_atividade as last_account_update,
  c.created_at::date as start_date,
  null as next_charge_date,
  '[]'::jsonb as notes
from public.clients c
where c.nome is not null
  and trim(c.nome) <> ''
  and not exists (
    select 1
    from public.gestao_clients gc
    where gc.user_id = c.user_id
      and lower(trim(gc.name)) = lower(trim(c.nome))
  );

select pg_notify('pgrst', 'reload schema');
