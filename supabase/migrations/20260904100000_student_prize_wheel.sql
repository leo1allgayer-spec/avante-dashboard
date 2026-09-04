alter table public.survey_responses
  add column if not exists roleta_girada boolean,
  add column if not exists bonus_roleta text;

alter table public.survey_responses
  drop constraint if exists survey_responses_bonus_roleta_check;

alter table public.survey_responses
  add constraint survey_responses_bonus_roleta_check
  check (
    bonus_roleta is null or bonus_roleta in (
      '2 meses de suporte',
      '20% de desconto no próximo curso',
      '50% de desconto na captação de vídeos',
      '50% de desconto na confecção de site',
      '1 mês de suporte',
      '50% de desconto no próximo curso'
    )
  );

update public.survey_responses
set bonus_roleta = null
where roleta_girada is distinct from true;