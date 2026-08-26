-- Todos os usuários autenticados podem visualizar os quadros operacionais.
-- A criação, edição e exclusão continuam restritas ao autor do cartão.
drop policy if exists "owners read social media kanban" on public.social_media_kanban_tasks;
drop policy if exists "authenticated read social media kanban" on public.social_media_kanban_tasks;
create policy "authenticated read social media kanban"
on public.social_media_kanban_tasks
for select
to authenticated
using (true);

-- Relaciona uma pesquisa ao agendamento com tolerância a diferenças de
-- formatação. E-mail/telefone têm prioridade; nome é usado como alternativa
-- somente quando curso e data também coincidem.
create or replace function public.complete_booking_for_survey(p_survey_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survey public.survey_responses%rowtype;
  v_booking_id uuid;
  v_course_key text;
  v_name text;
  v_email text;
  v_phone text;
  v_date date;
begin
  select * into v_survey
  from public.survey_responses
  where id = p_survey_id;

  if v_survey.id is null then return false; end if;

  v_name := trim(regexp_replace(
    translate(lower(coalesce(v_survey.nome, '')), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc'),
    '[^a-z0-9]+', ' ', 'g'
  ));
  v_email := lower(trim(coalesce(v_survey.email, '')));
  v_phone := right(regexp_replace(coalesce(v_survey.whatsapp, ''), '\D', '', 'g'), 11);
  v_date := v_survey.data_curso;
  v_course_key := case
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc') like '%meta ads%' then 'meta ads'
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc') like '%google ads%' then 'google ads'
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc') like '%social media%' then 'social media'
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc') like '%inteligencia artificial%' then 'inteligencia artificial'
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc') like '%curso de ia%' then 'curso de ia'
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc') like '%canva%' then 'canva'
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc') like '%captacao%' then 'captacao'
    else translate(lower(trim(coalesce(v_survey.curso_realizado, ''))), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc')
  end;

  if v_course_key = '' or v_date is null then return false; end if;

  select booking.id into v_booking_id
  from public.course_bookings booking
  where booking.date = v_date
    and coalesce(booking.course_status, '') <> 'cancelado'
    and translate(lower(coalesce(booking.course_name, '')), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc')
        like '%' || v_course_key || '%'
    and (
      (v_email <> '' and lower(trim(coalesce(booking.email, ''))) = v_email)
      or (
        length(v_phone) >= 10
        and right(regexp_replace(coalesce(booking.phone, ''), '\D', '', 'g'), 11) = v_phone
      )
      or (
        v_name <> ''
        and trim(regexp_replace(
          translate(lower(coalesce(booking.student_name, '')), 'áàãâäéêëíïóôõöúüç', 'aaaaaeeeiioooouuc'),
          '[^a-z0-9]+', ' ', 'g'
        )) = v_name
      )
    )
  order by
    case
      when v_email <> '' and lower(trim(coalesce(booking.email, ''))) = v_email then 1
      when length(v_phone) >= 10 and right(regexp_replace(coalesce(booking.phone, ''), '\D', '', 'g'), 11) = v_phone then 2
      else 3
    end,
    booking.created_at desc
  limit 1;

  if v_booking_id is null then return false; end if;

  update public.course_bookings
  set course_status = 'concluído', updated_at = now()
  where id = v_booking_id
    and coalesce(course_status, '') not in ('cancelado', 'concluído');

  return true;
end;
$$;

-- Reprocessamento seguro: a função apenas atualiza agendamentos existentes e
-- pode ser executada novamente sem duplicar pesquisas ou alunos.
select public.complete_booking_for_survey(id)
from public.survey_responses
where curso_realizado is not null
  and data_curso is not null;

select pg_notify('pgrst', 'reload schema');
