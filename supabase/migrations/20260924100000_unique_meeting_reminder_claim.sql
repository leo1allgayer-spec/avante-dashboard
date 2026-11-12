create table if not exists public.meeting_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null,
  participant_name text not null,
  phone text not null,
  status text not null default 'processing',
  created_at timestamptz not null default now()
);

delete from public.meeting_reminder_logs a
using public.meeting_reminder_logs b
where a.id > b.id
  and a.meeting_id = b.meeting_id
  and a.participant_name = b.participant_name;

create unique index if not exists meeting_reminder_logs_meeting_participant_uidx
  on public.meeting_reminder_logs (meeting_id, participant_name);
