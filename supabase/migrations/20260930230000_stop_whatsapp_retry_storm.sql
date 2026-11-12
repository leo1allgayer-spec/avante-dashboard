-- Failed/ambiguous deliveries require review, never an automatic replay.
alter table public.support_notification_jobs drop constraint if exists support_notification_jobs_status_check;
alter table public.support_notification_jobs add constraint support_notification_jobs_status_check
  check (status in ('pending', 'processing', 'sent', 'cancelled', 'error'));
alter table public.whatsapp_scheduled_messages add column if not exists attempts integer not null default 0;
alter table public.whatsapp_scheduled_messages add column if not exists last_error text;
alter table public.whatsapp_scheduled_messages drop constraint if exists whatsapp_scheduled_messages_status_check;
alter table public.whatsapp_scheduled_messages add constraint whatsapp_scheduled_messages_status_check
  check (status in ('pending', 'processing', 'sent', 'cancelled', 'error'));

update public.support_notification_jobs
set status = 'error', last_error = concat_ws(' | ', last_error, 'Reenvio automático interrompido: revisar antes de enviar novamente.')
where status in ('pending', 'processing') and attempts > 0;

update public.support_notification_jobs j set status = 'cancelled', last_error = 'Aviso expirado; não reenviar.'
from public.support_bookings b
where j.booking_id = b.id and j.status = 'pending' and (
  b.status <> 'agendado'
  or ((b.booking_date + b.start_time) at time zone 'America/Sao_Paulo') <= now()
  or (j.message_type like '%reminder%' and j.scheduled_for < now() - interval '15 minutes')
  or (j.message_type not like '%reminder%' and j.scheduled_for < now() - interval '24 hours')
);

update public.whatsapp_scheduled_messages j
set status = 'error', last_error = 'Falha anterior: reenvio automático interrompido.', updated_at = now()
where j.status = 'pending' and exists (
  select 1 from public.whatsapp_message_logs l
  where l.booking_id = j.booking_id and l.message_type = j.message_type
    and l.status = 'error' and l.created_at >= j.created_at
);

-- Also protects against an older worker still running during deployment.
create or replace function public.prevent_whatsapp_automatic_requeue()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'pending' and new.attempts > 0 then
    new.status := 'error';
    new.last_error := coalesce(new.last_error, 'Tentativa já realizada; revisar o envio manualmente.');
  end if;
  return new;
end;
$$;
drop trigger if exists prevent_support_automatic_requeue on public.support_notification_jobs;
create trigger prevent_support_automatic_requeue before insert or update on public.support_notification_jobs
for each row execute function public.prevent_whatsapp_automatic_requeue();
drop trigger if exists prevent_course_automatic_requeue on public.whatsapp_scheduled_messages;
create trigger prevent_course_automatic_requeue before insert or update on public.whatsapp_scheduled_messages
for each row execute function public.prevent_whatsapp_automatic_requeue();

create table if not exists public.whatsapp_dispatch_attempts (
  dispatch_key text primary key,
  status text not null check (status in ('processing', 'sent', 'error', 'uncertain')),
  retryable boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_dispatch_attempts enable row level security;
revoke all on public.whatsapp_dispatch_attempts from anon, authenticated;

create or replace function public.claim_whatsapp_dispatch(p_key text, p_manual_retry boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  insert into public.whatsapp_dispatch_attempts(dispatch_key, status) values (p_key, 'processing')
  on conflict do nothing;
  if found then return 'claimed'; end if;
  if p_manual_retry then
    update public.whatsapp_dispatch_attempts set status = 'processing', retryable = false, updated_at = now()
    where dispatch_key = p_key and status = 'error' and retryable
      and updated_at < now() - interval '15 minutes';
    if found then return 'claimed'; end if;
  end if;
  select status into v_status from public.whatsapp_dispatch_attempts where dispatch_key = p_key;
  return v_status;
end;
$$;
revoke all on function public.claim_whatsapp_dispatch(text, boolean) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_dispatch(text, boolean) to service_role;
notify pgrst, 'reload schema';
