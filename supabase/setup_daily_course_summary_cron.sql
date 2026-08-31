create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.unschedule('daily-course-summary-18h')
where exists (
  select 1
  from cron.job
  where jobname = 'daily-course-summary-18h'
);

select cron.schedule(
  'daily-course-summary-18h',
  '0 21 * * *',
  $$
  select net.http_post(
    url := 'https://ohhgmoivhgkdxakrrutg.supabase.co/functions/v1/daily-course-summary',
    headers := jsonb_build_object(
      'Content-Type',
      'application/json',
      'x-cron-secret',
      'TROQUE_PELO_MESMO_VALOR_DO_DAILY_COURSE_SUMMARY_SECRET'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);
