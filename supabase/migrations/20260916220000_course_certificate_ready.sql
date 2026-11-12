alter table public.course_bookings
  add column if not exists certificate_ready boolean not null default false;

alter table public.course_enrollments
  add column if not exists certificate_ready boolean not null default false;

comment on column public.course_bookings.certificate_ready is
  'Indica se o certificado deste agendamento já está pronto.';

comment on column public.course_enrollments.certificate_ready is
  'Indica se o certificado desta inscrição já está pronto.';

select pg_notify('pgrst', 'reload schema');
