create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists public.support_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.support_bookings(id) on delete cascade,
  message_type text not null check (message_type in ('student_confirmation', 'admin_notice', 'student_reminder_1h')),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'cancelled')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id, message_type)
);

create index if not exists support_notification_jobs_due_idx
  on public.support_notification_jobs (status, scheduled_for);

alter table public.support_notification_jobs enable row level security;
drop policy if exists "Authenticated read support notification jobs" on public.support_notification_jobs;
create policy "Authenticated read support notification jobs"
  on public.support_notification_jobs for select to authenticated using (true);

create or replace function public.schedule_support_booking_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_support_at timestamptz;
begin
  v_support_at := (new.booking_date + new.start_time) at time zone 'America/Sao_Paulo';

  if tg_op = 'INSERT' then
    insert into public.support_notification_jobs (booking_id, message_type, scheduled_for)
    values
      (new.id, 'student_confirmation', now()),
      (new.id, 'admin_notice', now()),
      (new.id, 'student_reminder_1h', v_support_at - interval '1 hour')
    on conflict (booking_id, message_type) do nothing;
  elsif new.status = 'cancelado' and old.status is distinct from new.status then
    update public.support_notification_jobs
      set status = 'cancelled'
    where booking_id = new.id and status in ('pending', 'processing');
  elsif old.booking_date is distinct from new.booking_date or old.start_time is distinct from new.start_time then
    update public.support_notification_jobs
      set scheduled_for = v_support_at - interval '1 hour', status = 'pending', attempts = 0, last_error = null
    where booking_id = new.id and message_type = 'student_reminder_1h' and status <> 'sent';
  end if;
  return new;
end;
$$;

drop trigger if exists support_booking_notifications_trigger on public.support_bookings;
create trigger support_booking_notifications_trigger
after insert or update of booking_date, start_time, status on public.support_bookings
for each row execute function public.schedule_support_booking_notifications();

select cron.unschedule('support-booking-notifications')
where exists (select 1 from cron.job where jobname = 'support-booking-notifications');

select cron.schedule(
  'support-booking-notifications',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://ohhgmoivhgkdxakrrutg.supabase.co/functions/v1/support-booking-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_T1epNcaipfPHOqWVjXbErg_q2cAqt-0',
      'Authorization', 'Bearer sb_publishable_T1epNcaipfPHOqWVjXbErg_q2cAqt-0'
    ),
    body := '{"processDue":true}'::jsonb
  );
  $$
);

notify pgrst, 'reload schema';
