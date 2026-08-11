alter table public.course_bookings
  alter column course_status set default 'a confirmar';

comment on column public.course_bookings.course_status is
  'Confirmação do aluno: a confirmar até abrir o link; confirmado após confirmar presença.';
