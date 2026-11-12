create table if not exists public.meeting_confirmation_settings (
  id boolean primary key default true check (id),
  started_at timestamptz not null default now()
);
insert into public.meeting_confirmation_settings(id) values(true) on conflict do nothing;
alter table public.meeting_confirmation_settings enable row level security;
create table if not exists public.meeting_confirmation_logs (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null,
  participant_name text not null,
  phone text not null,
  status text not null default 'processing',
  created_at timestamptz not null default now(),
  unique(meeting_id, participant_name)
);
alter table public.meeting_confirmation_logs enable row level security;
grant all on public.meeting_confirmation_settings, public.meeting_confirmation_logs to service_role;
