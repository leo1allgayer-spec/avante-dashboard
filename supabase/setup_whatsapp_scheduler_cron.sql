create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.unschedule('whatsapp-scheduler-every-5-minutes')
where exists (
  select 1
  from cron.job
  where jobname = 'whatsapp-scheduler-every-5-minutes'
);

select cron.schedule(
  'whatsapp-scheduler-every-5-minutes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://ohhgmoivhgkdxakrrutg.supabase.co/functions/v1/whatsapp-scheduler',
    headers := '{"Content-Type":"application/json","x-cron-secret":"TROQUE_PELO_MESMO_VALOR_DO_WHATSAPP_SCHEDULER_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
