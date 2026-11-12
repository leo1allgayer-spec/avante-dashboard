create table public.editorial_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  client_id uuid unique references public.gestao_clients(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);
create unique index editorial_folder_name on public.editorial_folders(lower(trim(name))) where client_id is null;
alter table public.editorial_entries add column folder_id uuid references public.editorial_folders(id) on delete restrict;
-- Preserve existing independent editorial content inside its client's folder.
insert into public.editorial_folders(user_id, client_id, name)
select distinct on (client_id) user_id, client_id, coalesce(nullif(trim(client_name), ''), 'Cliente')
from public.editorial_entries where source_meeting_id is null and client_id is not null order by client_id, created_at;
insert into public.editorial_folders(user_id, name)
select distinct on (lower(trim(client_name))) user_id, coalesce(nullif(trim(client_name), ''), 'Sem cliente')
from public.editorial_entries where source_meeting_id is null and client_id is null order by lower(trim(client_name)), created_at;
update public.editorial_entries e set folder_id = f.id from public.editorial_folders f
where e.source_meeting_id is null and (e.client_id = f.client_id or (e.client_id is null and f.client_id is null and coalesce(nullif(lower(trim(e.client_name)), ''), 'sem cliente') = lower(trim(f.name))));
create table public.editorial_day_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  folder_id uuid not null references public.editorial_folders(id) on delete cascade,
  date date not null,
  body text not null default '',
  category text not null default 'livre' check (category in ('livre','institucional','informativo','comemorativo','sazonal','inspiracional')),
  unique(folder_id, date)
);
alter table public.editorial_folders enable row level security;
alter table public.editorial_day_notes enable row level security;
create policy "Editorial folders read" on public.editorial_folders for select to authenticated using (true);
create policy "Editorial folders create" on public.editorial_folders for insert to authenticated with check (user_id = auth.uid());
create policy "Editorial folders update" on public.editorial_folders for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Editorial notes read" on public.editorial_day_notes for select to authenticated using (true);
create policy "Editorial notes create" on public.editorial_day_notes for insert to authenticated with check (user_id = auth.uid());
create policy "Editorial notes update" on public.editorial_day_notes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.editorial_folders, public.editorial_day_notes to authenticated;
