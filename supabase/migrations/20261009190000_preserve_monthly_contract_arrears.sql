-- Preserve each unpaid billing month before resetting the current-month status.
create or replace function public.client_roll_monthly_arrears(cfg jsonb, client_status text, payment_status text, fallback_monthly numeric, current_month text)
returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare
  billing text := coalesce(cfg->>'billingMonth',current_month);
  debts jsonb := coalesce(cfg->'overduePayments','[]'::jsonb);
  amount numeric;
  receipt numeric;
  paid boolean;
begin
  while billing < current_month loop
    receipt := case when cfg->>'receivedMonth'=billing then coalesce((cfg->>'monthlyReceived')::numeric,0) else 0 end;
    paid := coalesce(cfg->>'paidMonth'=billing,false) or (cfg->>'paidMonth' is null and payment_status='pago');
    amount := greatest(coalesce((cfg->>'monthly')::numeric,fallback_monthly,0)-receipt,0);
    if client_status='Ativo' and payment_status <> 'permuta' and coalesce(cfg->>'settled','false') <> 'true' and not paid and amount > 0
      and not exists(select 1 from jsonb_array_elements(debts) d where d->>'month'=billing) then
      debts := debts || jsonb_build_array(jsonb_build_object('month',billing,'amount',amount));
    end if;
    billing := to_char(to_date(billing||'-01','YYYY-MM-DD') + interval '1 month','YYYY-MM');
  end loop;
  return cfg || jsonb_build_object('billingMonth',current_month,'overduePayments',debts);
end;
$$;
revoke all on function public.client_roll_monthly_arrears(jsonb,text,text,numeric,text) from public,anon,authenticated;

create or replace function public.refresh_client_monthly_payments()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  r record;
  cfg jsonb;
  next_cfg jsonb;
  next_notes jsonb;
  current_month text := to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM');
  next_status text;
begin
  for r in select * from public.gestao_clients for update loop
    select (n->>'text')::jsonb into cfg from jsonb_array_elements(coalesce(r.notes,'[]'::jsonb)) n where n->>'id'='__contract_config__' limit 1;
    cfg := coalesce(cfg,jsonb_build_object('type','MRR','months',1,'monthly',coalesce(r.contract_value,0)));
    next_cfg := public.client_roll_monthly_arrears(cfg,r.status,r.payment_status,r.contract_value,current_month);
    next_status := r.payment_status;
    if r.payment_status='pago' and coalesce(cfg->>'settled','false') <> 'true' and cfg->>'paidMonth' < current_month then next_status := 'a receber'; end if;
    if cfg is distinct from next_cfg or next_status is distinct from r.payment_status then
      select coalesce(jsonb_agg(n),'[]'::jsonb) into next_notes from jsonb_array_elements(coalesce(r.notes,'[]'::jsonb)) n where n->>'id' <> '__contract_config__';
      update public.gestao_clients set notes=next_notes || jsonb_build_array(jsonb_build_object('id','__contract_config__','date','','text',next_cfg::text)), payment_status=next_status where id=r.id;
    end if;
  end loop;
end;
$$;
revoke all on function public.refresh_client_monthly_payments() from public,anon,authenticated;
-- Start tracking this month without inventing debts from older records.
select public.refresh_client_monthly_payments();
select pg_notify('pgrst','reload schema');
