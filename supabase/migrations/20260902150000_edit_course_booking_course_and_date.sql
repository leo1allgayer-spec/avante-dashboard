create or replace function public.update_course_booking_admin(p_booking_id uuid, p_updates jsonb)
returns public.course_bookings language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.course_bookings;
  v_course text;
  v_date date;
  v_time text;
  v_slot_id uuid;
  v_capacity integer;
  v_booked integer;
  v_is_schedule_change boolean;
  v_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if auth.role() <> 'authenticated' then raise exception 'Acesso não autorizado'; end if;
  v_is_schedule_change := p_updates ? 'course_name' or p_updates ? 'date' or p_updates ? 'time';
  if v_is_schedule_change and v_email not in (
    'digitalavante3@gmail.com', 'nicolaspatzlaff02@gmail.com',
    'lucadsilva666@gmail.com', 'leonardowebster.ja@gmail.com'
  ) then raise exception 'Somente administradores podem alterar curso, data ou horário'; end if;

  select * into v_booking from public.course_bookings where id = p_booking_id for update;
  if not found then raise exception 'Agendamento não encontrado'; end if;
  v_course := case when p_updates ? 'course_name' then trim(p_updates->>'course_name') else v_booking.course_name end;
  v_date := case when p_updates ? 'date' then (p_updates->>'date')::date else v_booking.date end;
  v_time := case when p_updates ? 'time' then trim(p_updates->>'time') else v_booking.time end;

  if v_course not in ('Curso Meta Ads', 'Curso Meta Ads Avançado', 'Curso Google Ads', 'Curso Social Media', 'Curso Canva', 'Curso Inteligência Artificial', 'Curso Captação e Edição de Vídeo')
  then raise exception 'Curso inválido'; end if;

  if v_is_schedule_change then
    select id, max_students into v_slot_id, v_capacity from public.course_slots
    where course_name = v_course and date = v_date and time = v_time order by created_at limit 1;
    if v_slot_id is null then
      insert into public.course_slots(course_name, date, time, max_students)
      values (v_course, v_date, v_time, 5) returning id, max_students into v_slot_id, v_capacity;
    end if;
    select count(*) into v_booked from public.course_bookings
    where slot_id = v_slot_id and id <> p_booking_id and status = 'confirmed' and coalesce(course_status, '') <> 'cancelado';
    if v_booked >= v_capacity then raise exception 'Turno lotado'; end if;
  else v_slot_id := v_booking.slot_id;
  end if;

  update public.course_bookings set
    slot_id = v_slot_id, course_name = v_course, time = v_time,
    status = case when p_updates ? 'status' then p_updates->>'status' else status end,
    course_status = case when p_updates ? 'course_status' then p_updates->>'course_status' else course_status end,
    student_name = case when p_updates ? 'student_name' then trim(p_updates->>'student_name') else student_name end,
    email = case when p_updates ? 'email' then trim(p_updates->>'email') else email end,
    phone = case when p_updates ? 'phone' then trim(p_updates->>'phone') else phone end,
    instagram = case when p_updates ? 'instagram' then trim(p_updates->>'instagram') else instagram end,
    certificate_name = case when p_updates ? 'certificate_name' then trim(p_updates->>'certificate_name') else certificate_name end,
    date = v_date, updated_at = now()
  where id = p_booking_id returning * into v_booking;
  return v_booking;
end;
$$;
revoke all on function public.update_course_booking_admin(uuid, jsonb) from public, anon;
grant execute on function public.update_course_booking_admin(uuid, jsonb) to authenticated;

do $$
declare v_booking public.course_bookings%rowtype; v_slot_id uuid; v_capacity integer; v_booked integer;
begin
  select * into v_booking from public.course_bookings
  where lower(trim(student_name)) = 'giovani nostrani'
    and lower(trim(email)) = 'giovaninostrani@gmail.com'
    and date = date '2026-09-02' and course_name = 'Curso Meta Ads'
  order by created_at desc limit 1 for update;
  if found then
    select id, max_students into v_slot_id, v_capacity from public.course_slots
    where course_name = 'Curso Google Ads' and date = date '2026-09-03' and time = v_booking.time order by created_at limit 1;
    if v_slot_id is null then
      insert into public.course_slots(course_name, date, time, max_students)
      values ('Curso Google Ads', date '2026-09-03', v_booking.time, 5) returning id, max_students into v_slot_id, v_capacity;
    end if;
    select count(*) into v_booked from public.course_bookings
    where slot_id = v_slot_id and id <> v_booking.id and status = 'confirmed' and coalesce(course_status, '') <> 'cancelado';
    if v_booked >= v_capacity then raise exception 'Não foi possível mover Giovani: turno do Google Ads lotado'; end if;
    update public.course_bookings set course_name = 'Curso Google Ads', date = date '2026-09-03',
      slot_id = v_slot_id, updated_at = now() where id = v_booking.id;
  end if;
end;
$$;
select pg_notify('pgrst', 'reload schema');