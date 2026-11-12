alter table public.editorial_day_notes drop constraint editorial_day_notes_category_check;
alter table public.editorial_day_notes add constraint editorial_day_notes_category_check
  check (length(trim(category)) between 1 and 100);
