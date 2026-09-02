create table if not exists public.deleted_crm_meetings (
  external_id text primary key,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id) on delete set null
);

alter table public.deleted_crm_meetings enable row level security;

drop policy if exists "Authenticated can view deleted CRM meetings" on public.deleted_crm_meetings;
create policy "Authenticated can view deleted CRM meetings"
on public.deleted_crm_meetings for select to authenticated using (true);

drop policy if exists "Authenticated can hide CRM meetings" on public.deleted_crm_meetings;
create policy "Authenticated can hide CRM meetings"
on public.deleted_crm_meetings for insert to authenticated with check (auth.uid() = deleted_by);

drop policy if exists "Authenticated can update deleted CRM meetings" on public.deleted_crm_meetings;
create policy "Authenticated can update deleted CRM meetings"
on public.deleted_crm_meetings for update to authenticated using (true) with check (auth.uid() = deleted_by);

select pg_notify('pgrst', 'reload schema');