create table public.editorial_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  client_id uuid references public.gestao_clients(id) on delete restrict,
  client_name text not null default '',
  source_meeting_id uuid unique references public.meetings(id) on delete cascade,
  section text not null default 'general' check (section in ('general','ads')),
  title text not null check (length(trim(title)) > 0),
  content_type text not null default 'Vídeo/Reels' check (content_type in ('Vídeo/Reels','Card','Carrossel','Foto','Story','Outro')),
  publication_date date not null,
  url text not null default '' check (url = '' or url ~* '^https?://'),
  notes text not null default '',
  captured boolean not null default false,
  edited boolean not null default false,
  approval text not null default 'pending' check (approval in ('pending','approved','changes')),
  approval_notes text not null default '',
  published boolean not null default false,
  creative_count integer not null default 0 check (creative_count >= 0),
  received boolean not null default false,
  configured boolean not null default false,
  created_at timestamptz not null default now(),
  check (source_meeting_id is null or section = 'general')
);
create index editorial_entries_date_client on public.editorial_entries(publication_date, client_id);
alter table public.editorial_entries enable row level security;
-- Same access model as the operational Kanban: shared reading, author writes.
create policy "Editorial read" on public.editorial_entries for select to authenticated using (true);
create policy "Editorial create" on public.editorial_entries for insert to authenticated with check (user_id = auth.uid());
create policy "Editorial edit" on public.editorial_entries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Editorial delete" on public.editorial_entries for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.editorial_entries to authenticated;
