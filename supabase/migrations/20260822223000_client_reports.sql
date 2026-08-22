create table if not exists public.client_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.gestao_clients(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  report_date date not null default current_date,
  title text not null,
  description text not null default '',
  file_name text not null,
  file_path text not null unique,
  mime_type text not null default '',
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.client_reports enable row level security;
drop policy if exists "owners manage client reports" on public.client_reports;
create policy "owners manage client reports" on public.client_reports for all to authenticated
using (uploaded_by = auth.uid()) with check (uploaded_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit)
values ('client-reports', 'client-reports', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = 15728640;

drop policy if exists "owners read client report files" on storage.objects;
drop policy if exists "owners upload client report files" on storage.objects;
drop policy if exists "owners delete client report files" on storage.objects;
create policy "owners read client report files" on storage.objects for select to authenticated
using (bucket_id = 'client-reports' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners upload client report files" on storage.objects for insert to authenticated
with check (bucket_id = 'client-reports' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners delete client report files" on storage.objects for delete to authenticated
using (bucket_id = 'client-reports' and (storage.foldername(name))[1] = auth.uid()::text);

select pg_notify('pgrst', 'reload schema');
