DO $$
DECLARE source_command text;
BEGIN
 SELECT command INTO source_command FROM cron.job WHERE jobname='whatsapp-scheduler-every-5-minutes' AND active LIMIT 1;
 IF source_command IS NULL OR source_command NOT LIKE '%x-cron-secret%' OR source_command NOT LIKE '%body := ''{}''::jsonb%' THEN RAISE EXCEPTION 'Agendador autenticado nao encontrado'; END IF;
 source_command=replace(replace(source_command,'/functions/v1/whatsapp-scheduler','/functions/v1/client-meta-ads'),'''{}''::jsonb','''{"action":"monitor_balances"}''::jsonb');
 IF source_command NOT LIKE '%timeout_milliseconds%' THEN
  source_command=replace(source_command,'''{"action":"monitor_balances"}''::jsonb','''{"action":"monitor_balances"}''::jsonb, timeout_milliseconds := 120000');
 END IF;
 PERFORM cron.schedule('meta-balance-alerts-every-15-minutes','*/15 * * * *',source_command);
END $$;
SELECT jobname,schedule,active FROM cron.job WHERE jobname='meta-balance-alerts-every-15-minutes';
