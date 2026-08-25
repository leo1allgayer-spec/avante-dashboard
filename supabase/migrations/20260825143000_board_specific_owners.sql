alter table public.social_media_kanban_tasks
  drop constraint if exists social_media_kanban_tasks_owner_check;

alter table public.social_media_kanban_tasks
  add constraint social_media_kanban_tasks_owner_check
  check (
    (board_type = 'social_media' and owner in ('Ana', 'Luana', 'Andrei')) or
    (board_type = 'sites' and owner = 'Leonardo') or
    (board_type = 'crm' and owner = 'Matheus')
  );

select pg_notify('pgrst', 'reload schema');
