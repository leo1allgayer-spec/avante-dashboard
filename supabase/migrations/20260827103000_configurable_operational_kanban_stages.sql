alter table public.social_media_kanban_tasks
  drop constraint if exists social_media_kanban_tasks_status_check;

create table if not exists public.operational_kanban_stages (
  id uuid primary key default gen_random_uuid(),
  board_type text not null check (board_type in ('social_media', 'sites', 'crm', 'video_photo')),
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (board_type, name)
);

alter table public.operational_kanban_stages enable row level security;

drop policy if exists "authenticated read operational kanban stages" on public.operational_kanban_stages;
drop policy if exists "authenticated create operational kanban stages" on public.operational_kanban_stages;
drop policy if exists "authenticated update operational kanban stages" on public.operational_kanban_stages;
drop policy if exists "authenticated delete operational kanban stages" on public.operational_kanban_stages;
create policy "authenticated read operational kanban stages" on public.operational_kanban_stages for select to authenticated using (true);
create policy "authenticated create operational kanban stages" on public.operational_kanban_stages
for insert to authenticated with check (lower(auth.jwt() ->> 'email') in ('digitalavante3@gmail.com', 'nicolaspatzlaff02@gmail.com', 'lucadsilva666@gmail.com', 'leonardowebster.ja@gmail.com'));
create policy "authenticated update operational kanban stages" on public.operational_kanban_stages
for update to authenticated using (lower(auth.jwt() ->> 'email') in ('digitalavante3@gmail.com', 'nicolaspatzlaff02@gmail.com', 'lucadsilva666@gmail.com', 'leonardowebster.ja@gmail.com'))
with check (lower(auth.jwt() ->> 'email') in ('digitalavante3@gmail.com', 'nicolaspatzlaff02@gmail.com', 'lucadsilva666@gmail.com', 'leonardowebster.ja@gmail.com'));
create policy "authenticated delete operational kanban stages" on public.operational_kanban_stages
for delete to authenticated using (lower(auth.jwt() ->> 'email') in ('digitalavante3@gmail.com', 'nicolaspatzlaff02@gmail.com', 'lucadsilva666@gmail.com', 'leonardowebster.ja@gmail.com'));

insert into public.operational_kanban_stages (board_type, name, position)
select board_type, name, position
from (values
  ('social_media', 'Solicitado', 0), ('social_media', 'Em produção', 1), ('social_media', 'Aguardando aprovação', 2), ('social_media', 'Ajustes', 3), ('social_media', 'Concluído', 4),
  ('sites', 'Solicitado', 0), ('sites', 'Em produção', 1), ('sites', 'Aguardando aprovação', 2), ('sites', 'Ajustes', 3), ('sites', 'Concluído', 4),
  ('crm', 'Solicitado', 0), ('crm', 'Em produção', 1), ('crm', 'Aguardando aprovação', 2), ('crm', 'Ajustes', 3), ('crm', 'Concluído', 4),
  ('video_photo', 'Solicitado', 0), ('video_photo', 'Em produção', 1), ('video_photo', 'Aguardando aprovação', 2), ('video_photo', 'Ajustes', 3), ('video_photo', 'Concluído', 4)
) as defaults(board_type, name, position)
on conflict (board_type, name) do nothing;

create or replace function public.rename_operational_kanban_stage(p_stage_id uuid, p_new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage public.operational_kanban_stages%rowtype;
  v_name text := trim(p_new_name);
begin
  if lower(auth.jwt() ->> 'email') not in ('digitalavante3@gmail.com', 'nicolaspatzlaff02@gmail.com', 'lucadsilva666@gmail.com', 'leonardowebster.ja@gmail.com') then
    raise exception 'Apenas administradores podem renomear etapas';
  end if;
  if v_name = '' then raise exception 'Nome da etapa inválido'; end if;
  select * into v_stage from public.operational_kanban_stages where id = p_stage_id for update;
  if v_stage.id is null then raise exception 'Etapa não encontrada'; end if;
  update public.social_media_kanban_tasks
  set status = v_name
  where board_type = v_stage.board_type and status = v_stage.name;
  update public.operational_kanban_stages set name = v_name where id = p_stage_id;
end;
$$;

revoke all on function public.rename_operational_kanban_stage(uuid, text) from public, anon;
grant execute on function public.rename_operational_kanban_stage(uuid, text) to authenticated;

select pg_notify('pgrst', 'reload schema');
