create table if not exists public.agenda_blocks (
  id uuid primary key default gen_random_uuid(),
  agenda_category text not null default 'reunioes'
    check (agenda_category in ('reunioes', 'captacao', 'social_media')),
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  all_day boolean not null default true,
  responsible text not null,
  reason text not null default '',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (all_day or (start_time is not null and end_time is not null))
);

create index if not exists agenda_blocks_period_idx
  on public.agenda_blocks (agenda_category, start_date, end_date);

alter table public.agenda_blocks enable row level security;

create policy "Authenticated agenda blocks can read"
on public.agenda_blocks for select to authenticated using (true);

create policy "Authenticated agenda blocks can insert"
on public.agenda_blocks for insert to authenticated with check (auth.uid() = user_id);

create policy "Owners can update agenda blocks"
on public.agenda_blocks for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Owners can delete agenda blocks"
on public.agenda_blocks for delete to authenticated using (auth.uid() = user_id);

alter publication supabase_realtime add table public.agenda_blocks;
