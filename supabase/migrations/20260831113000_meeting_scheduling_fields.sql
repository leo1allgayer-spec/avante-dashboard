alter table public.meetings
  add column if not exists meeting_type text not null default 'reuniao',
  add column if not exists client_name text not null default '',
  add column if not exists duration_minutes integer not null default 60,
  add column if not exists responsible text not null default '',
  add column if not exists professional text not null default '';

update public.meetings
set client_name = title
where client_name = '';

select pg_notify('pgrst', 'reload schema');