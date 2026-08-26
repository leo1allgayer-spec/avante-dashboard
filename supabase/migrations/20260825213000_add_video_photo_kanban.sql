alter table public.social_media_kanban_tasks
  drop constraint if exists social_media_kanban_tasks_board_type_check;

alter table public.social_media_kanban_tasks
  add constraint social_media_kanban_tasks_board_type_check
  check (board_type in ('social_media', 'sites', 'crm', 'video_photo'));

select pg_notify('pgrst', 'reload schema');
