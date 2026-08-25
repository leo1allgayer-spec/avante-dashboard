create table if not exists public.social_media_kanban_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client text not null default '',
  description text not null default '',
  owner text not null check (owner in ('Ana', 'Luana', 'Andrei')),
  priority text not null default 'Média' check (priority in ('Alta', 'Média', 'Baixa')),
  status text not null default 'Solicitado' check (status in ('Solicitado', 'Em produção', 'Aguardando aprovação', 'Concluído')),
  due_date date,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_media_kanban_tasks enable row level security;

drop policy if exists "owners read social media kanban" on public.social_media_kanban_tasks;
drop policy if exists "owners create social media kanban" on public.social_media_kanban_tasks;
drop policy if exists "owners update social media kanban" on public.social_media_kanban_tasks;
drop policy if exists "owners delete social media kanban" on public.social_media_kanban_tasks;
create policy "owners read social media kanban" on public.social_media_kanban_tasks
for select to authenticated using (created_by = auth.uid());
create policy "owners create social media kanban" on public.social_media_kanban_tasks
for insert to authenticated with check (created_by = auth.uid());
create policy "owners update social media kanban" on public.social_media_kanban_tasks
for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "owners delete social media kanban" on public.social_media_kanban_tasks
for delete to authenticated using (created_by = auth.uid());

create or replace function public.touch_social_media_kanban_task()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_social_media_kanban_task on public.social_media_kanban_tasks;
create trigger touch_social_media_kanban_task before update on public.social_media_kanban_tasks
for each row execute function public.touch_social_media_kanban_task();

select pg_notify('pgrst', 'reload schema');
