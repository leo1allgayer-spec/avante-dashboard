begin;
-- A survey stores its submission date; it can differ from the scheduled lesson.
-- Match an exact date first. A different date is accepted only for one unique
-- booking of the same course and a matching email/phone, including completed
-- and future bookings when checking ambiguity. Never infer attendance by age.
create or replace function public.survey_booking_candidate(p_survey_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare s public.survey_responses%rowtype; candidates uuid[]; exact_ids uuid[]; today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
 select * into s from public.survey_responses where id=p_survey_id;
 if s.id is null or s.data_curso is null or s.data_curso>today or public.student_course_key(s.curso_realizado)='' then return null; end if;
 select array_agg(b.id),array_agg(b.id) filter(where b.date=s.data_curso) into candidates,exact_ids
 from public.course_bookings b
 where coalesce(b.status,'')<>'cancelled' and coalesce(b.course_status,'')<>'cancelado'
 and public.student_course_key(b.course_name)=public.student_course_key(s.curso_realizado)
 and ((nullif(lower(trim(s.email)),'') is not null and lower(trim(b.email))=lower(trim(s.email)))
  or (length(regexp_replace(coalesce(s.whatsapp,''),'\D','','g'))>=10
   and right(regexp_replace(s.whatsapp,'\D','','g'),11)=right(regexp_replace(coalesce(b.phone,''),'\D','','g'),11)));
 if cardinality(exact_ids)=1 then return exact_ids[1]; end if;
 if cardinality(exact_ids)>1 then return null; end if;
 if cardinality(candidates)=1 and exists(select 1 from public.course_bookings where id=candidates[1] and date<=today) then return candidates[1]; end if;
 return null;
end $$;
revoke all on function public.survey_booking_candidate(uuid) from public,anon,authenticated;
grant execute on function public.survey_booking_candidate(uuid) to service_role;

create or replace function public.complete_booking_for_survey(p_survey_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare booking_id uuid;
begin
 booking_id:=public.survey_booking_candidate(p_survey_id);
 if booking_id is null then return false; end if;
 update public.course_bookings set course_status='concluído',updated_at=now()
 where id=booking_id and coalesce(status,'')<>'cancelled' and coalesce(course_status,'') not in ('cancelado','concluído','concluido');
 return true;
end $$;

create or replace function public.complete_booking_from_survey()
returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.complete_booking_for_survey(new.id); return new; end $$;
drop trigger if exists survey_responses_complete_booking on public.survey_responses;
create trigger survey_responses_complete_booking after insert or update of nome,email,whatsapp,data_curso,curso_realizado
on public.survey_responses for each row execute function public.complete_booking_from_survey();
notify pgrst,'reload schema';
commit;
