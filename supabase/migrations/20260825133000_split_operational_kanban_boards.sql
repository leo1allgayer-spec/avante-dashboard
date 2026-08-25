alter table public.social_media_kanban_tasks
  add column if not exists board_type text not null default 'social_media';

alter table public.social_media_kanban_tasks
  drop constraint if exists social_media_kanban_tasks_board_type_check;

alter table public.social_media_kanban_tasks
  add constraint social_media_kanban_tasks_board_type_check
  check (board_type in ('social_media', 'sites', 'crm'));

create index if not exists social_media_kanban_tasks_board_type_idx
  on public.social_media_kanban_tasks (board_type, created_at desc);

select pg_notify('pgrst', 'reload schema');
