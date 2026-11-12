begin;
alter table public.alunos_futuros add column if not exists support_groups jsonb not null default '{}'::jsonb;

create or replace function public.set_future_student_support_group(p_student_id uuid,p_course text,p_created boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare student public.alunos_futuros; course_key text := public.student_course_key(p_course);
begin
 if auth.uid() is null or course_key='' or p_created is null then raise exception 'Dados inválidos'; end if;
 select * into student from public.alunos_futuros where id=p_student_id for update;
 if not found then raise exception 'Aluno não encontrado ou sem permissão'; end if;
 update public.alunos_futuros set support_groups=jsonb_set(support_groups,array[course_key],to_jsonb(p_created),true) where id=p_student_id;
 if not found then raise exception 'Sem permissão para atualizar o grupo'; end if;
 update public.survey_responses set support_group_created=p_created
 where public.student_course_key(curso_realizado)=course_key and
 (aluno_futuro_id=p_student_id or (length(regexp_replace(coalesce(student.cpf,''),'\D','','g'))=11 and regexp_replace(coalesce(cpf,''),'\D','','g')=regexp_replace(student.cpf,'\D','','g')));
end $$;
revoke all on function public.set_future_student_support_group(uuid,text,boolean) from public,anon;
grant execute on function public.set_future_student_support_group(uuid,text,boolean) to authenticated;

create or replace function public.sync_survey_support_group() returns trigger
language plpgsql security definer set search_path='' as $$
declare student_id uuid := new.aluno_futuro_id; stored jsonb; course_key text := public.student_course_key(new.curso_realizado);
begin
 if course_key='' then return new; end if;
 if student_id is null and length(regexp_replace(coalesce(new.cpf,''),'\D','','g'))=11 then
  select case when count(*)=1 then (array_agg(id))[1] end into student_id from public.alunos_futuros where regexp_replace(coalesce(cpf,''),'\D','','g')=regexp_replace(new.cpf,'\D','','g');
 end if;
 if student_id is null then return new; end if;
 if tg_when='BEFORE' then
  select support_groups->course_key into stored from public.alunos_futuros where id=student_id;
  if stored is not null then new.support_group_created := (stored #>> '{}')::boolean; end if;
 else
  update public.alunos_futuros set support_groups=jsonb_set(support_groups,array[course_key],to_jsonb(new.support_group_created),true) where id=student_id;
 end if;
 return new;
end $$;
create trigger zz_survey_inherit_support_group before insert on public.survey_responses for each row execute function public.sync_survey_support_group();
create trigger survey_save_support_group after insert or update of support_group_created on public.survey_responses for each row execute function public.sync_survey_support_group();
-- Preserve existing checked groups when bringing the shared control online.
update public.survey_responses set support_group_created=true where support_group_created=true;
select pg_notify('pgrst','reload schema');
commit;
