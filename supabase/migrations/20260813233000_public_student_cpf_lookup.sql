create or replace function public.lookup_student_registration_by_cpf(p_cpf text, p_whatsapp_last4 text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_last4 text := regexp_replace(coalesce(p_whatsapp_last4, ''), '\D', '', 'g');
  v_student public.alunos_futuros%rowtype;
  v_survey public.survey_responses%rowtype;
  v_course text;
begin
  if length(v_cpf) <> 11 or length(v_last4) <> 4 then return null; end if;

  select * into v_student from public.alunos_futuros
  where cpf_limpo = v_cpf limit 1;

  select * into v_survey from public.survey_responses
  where regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = v_cpf
  order by created_at desc limit 1;

  if v_student.id is null and v_survey.id is null then return null; end if;

  if right(regexp_replace(coalesce(v_student.telefone, v_survey.whatsapp, ''), '\D', '', 'g'), 4) <> v_last4 then
    return null;
  end if;

  if v_student.itens is not null and jsonb_array_length(v_student.itens) > 0 then
    v_course := v_student.itens->-1->>'nome';
  else
    v_course := v_student.curso;
  end if;

  v_course := case v_course
    when 'Curso Meta Ads' then 'Curso de Meta Ads'
    when 'Curso Google Ads' then 'Curso de Google Ads'
    when 'Curso Social Media' then 'Curso de Social Media'
    when 'Curso Inteligência Artificial' then 'Curso de Inteligência Artificial'
    when 'Curso Canva' then 'Curso Canva para Empreendedores'
    when 'Curso Captação e Edição de Vídeo' then 'Curso de Edição e Captação de Vídeos'
    else coalesce(v_course, v_survey.curso_realizado)
  end;

  return jsonb_build_object(
    'nome', coalesce(v_student.nome, v_survey.nome),
    'whatsapp', coalesce(v_student.telefone, v_survey.whatsapp),
    'cep', v_survey.cep,
    'cidade', v_survey.cidade,
    'email', v_survey.email,
    'instagram', v_survey.instagram,
    'endereco', v_survey.endereco,
    'curso_realizado', coalesce(v_course, v_survey.curso_realizado)
  );
end;
$$;

revoke all on function public.lookup_student_registration_by_cpf(text, text) from public;
grant execute on function public.lookup_student_registration_by_cpf(text, text) to anon, authenticated;
select pg_notify('pgrst', 'reload schema');
