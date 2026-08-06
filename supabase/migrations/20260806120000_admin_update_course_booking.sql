create or replace function public.update_course_booking_admin(
  p_booking_id uuid,
  p_updates jsonb
)
returns public.course_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.course_bookings;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Acesso não autorizado';
  end if;

  update public.course_bookings
  set
    status = case when p_updates ? 'status' then p_updates->>'status' else status end,
    course_status = case when p_updates ? 'course_status' then p_updates->>'course_status' else course_status end,
    student_name = case when p_updates ? 'student_name' then trim(p_updates->>'student_name') else student_name end,
    email = case when p_updates ? 'email' then trim(p_updates->>'email') else email end,
    phone = case when p_updates ? 'phone' then trim(p_updates->>'phone') else phone end,
    instagram = case when p_updates ? 'instagram' then trim(p_updates->>'instagram') else instagram end,
    certificate_name = case when p_updates ? 'certificate_name' then trim(p_updates->>'certificate_name') else certificate_name end,
    date = case when p_updates ? 'date' then (p_updates->>'date')::date else date end
  where id = p_booking_id
  returning * into v_booking;

  if v_booking.id is null then
    raise exception 'Agendamento não encontrado';
  end if;

  return v_booking;
end;
$$;

revoke all on function public.update_course_booking_admin(uuid, jsonb) from public, anon;
grant execute on function public.update_course_booking_admin(uuid, jsonb) to authenticated;
