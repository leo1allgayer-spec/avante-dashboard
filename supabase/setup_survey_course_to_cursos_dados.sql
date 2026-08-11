alter table public.survey_responses
  add column if not exists curso_realizado text;

alter table public.cursos_dados
  add column if not exists survey_response_id uuid references public.survey_responses(id) on delete set null;

alter table public.cursos_dados
  alter column user_id drop not null;

create unique index if not exists cursos_dados_survey_response_id_key
  on public.cursos_dados (survey_response_id)
  where survey_response_id is not null;

create or replace function public.get_course_commission(p_course_name text, p_course_date date)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_google_count integer := 0;
begin
  if p_course_name ilike '%google%' then
    select count(*)
    into v_google_count
    from public.cursos_dados
    where data = p_course_date
      and tipo_curso ilike '%google%';

    if v_google_count >= 1 then
      update public.cursos_dados
      set comissao_extra = 125,
          updated_at = now()
      where data = p_course_date
        and tipo_curso ilike '%google%'
        and comissao_extra <> 125;

      return 125;
    end if;

    return 150;
  end if;

  return 100;
end;
$$;

create or replace function public.create_curso_dado_from_survey()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_date date;
  v_course_name text;
begin
  v_course_name := nullif(trim(new.curso_realizado), '');

  if v_course_name is null then
    return new;
  end if;

  v_course_date := coalesce(new.data_curso, (new.created_at at time zone 'America/Sao_Paulo')::date);

  insert into public.cursos_dados (
    user_id,
    data,
    instrutor,
    tipo_curso,
    nome_aluno,
    comissao_extra,
    survey_response_id
  )
  values (
    null,
    v_course_date,
    'Leonardo',
    v_course_name,
    new.nome,
    public.get_course_commission(v_course_name, v_course_date),
    new.id
  )
  on conflict (survey_response_id) where survey_response_id is not null do update
  set
    data = excluded.data,
    tipo_curso = excluded.tipo_curso,
    nome_aluno = excluded.nome_aluno,
    comissao_extra = excluded.comissao_extra,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists survey_responses_create_curso_dado on public.survey_responses;

create trigger survey_responses_create_curso_dado
after insert or update of curso_realizado, data_curso, nome
on public.survey_responses
for each row
execute function public.create_curso_dado_from_survey();

select pg_notify('pgrst', 'reload schema');
