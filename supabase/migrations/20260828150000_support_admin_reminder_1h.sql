alter table public.support_notification_jobs
  drop constraint if exists support_notification_jobs_message_type_check;

alter table public.support_notification_jobs
  add constraint support_notification_jobs_message_type_check
  check (message_type in ('student_confirmation', 'admin_notice', 'student_reminder_1h', 'admin_reminder_1h'));

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
      (new.id, 'student_reminder_1h', v_support_at - interval '1 hour'),
      (new.id, 'admin_reminder_1h', v_support_at - interval '1 hour')
    on conflict (booking_id, message_type) do nothing;
  elsif new.status = 'cancelado' and old.status is distinct from new.status then
    update public.support_notification_jobs
      set status = 'cancelled'
    where booking_id = new.id and status in ('pending', 'processing');
  elsif old.booking_date is distinct from new.booking_date or old.start_time is distinct from new.start_time then
    update public.support_notification_jobs
      set scheduled_for = v_support_at - interval '1 hour', status = 'pending', attempts = 0, last_error = null
    where booking_id = new.id
      and message_type in ('student_reminder_1h', 'admin_reminder_1h')
      and status <> 'sent';
  end if;
  return new;
end;
$$;

insert into public.support_notification_jobs (booking_id, message_type, scheduled_for)
select
  booking.id,
  'admin_reminder_1h',
  ((booking.booking_date + booking.start_time) at time zone 'America/Sao_Paulo') - interval '1 hour'
from public.support_bookings booking
where booking.status = 'agendado'
  and ((booking.booking_date + booking.start_time) at time zone 'America/Sao_Paulo') > now()
on conflict (booking_id, message_type) do nothing;

notify pgrst, 'reload schema';