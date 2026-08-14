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
  select * into v_survey from public.survey_responses where id = p_survey_id;
  if v_survey.id is null then return false; end if;

  v_name := regexp_replace(translate(lower(coalesce(v_survey.nome, '')), 'áàãâéêíóôõúç', 'aaaaeeiooouc'), '[^a-z0-9]+', ' ', 'g');
  v_email := lower(trim(coalesce(v_survey.email, '')));
  v_phone := regexp_replace(coalesce(v_survey.whatsapp, ''), '\D', '', 'g');
  v_date := coalesce(v_survey.data_curso, (v_survey.created_at at time zone 'America/Sao_Paulo')::date);
  v_course_key := case
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâéêíóôõúç', 'aaaaeeiooouc') like '%meta ads%' then 'meta ads'
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâéêíóôõúç', 'aaaaeeiooouc') like '%google ads%' then 'google ads'
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâéêíóôõúç', 'aaaaeeiooouc') like '%social media%' then 'social media'
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâéêíóôõúç', 'aaaaeeiooouc') like '%inteligencia artificial%' then 'inteligencia artificial'
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâéêíóôõúç', 'aaaaeeiooouc') like '%canva%' then 'canva'
    when translate(lower(coalesce(v_survey.curso_realizado, '')), 'áàãâéêíóôõúç', 'aaaaeeiooouc') like '%captacao%' then 'captacao'
    else translate(lower(trim(coalesce(v_survey.curso_realizado, ''))), 'áàãâéêíóôõúç', 'aaaaeeiooouc')
  end;
  if v_course_key = '' or v_date is null or v_name = '' then return false; end if;

  select booking.id into v_booking_id
  from public.course_bookings booking
  where booking.date = v_date
    and translate(lower(coalesce(booking.course_name, '')), 'áàãâéêíóôõúç', 'aaaaeeiooouc') like '%' || v_course_key || '%'
    and regexp_replace(translate(lower(coalesce(booking.student_name, '')), 'áàãâéêíóôõúç', 'aaaaeeiooouc'), '[^a-z0-9]+', ' ', 'g') = v_name
    and (
      (v_email <> '' and lower(trim(coalesce(booking.email, ''))) = v_email)
      or (length(v_phone) >= 10 and regexp_replace(coalesce(booking.phone, ''), '\D', '', 'g') = v_phone)
    )
  order by booking.created_at desc limit 1;

  if v_booking_id is null then return false; end if;
  update public.course_bookings
  set course_status = 'concluído', updated_at = now()
  where id = v_booking_id and coalesce(course_status, '') <> 'cancelado';
  return true;
end;
$$;

create or replace function public.complete_booking_from_survey()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.complete_booking_for_survey(new.id);
  return new;
end;
$$;

drop trigger if exists survey_responses_complete_booking on public.survey_responses;
create trigger survey_responses_complete_booking
after insert or update of nome, email, whatsapp, data_curso, curso_realizado
on public.survey_responses
for each row execute function public.complete_booking_from_survey();

-- Reprocessa diretamente, sem atualizar pesquisas nem disparar outros gatilhos.
select public.complete_booking_for_survey(id)
from public.survey_responses
where curso_realizado is not null and data_curso is not null;

select pg_notify('pgrst', 'reload schema');
