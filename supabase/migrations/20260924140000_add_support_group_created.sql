alter table public.survey_responses
  add column if not exists support_group_created boolean not null default false;

comment on column public.survey_responses.support_group_created is
  'Indica se o grupo de suporte do aluno já foi criado.';
