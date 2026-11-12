begin;
alter table public.agenda_blocks drop constraint if exists agenda_blocks_agenda_category_check;
alter table public.agenda_blocks add constraint agenda_blocks_agenda_category_check check(agenda_category in ('geral','reunioes','captacao','social_media'));
commit;
