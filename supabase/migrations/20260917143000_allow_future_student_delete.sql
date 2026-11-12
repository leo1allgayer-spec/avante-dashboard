-- Permite remover um aluno futuro sem apagar o histórico do agendamento.
alter table public.support_bookings
  drop constraint if exists support_bookings_student_id_fkey;

alter table public.support_bookings
  add constraint support_bookings_student_id_fkey
  foreign key (student_id) references public.alunos_futuros(id) on delete set null;
