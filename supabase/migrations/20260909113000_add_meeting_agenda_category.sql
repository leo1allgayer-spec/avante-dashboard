alter table public.meetings
  add column if not exists agenda_category text not null default 'reunioes';

alter table public.meetings
  drop constraint if exists meetings_agenda_category_check;

alter table public.meetings
  add constraint meetings_agenda_category_check
  check (agenda_category in ('reunioes', 'captacao', 'social_media'));

create index if not exists meetings_agenda_category_date_idx
  on public.meetings (agenda_category, date);

select pg_notify('pgrst', 'reload schema');
