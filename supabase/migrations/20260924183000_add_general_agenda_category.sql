alter table public.meetings drop constraint if exists meetings_agenda_category_check;
alter table public.meetings add constraint meetings_agenda_category_check
  check (agenda_category in ('reunioes', 'captacao', 'social_media', 'geral'));
