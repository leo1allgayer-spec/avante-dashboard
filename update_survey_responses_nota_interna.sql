alter table public.survey_responses
  add column if not exists nota_interna integer;

alter table public.survey_responses
  drop constraint if exists survey_responses_nota_interna_check;

alter table public.survey_responses
  add constraint survey_responses_nota_interna_check
  check (nota_interna is null or (nota_interna >= 1 and nota_interna <= 5));

select pg_notify('pgrst', 'reload schema');
