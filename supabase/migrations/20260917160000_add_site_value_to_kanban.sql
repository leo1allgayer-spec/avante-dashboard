alter table public.social_media_kanban_tasks
  add column if not exists site_value numeric(12,2) not null default 0;
