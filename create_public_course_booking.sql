alter table public.course_bookings
  add column if not exists instagram text default '';

alter table public.course_bookings
  add column if not exists certificate_name text default '';

alter table public.course_bookings
  add column if not exists course_status text not null default 'a confirmar';

create unique index if not exists unique_booking_student_email_slot
  on public.course_bookings (slot_id, lower(email), lower(student_name));

create or replace function public.create_public_course_booking(
  p_course_name text,
  p_date text,
  p_shift text,
  p_student_name text,
  p_email text,
  p_phone text,
  p_instagram text default '',
  p_certificate_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_id uuid;
  v_booking_id uuid := gen_random_uuid();
  v_booking_count integer := 0;
  v_sibling_course text;
  v_has_exception boolean := false;
  v_sibling_count integer := 0;
  v_sibling_slot_count integer := 0;
  v_clean_email text := lower(trim(p_email));
  v_clean_name text := trim(p_student_name);
  v_clean_phone text := trim(p_phone);
begin
  if p_course_name is null or length(trim(p_course_name)) < 2 then
    raise exception 'Nome do curso invalido';
  end if;

  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Data invalida';
  end if;

  if p_shift not in ('Manhã', 'Tarde') then
    raise exception 'Turno invalido';
  end if;

  if length(v_clean_name) < 2 then
    raise exception 'Nome invalido';
  end if;

  if v_clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail invalido';
  end if;

  if length(v_clean_phone) < 10 then
    raise exception 'Telefone invalido';
  end if;

  if p_course_name = 'Curso Meta Ads' then
    v_sibling_course := 'Curso Meta Ads Avançado';
  elsif p_course_name = 'Curso Meta Ads Avançado' then
    v_sibling_course := 'Curso Meta Ads';
  end if;

  if v_sibling_course is not null then
    select exists (
      select 1
      from public.meta_ads_exceptions
      where date = p_date
        and (shift = p_shift or shift is null)
    ) into v_has_exception;

    if not v_has_exception then
      select count(*)
      into v_sibling_count
      from public.course_bookings
      where course_name = v_sibling_course
        and date = p_date
        and time = p_shift
        and status = 'confirmed'
        and coalesce(course_status, '') <> 'cancelado';

      select count(*)
      into v_sibling_slot_count
      from public.course_slots
      where course_name = v_sibling_course
        and date = p_date
        and time = p_shift;

      if v_sibling_count > 0 or v_sibling_slot_count > 0 then
        raise exception 'Este turno ja esta reservado para %. Escolha outro horario.', v_sibling_course;
      end if;
    end if;
  end if;

  select id
  into v_slot_id
  from public.course_slots
  where course_name = p_course_name
    and date = p_date
    and time = p_shift
  limit 1;

  if v_slot_id is null then
    insert into public.course_slots (course_name, date, time, max_students)
    values (p_course_name, p_date, p_shift, 5)
    returning id into v_slot_id;
  end if;

  select count(*)
  into v_booking_count
  from public.course_bookings
  where slot_id = v_slot_id
    and status = 'confirmed'
    and coalesce(course_status, '') <> 'cancelado';

  if v_booking_count >= 5 then
    raise exception 'Turno lotado';
  end if;

  insert into public.course_bookings (
    id,
    slot_id,
    course_name,
    student_name,
    email,
    phone,
    instagram,
    certificate_name,
    date,
    time,
    status
  )
  values (
    v_booking_id,
    v_slot_id,
    p_course_name,
    v_clean_name,
    v_clean_email,
    v_clean_phone,
    coalesce(trim(p_instagram), ''),
    coalesce(nullif(trim(p_certificate_name), ''), v_clean_name),
    p_date,
    p_shift,
    'confirmed'
  );

  return jsonb_build_object('booking_id', v_booking_id);
exception
  when unique_violation then
    raise exception 'Voce ja esta agendado neste horario';
end;
$$;

grant execute on function public.create_public_course_booking(text, text, text, text, text, text, text, text)
  to anon, authenticated;
