begin;
alter table public.tasks add column completion_version integer not null default 0;

create function public.track_task_completion() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='INSERT' then
  new.completion_version:=0;
  -- A new demand is not a completed delivery.
  if new.status='Concluída' then new.completed_at:=now(); end if;
 elsif new.status='Concluída' and old.status is distinct from 'Concluída' then
  new.completion_version:=old.completion_version+1;
  new.completed_at:=now();
 elsif new.status is distinct from 'Concluída' then
  new.completion_version:=old.completion_version;
  new.completed_at:=null;
 else
  new.completion_version:=old.completion_version;
  new.completed_at:=old.completed_at;
 end if;
 return new;
end $$;
create trigger track_task_completion before insert or update on public.tasks for each row execute function public.track_task_completion();

create table public.task_completion_notifications(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete cascade,
 requester_id uuid not null references auth.users(id),
 completion_version integer not null,
 status text not null default 'pending' check(status in ('pending','processing','sent','error')),
 error_message text,created_at timestamptz not null default now(),sent_at timestamptz,
 unique(task_id,completion_version)
);
alter table public.task_completion_notifications enable row level security;
grant select on public.task_completion_notifications to authenticated;
create policy task_completion_notices_read on public.task_completion_notifications for select to authenticated using(public.can_access_task(task_id));
create function public.queue_task_completion() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status='Concluída' and old.status is distinct from 'Concluída' then
  insert into public.task_completion_notifications(task_id,requester_id,completion_version) values(new.id,new.user_id,new.completion_version) on conflict do nothing;
 end if;
 return new;
end $$;
create trigger queue_task_completion after update on public.tasks for each row execute function public.queue_task_completion();
select pg_notify('pgrst','reload schema');
commit;
