begin;
create table public.task_assignee_directory(member_id uuid primary key references public.team_members(id),account_id uuid unique not null references auth.users(id),display_name text not null,phone text not null default '');
alter table public.task_assignee_directory enable row level security;
grant select on public.task_assignee_directory to authenticated;
create policy task_directory_read on public.task_assignee_directory for select to authenticated using(true);
-- Use existing members where possible; keep operational agenda member ids unchanged.
do $$ declare u record;member uuid;display text;begin
 for u in select * from auth.users where lower(email) not in ('abreuconsultoriaempresarial@gmail.com','hjasiulzwicz@gmail.com') and deleted_at is null loop
 display:=case lower(u.email) when 'beatrizfsavante@gmail.com' then 'Beatriz' when 'avantegabriela51@gmail.com' then 'Gabriela' when 'digitalavante3@gmail.com' then 'Leonardo Allgayer' when 'leonardowebster.ja@gmail.com' then 'Leonardo Webster' else coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),split_part(u.email,'@',1)) end;
 select id into member from public.team_members where lower(trim(name))=lower(trim(display)) order by (user_id=u.id) desc,created_at limit 1;
 if member is null then insert into public.team_members(name,user_id) values(display,u.id) returning id into member;end if;
 insert into public.task_assignee_directory values(member,u.id,display,case lower(u.email) when 'digitalavante3@gmail.com' then '5551999692480' when 'leonardowebster.ja@gmail.com' then '5551993512435' when 'lucadsilva666@gmail.com' then '5551995750062' when 'nicolaspatzlaff02@gmail.com' then '5551998119283' when 'beatrizfsavante@gmail.com' then '555196022287' when 'avantegabriela51@gmail.com' then '555193527677' else coalesce((select phone from public.team_members where id=member),'') end);
 end loop;end $$;
create function public.can_manage_task_team() returns boolean language sql stable security definer set search_path='' as $$select lower(coalesce(auth.jwt()->>'email','')) in ('digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com','abreuconsultoriaempresarial@gmail.com')$$;
create function public.set_task_assignee_phone(p_member uuid,p_phone text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not public.can_manage_task_team() then raise exception 'Sem permissão';end if;
 if p_phone<>'' and regexp_replace(p_phone,'\D','','g') !~ '^55[0-9]{10,11}$' then raise exception 'Use 55 + DDD + telefone';end if;
 update public.task_assignee_directory set phone=regexp_replace(p_phone,'\D','','g') where member_id=p_member;
end;$$;
revoke all on function public.set_task_assignee_phone(uuid,text) from public,anon;grant execute on function public.set_task_assignee_phone(uuid,text) to authenticated;
create function public.can_access_task(p_task uuid) returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from public.tasks t left join public.task_assignee_directory d on d.member_id=t.assignee_id where t.id=p_task and (t.user_id=auth.uid() or d.account_id=auth.uid() or public.can_manage_task_team()))$$;
revoke all on function public.can_access_task(uuid) from public,anon;grant execute on function public.can_access_task(uuid) to authenticated;
drop policy if exists social_operations_restriction on public.tasks;
create policy tasks_assignee_read on public.tasks for select to authenticated using(public.can_access_task(id));
create policy tasks_assignee_update on public.tasks for update to authenticated using(public.can_access_task(id)) with check(public.can_access_task(id));
alter table public.tasks add column assignment_version integer not null default 0;
create function public.guard_task_changes() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='UPDATE' then
  if new.user_id<>old.user_id then raise exception 'O criador da tarefa não pode ser alterado';end if;
  if auth.uid() is not null and auth.uid()<>old.user_id and not public.can_manage_task_team() and (new.title<>old.title or new.description<>old.description or new.assignee_id is distinct from old.assignee_id or new.due_date<>old.due_date or new.priority<>old.priority or new.is_daily<>old.is_daily) then raise exception 'Somente o criador ou gestor pode editar os dados desta tarefa';end if;
 end if;
 if tg_op='INSERT' or new.assignee_id is distinct from old.assignee_id then
  if new.assignee_id is not null and not exists(select 1 from public.task_assignee_directory where member_id=new.assignee_id) then raise exception 'Selecione uma pessoa com acesso ao dashboard; Abreu e Henrique não recebem tarefas';end if;
  new.assignment_version:=case when tg_op='INSERT' then 1 else old.assignment_version+1 end;
 else new.assignment_version:=old.assignment_version;end if;
 return new;end;$$;
create trigger guard_task_changes before insert or update on public.tasks for each row execute function public.guard_task_changes();
create table public.task_assignment_notifications(id uuid primary key default gen_random_uuid(),task_id uuid not null references public.tasks(id) on delete cascade,assignee_id uuid not null references public.task_assignee_directory(member_id),assignment_version integer not null,status text not null default 'pending' check(status in ('pending','processing','sent','error')),error_message text,created_at timestamptz not null default now(),sent_at timestamptz,unique(task_id,assignment_version));
alter table public.task_assignment_notifications enable row level security;
grant select on public.task_assignment_notifications to authenticated;
create policy task_notices_read on public.task_assignment_notifications for select to authenticated using(public.can_access_task(task_id));
create function public.queue_task_assignment() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.assignee_id is not null and (tg_op='INSERT' or new.assignment_version<>old.assignment_version) then insert into public.task_assignment_notifications(task_id,assignee_id,assignment_version) values(new.id,new.assignee_id,new.assignment_version) on conflict do nothing;end if;return new;end;$$;
create trigger queue_task_assignment after insert or update on public.tasks for each row execute function public.queue_task_assignment();
create table public.task_attachments(id uuid primary key default gen_random_uuid(),task_id uuid not null references public.tasks(id) on delete cascade,uploaded_by uuid not null references auth.users(id),file_name text not null check(length(file_name) between 1 and 255),storage_path text unique not null,mime_type text not null,size_bytes integer not null check(size_bytes between 1 and 20971520),created_at timestamptz not null default now(),check(split_part(storage_path,'/',1)=task_id::text));
create index task_files_task_idx on public.task_attachments(task_id);
alter table public.task_attachments enable row level security;
grant select,insert,delete on public.task_attachments to authenticated;
create policy task_files_read on public.task_attachments for select to authenticated using(public.can_access_task(task_id));
create policy task_files_insert on public.task_attachments for insert to authenticated with check(uploaded_by=auth.uid() and public.can_access_task(task_id));
create policy task_files_delete on public.task_attachments for delete to authenticated using(uploaded_by=auth.uid() and public.can_access_task(task_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('task-files','task-files',false,20971520,array['image/jpeg','image/png','image/webp','image/gif','application/pdf','video/mp4','audio/mpeg','audio/ogg','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) on conflict(id) do nothing;
create policy task_storage_read on storage.objects for select to authenticated using(bucket_id='task-files' and exists(select 1 from public.tasks t where t.id::text=split_part(name,'/',1) and public.can_access_task(t.id)));
create policy task_storage_insert on storage.objects for insert to authenticated with check(bucket_id='task-files' and exists(select 1 from public.tasks t where t.id::text=split_part(name,'/',1) and public.can_access_task(t.id)));
create policy task_storage_delete on storage.objects for delete to authenticated using(bucket_id='task-files' and owner_id=auth.uid()::text and exists(select 1 from public.tasks t where t.id::text=split_part(name,'/',1) and public.can_access_task(t.id)));
select pg_notify('pgrst','reload schema');commit;
