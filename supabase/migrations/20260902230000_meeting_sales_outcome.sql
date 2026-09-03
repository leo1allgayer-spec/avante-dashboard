alter table public.meetings
  add column if not exists closing_status text not null default 'pending',
  add column if not exists objection text not null default '';

update public.meetings
set closing_status = 'closed'
where has_closing is true and closing_status = 'pending';

alter table public.meetings drop constraint if exists meetings_closing_status_check;
alter table public.meetings
  add constraint meetings_closing_status_check
  check (closing_status in ('pending', 'closed', 'not_closed'));

select pg_notify('pgrst', 'reload schema');