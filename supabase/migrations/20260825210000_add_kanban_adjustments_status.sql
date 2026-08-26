alter table public.social_media_kanban_tasks
  drop constraint if exists social_media_kanban_tasks_status_check;

alter table public.social_media_kanban_tasks
  add constraint social_media_kanban_tasks_status_check
  check (status in ('Solicitado', 'Em produção', 'Aguardando aprovação', 'Ajustes', 'Concluído'));

select pg_notify('pgrst', 'reload schema');
