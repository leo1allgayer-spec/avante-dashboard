create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table public.team_members
  add column if not exists phone text not null default '';

select cron.unschedule('meeting-reminder-every-5-minutes')
where exists (
  select 1 from cron.job where jobname = 'meeting-reminder-every-5-minutes'
);

select cron.schedule(
  'meeting-reminder-every-5-minutes',
  '*/5 * * * *',
  format(
    $job$
    select net.http_post(
      url := 'https://ohhgmoivhgkdxakrrutg.supabase.co/functions/v1/meeting-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', %L
      ),
      body := '{}'::jsonb
    );
    $job$,
    coalesce(
      (
        select (regexp_match(command, $regex$'x-cron-secret'\s*,\s*'([^']+)'$regex$))[1]
        from cron.job
        where jobname = 'whatsapp-scheduler-every-5-minutes'
        limit 1
      ),
      ''
    )
  )
);

select pg_notify('pgrst', 'reload schema');