-- A página pública precisa ler somente as regras de disponibilidade. Essas
-- tabelas não contêm dados pessoais de alunos.
drop policy if exists "Public can view booking settings" on public.booking_settings;
create policy "Public can view booking settings"
  on public.booking_settings for select to anon using (true);

drop policy if exists "Public can view blocked dates" on public.course_blocked_dates;
create policy "Public can view blocked dates"
  on public.course_blocked_dates for select to anon using (true);

drop policy if exists "Public can view disabled days" on public.course_disabled_days;
create policy "Public can view disabled days"
  on public.course_disabled_days for select to anon using (true);

drop policy if exists "Public can view course slots" on public.course_slots;
create policy "Public can view course slots"
  on public.course_slots for select to anon using (true);

drop policy if exists "Public can view Meta Ads exceptions" on public.meta_ads_exceptions;
create policy "Public can view Meta Ads exceptions"
  on public.meta_ads_exceptions for select to anon using (true);

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
  v_requested_date date;
  v_shift_time time;
  v_min_advance_minutes integer := 60;
  v_clean_email text := lower(trim(p_email));
  v_clean_name text := trim(p_student_name);
  v_clean_phone text := trim(p_phone);
begin
  if p_course_name is null or length(trim(p_course_name)) < 2 then
    raise exception 'Nome do curso inválido';
  end if;

  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Data inválida';
  end if;
  v_requested_date := p_date::date;

  if p_shift = 'Manhã' then
    v_shift_time := time '08:30';
  elsif p_shift = 'Tarde' then
    v_shift_time := time '14:00';
  else
    raise exception 'Turno inválido';
  end if;

  if length(v_clean_name) < 2 then raise exception 'Nome inválido'; end if;
  if v_clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido'; end if;
  if length(v_clean_phone) < 10 then raise exception 'Telefone inválido'; end if;

  select coalesce(min_advance_minutes, 60)
    into v_min_advance_minutes
  from public.booking_settings
  order by updated_at desc nulls last
  limit 1;

  if (v_requested_date + v_shift_time) < (now() at time zone 'America/Sao_Paulo') + make_interval(mins => v_min_advance_minutes) then
    raise exception 'Este horário não respeita a antecedência mínima';
  end if;

  if exists (
    select 1 from public.course_disabled_days
    where course_name = p_course_name
      and day_of_week = extract(dow from v_requested_date)::integer
      and (shift is null or shift in (p_shift, to_char(v_shift_time, 'HH24:MI')))
  ) then
    raise exception 'Este dia ou turno está desativado';
  end if;

  if exists (
    select 1 from public.course_blocked_dates
    where date = v_requested_date
      and (course_name is null or course_name = p_course_name)
      and (shift is null or shift in (p_shift, to_char(v_shift_time, 'HH24:MI')))
  ) then
    raise exception 'Esta data ou turno está bloqueado';
  end if;

  if p_course_name = 'Curso Meta Ads' then
    v_sibling_course := 'Curso Meta Ads Avançado';
  elsif p_course_name = 'Curso Meta Ads Avançado' then
    v_sibling_course := 'Curso Meta Ads';
  end if;

  if v_sibling_course is not null then
    select exists (
      select 1 from public.meta_ads_exceptions
      where date = v_requested_date and (shift is null or shift = p_shift)
    ) into v_has_exception;

    if not v_has_exception and (
      exists (
        select 1 from public.course_bookings
        where course_name = v_sibling_course and date = v_requested_date and time = p_shift
          and status = 'confirmed' and coalesce(course_status, '') <> 'cancelado'
      ) or exists (
        select 1 from public.course_slots
        where course_name = v_sibling_course and date = v_requested_date and time = p_shift
      )
    ) then
      raise exception 'Este turno já está reservado para %. Escolha outro horário.', v_sibling_course;
    end if;
  end if;

  select id into v_slot_id from public.course_slots
  where course_name = p_course_name and date = v_requested_date and time = p_shift
  limit 1 for update;

  if v_slot_id is null then
    insert into public.course_slots (course_name, date, time, max_students)
    values (p_course_name, v_requested_date, p_shift, 5)
    returning id into v_slot_id;
  end if;

  select count(*) into v_booking_count from public.course_bookings
  where slot_id = v_slot_id and status = 'confirmed' and coalesce(course_status, '') <> 'cancelado';
  if v_booking_count >= 5 then raise exception 'Turno lotado'; end if;

  insert into public.course_bookings (
    id, slot_id, course_name, student_name, email, phone, instagram,
    certificate_name, date, time, status
  ) values (
    v_booking_id, v_slot_id, p_course_name, v_clean_name, v_clean_email,
    v_clean_phone, coalesce(trim(p_instagram), ''),
    coalesce(nullif(trim(p_certificate_name), ''), v_clean_name),
    v_requested_date, p_shift, 'confirmed'
  );

  return jsonb_build_object('booking_id', v_booking_id);
exception
  when unique_violation then raise exception 'Você já está agendado neste horário';
end;
$$;

grant execute on function public.create_public_course_booking(text, text, text, text, text, text, text, text)
  to anon, authenticated;
