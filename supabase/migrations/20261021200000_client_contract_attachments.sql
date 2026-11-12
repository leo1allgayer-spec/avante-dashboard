begin;
create or replace function public.can_manage_client_contract_files()
returns boolean language sql stable set search_path='' as $$
 select auth.uid() is not null and lower(coalesce(auth.jwt()->>'email','')) in ('abreuconsultoriaempresarial@gmail.com','nicolaspatzlaff02@gmail.com','leonardowebster.ja@gmail.com','digitalavante3@gmail.com','lucadsilva666@gmail.com');
$$;
revoke all on function public.can_manage_client_contract_files() from public;
grant execute on function public.can_manage_client_contract_files() to authenticated;
create table public.client_contract_attachments (
 id uuid primary key default gen_random_uuid(),
 note_id uuid not null references public.client_contract_notes(id) on delete cascade,
 uploaded_by uuid not null references auth.users(id),
 file_name text not null check(length(file_name) between 1 and 255),
 file_path text not null unique,
 mime_type text not null,
 file_size bigint not null check(file_size>0 and file_size<=20971520),
 created_at timestamptz not null default now(),
 check(split_part(file_path,'/',1)=note_id::text)
);
create index client_contract_attachments_note_idx on public.client_contract_attachments(note_id,created_at desc);
alter table public.client_contract_attachments enable row level security;
revoke all on public.client_contract_attachments from anon;
grant select,insert,delete on public.client_contract_attachments to authenticated;
create policy contract_attachments_read on public.client_contract_attachments for select to authenticated using(public.can_manage_client_contract_files());
create policy contract_attachments_insert on public.client_contract_attachments for insert to authenticated with check(public.can_manage_client_contract_files() and uploaded_by=auth.uid());
create policy contract_attachments_delete on public.client_contract_attachments for delete to authenticated using(public.can_manage_client_contract_files());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('client-contracts','client-contracts',false,20971520,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;
create policy contract_files_read on storage.objects for select to authenticated
using(bucket_id='client-contracts' and public.can_manage_client_contract_files() and exists(select 1 from public.client_contract_notes n where n.id::text=(storage.foldername(name))[1]));
create policy contract_files_insert on storage.objects for insert to authenticated
with check(bucket_id='client-contracts' and public.can_manage_client_contract_files() and exists(select 1 from public.client_contract_notes n where n.id::text=(storage.foldername(name))[1]));
create policy contract_files_delete on storage.objects for delete to authenticated
using(bucket_id='client-contracts' and public.can_manage_client_contract_files() and exists(select 1 from public.client_contract_notes n where n.id::text=(storage.foldername(name))[1]));
select pg_notify('pgrst','reload schema');
commit;
