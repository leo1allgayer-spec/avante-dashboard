begin;
-- Shared editing only; existing ownership and delete policies stay in place.
do $$
declare target text;
begin
 foreach target in array array['meetings','agenda_blocks','editorial_entries','editorial_day_notes','editorial_folders'] loop
  execute format('create policy social_operations_shared_update on public.%I for update to authenticated using (public.is_social_operation_user()) with check (public.is_social_operation_user())',target);
 end loop;
end $$;
create policy social_operations_shared_tasks_read on public.social_media_kanban_tasks for select to authenticated
 using (public.is_social_operation_user() and board_type='social_media');
create policy social_operations_shared_tasks_update on public.social_media_kanban_tasks for update to authenticated
 using (public.is_social_operation_user() and board_type='social_media') with check (public.is_social_operation_user() and board_type='social_media');
commit;
