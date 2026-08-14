create or replace function public.course_instructor_name(p_course_name text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_course_name, '')) like '%google ads%' then 'Henrique'
    when lower(coalesce(p_course_name, '')) like '%social media%'
      or lower(coalesce(p_course_name, '')) like '%social midia%' then 'Luana'
    when lower(coalesce(p_course_name, '')) like '%meta ads%' then 'Leonardo'
    else 'Leonardo'
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
  if v_course_name is null then return new; end if;

  v_course_date := coalesce(new.data_curso, (new.created_at at time zone 'America/Sao_Paulo')::date);

  insert into public.cursos_dados (
    user_id, data, instrutor, tipo_curso, nome_aluno, comissao_extra, survey_response_id
  ) values (
    null, v_course_date, public.course_instructor_name(v_course_name), v_course_name,
    new.nome, public.get_course_commission(v_course_name, v_course_date), new.id
  )
  on conflict (survey_response_id) where survey_response_id is not null do update
  set data = excluded.data,
      instrutor = excluded.instrutor,
      tipo_curso = excluded.tipo_curso,
      nome_aluno = excluded.nome_aluno,
      comissao_extra = excluded.comissao_extra,
      updated_at = now();

  return new;
end;
$$;

update public.cursos_dados
set instrutor = public.course_instructor_name(tipo_curso), updated_at = now()
where lower(coalesce(tipo_curso, '')) like any (array['%google ads%', '%social media%', '%social midia%', '%meta ads%']);

select pg_notify('pgrst', 'reload schema');
