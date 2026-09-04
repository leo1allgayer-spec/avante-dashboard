alter table public.meetings replica identity full;

create table if not exists public.meeting_monthly_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  scheduling_goal integer not null default 0 check (scheduling_goal >= 0),
  cost_per_scheduling numeric not null default 0 check (cost_per_scheduling >= 0),
  meetings_scheduled integer not null default 0 check (meetings_scheduled >= 0),
  meetings_held integer not null default 0 check (meetings_held >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.meeting_monthly_metrics enable row level security;

drop policy if exists "Authenticated users manage meeting metrics" on public.meeting_monthly_metrics;
create policy "Authenticated users manage meeting metrics"
on public.meeting_monthly_metrics for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);