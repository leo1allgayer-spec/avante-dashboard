-- Curso em Turma is limited to 15 students per session. Older slots may have
-- been created with the default capacity of five before the cohort catalog
-- migration updated the public booking RPC. Bring future cohort slots in line.
-- course_slots has no updated_at column, so this generic trigger is invalid and
-- blocks all updates to slot capacity.
drop trigger if exists update_course_slots_updated_at on public.course_slots;

update public.course_slots
set max_students = 15
where course_name = 'Curso em Turma'
  and date >= current_date
  and max_students is distinct from 15;
