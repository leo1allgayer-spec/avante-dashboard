begin;
create or replace function public.is_social_operation_user()
returns boolean language sql stable set search_path='' as $$
 select lower(coalesce(auth.jwt()->>'email','')) in ('beatrizfsavante@gmail.com','avantegabriela51@gmail.com');
$$;
revoke all on function public.is_social_operation_user() from public, anon;
grant execute on function public.is_social_operation_user() to authenticated;
do $$
declare t record;
begin
 for t in select c.relname as tablename from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relname not in
 ('meetings','agenda_blocks','team_members','support_bookings','social_media_kanban_tasks','operational_kanban_stages','editorial_entries','editorial_folders','editorial_day_notes','deleted_crm_meetings') loop
  execute format('alter table public.%I enable row level security',t.tablename);
  execute format('drop policy if exists social_operations_restriction on public.%I',t.tablename);
  execute format('create policy social_operations_restriction on public.%I as restrictive for all to authenticated using (not public.is_social_operation_user()) with check (not public.is_social_operation_user())',t.tablename);
 end loop;
end $$;
create policy social_operations_board_restriction on public.social_media_kanban_tasks as restrictive for all to authenticated
 using (not public.is_social_operation_user() or board_type='social_media')
 with check (not public.is_social_operation_user() or board_type='social_media');
create policy social_operations_stages_restriction on public.operational_kanban_stages as restrictive for all to authenticated
 using (not public.is_social_operation_user() or board_type='social_media')
 with check (not public.is_social_operation_user() or board_type='social_media');
create or replace function public.list_social_operation_clients()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_social_operation_user() then raise exception 'Acesso negado' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'company',company)) from public.gestao_clients),'[]'::jsonb);
end $$;
revoke all on function public.list_social_operation_clients() from public, anon;
grant execute on function public.list_social_operation_clients() to authenticated;
commit;
