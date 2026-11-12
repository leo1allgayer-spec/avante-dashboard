-- O CPF identifica a pessoa; o item identifica qual curso daquele aluno recebeu o formulário.
alter table public.survey_responses
  add column if not exists aluno_futuro_item text;

create or replace function public.student_course_key(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(translate(lower(coalesce(p_value, '')), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc'), '\mtrafego\s+pago\M', ' ', 'g'),
        '\mcurso\M', ' ', 'g'
      ),
      '\mde\M', ' ', 'g'
    ),
    '[^a-z0-9]+', ' ', 'g'
  ));
$$;

create or replace function public.link_survey_to_future_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_future_id uuid;
  v_item_key text;
  v_cpf text := regexp_replace(coalesce(new.cpf, ''), '\D', '', 'g');
  v_course_key text := public.student_course_key(new.curso_realizado);
begin
  new.aluno_futuro_id := null;
  new.aluno_futuro_item := null;
  if v_cpf = '' or v_course_key = '' then return new; end if;

  select student.id, lower(trim(item->>'nome'))
  into v_future_id, v_item_key
  from public.alunos_futuros student
  cross join lateral jsonb_array_elements(coalesce(student.itens, '[]'::jsonb)) item
  where student.cpf_limpo = v_cpf
    and public.student_course_key(item->>'nome') = v_course_key
  order by student.updated_at desc
  limit 1;

  if v_future_id is null then
    select student.id, lower(trim(student.curso))
    into v_future_id, v_item_key
    from public.alunos_futuros student
    where student.cpf_limpo = v_cpf
      and public.student_course_key(student.curso) = v_course_key
    order by student.updated_at desc
    limit 1;
  end if;

  new.aluno_futuro_id := v_future_id;
  new.aluno_futuro_item := v_item_key;
  return new;
end;
$$;

drop trigger if exists survey_responses_link_future_student on public.survey_responses;
create trigger survey_responses_link_future_student
before insert or update of cpf, curso_realizado on public.survey_responses
for each row execute function public.link_survey_to_future_student();

update public.survey_responses set cpf = cpf
where cpf is not null and curso_realizado is not null;

select pg_notify('pgrst', 'reload schema');
