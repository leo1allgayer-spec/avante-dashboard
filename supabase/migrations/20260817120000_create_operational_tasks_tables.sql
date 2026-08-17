create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_task_goal integer not null default 5,
  weekly_task_goal integer not null default 25,
  max_task_minutes integer not null default 120,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  assignee_id uuid references public.team_members(id) on delete set null,
  due_date text not null default '',
  priority text not null default 'Média',
  status text not null default 'Pendente',
  is_daily boolean not null default false,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  user_id uuid not null references auth.users(id) on delete cascade
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date text not null,
  time text not null default '',
  participants text[] not null default '{}',
  description text not null default '',
  status text not null default 'pending',
  outcome text,
  origin text not null default '',
  modality text not null default 'presencial',
  has_closing boolean not null default false,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.meetings enable row level security;

drop policy if exists "Authenticated team members can read" on public.team_members;
drop policy if exists "Authenticated team members can insert" on public.team_members;
drop policy if exists "Authenticated team members can update" on public.team_members;
drop policy if exists "Authenticated team members can delete" on public.team_members;
create policy "Authenticated team members can read" on public.team_members for select to authenticated using (auth.uid() = user_id);
create policy "Authenticated team members can insert" on public.team_members for insert to authenticated with check (auth.uid() = user_id);
create policy "Authenticated team members can update" on public.team_members for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Authenticated team members can delete" on public.team_members for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Authenticated tasks can read" on public.tasks;
drop policy if exists "Authenticated tasks can insert" on public.tasks;
drop policy if exists "Authenticated tasks can update" on public.tasks;
drop policy if exists "Authenticated tasks can delete" on public.tasks;
create policy "Authenticated tasks can read" on public.tasks for select to authenticated using (auth.uid() = user_id);
create policy "Authenticated tasks can insert" on public.tasks for insert to authenticated with check (auth.uid() = user_id);
create policy "Authenticated tasks can update" on public.tasks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Authenticated tasks can delete" on public.tasks for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Authenticated meetings can read" on public.meetings;
drop policy if exists "Authenticated meetings can insert" on public.meetings;
drop policy if exists "Authenticated meetings can update" on public.meetings;
drop policy if exists "Authenticated meetings can delete" on public.meetings;
create policy "Authenticated meetings can read" on public.meetings for select to authenticated using (auth.uid() = user_id);
create policy "Authenticated meetings can insert" on public.meetings for insert to authenticated with check (auth.uid() = user_id);
create policy "Authenticated meetings can update" on public.meetings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Authenticated meetings can delete" on public.meetings for delete to authenticated using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_members'
  ) then alter publication supabase_realtime add table public.team_members; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then alter publication supabase_realtime add table public.tasks; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meetings'
  ) then alter publication supabase_realtime add table public.meetings; end if;
end $$;

select pg_notify('pgrst', 'reload schema');
