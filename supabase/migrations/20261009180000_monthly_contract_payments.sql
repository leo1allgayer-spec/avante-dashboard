-- Monthly payment tracking stays inside the existing private contract configuration.
create or replace function public.refresh_client_monthly_payments()
returns void language sql security definer set search_path=public,pg_temp as $$
  update public.gestao_clients g set payment_status='a receber'
  where payment_status='pago' and exists (
    select 1 from jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n
    where n->>'id'='__contract_config__'
      and coalesce((n->>'text')::jsonb->>'settled','false') <> 'true'
      and (n->>'text')::jsonb->>'paidMonth' < to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM')
  );
$$;
revoke all on function public.refresh_client_monthly_payments() from public,anon,authenticated;
-- Existing paid contracts are paid for the current month, not forever.
update public.gestao_clients g set notes = (
  select jsonb_agg(case when n->>'id'='__contract_config__' then
    jsonb_set(n,'{text}',to_jsonb(((n->>'text')::jsonb || jsonb_build_object('paidMonth',to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM')))::text)) else n end)
  from jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n
) where payment_status='pago' and exists(select 1 from jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n where n->>'id'='__contract_config__' and not ((n->>'text')::jsonb ? 'paidMonth'));
update public.gestao_clients g set notes=coalesce(notes,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('id','__contract_config__','date','','text',jsonb_build_object('type','MRR','months',1,'paidMonth',to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM'))::text))
where payment_status='pago' and not exists(select 1 from jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n where n->>'id'='__contract_config__');
select cron.schedule('client-monthly-payment-reset','0 3 * * *','select public.refresh_client_monthly_payments()');
select pg_notify('pgrst','reload schema');