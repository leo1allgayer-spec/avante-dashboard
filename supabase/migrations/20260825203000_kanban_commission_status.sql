alter table public.social_media_kanban_tasks
  add column if not exists commission_paid boolean not null default false;

select pg_notify('pgrst', 'reload schema');
