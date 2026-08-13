alter table public.course_reschedule_requests
  alter column expires_at set default (now() + interval '24 hours');

create or replace function public.confirm_public_course_reschedule(p_token uuid)
returns table (
  success boolean,
  message text,
  booking_id uuid,
  student_name text,
  course_name text,
  previous_course_date date,
  previous_course_time text,
  course_date date,
  course_time text,
  course_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.course_reschedule_requests%rowtype;
  v_booking public.course_bookings%rowtype;
begin
  select *
  into v_request
  from public.course_reschedule_requests
  where token = p_token
  order by created_at desc
  limit 1
  for update;

  if not found then
    return query select false, 'Link de remarcação inválido.'::text,
      null::uuid, null::text, null::text, null::date, null::text,
      null::date, null::text, null::text;
    return;
  end if;

  select *
  into v_booking
  from public.course_bookings
  where id = v_request.booking_id
  for update;

  if not found then
    update public.course_reschedule_requests
    set status = 'failed', updated_at = now()
    where id = v_request.id;

    return query select false, 'Agendamento original não encontrado.'::text,
      null::uuid, null::text, null::text, null::date, null::text,
      null::date, null::text, null::text;
    return;
  end if;

  -- Abrir novamente o mesmo link não pode transformar uma remarcação já
  -- confirmada em erro. Devolvemos o agendamento atual como sucesso.
  if v_request.status = 'confirmed' then
    return query select true, 'Sua remarcação já foi confirmada.'::text,
      v_request.booking_id, v_booking.student_name, v_booking.course_name,
      v_booking.date, v_booking.time, v_booking.date, v_booking.time,
      coalesce(v_booking.course_status, 'confirmado')::text;
    return;
  end if;

  if v_request.status <> 'pending' then
    return query select false, 'Esta solicitação de remarcação não está mais disponível.'::text,
      v_request.booking_id, v_request.student_name, v_request.course_name,
      v_booking.date, v_booking.time, v_request.date, v_request.time,
      v_booking.course_status;
    return;
  end if;

  if v_request.expires_at <= now() then
    update public.course_reschedule_requests
    set status = 'expired', updated_at = now()
    where id = v_request.id;

    return query select false, 'O link de remarcação expirou. Solicite um novo link.'::text,
      v_request.booking_id, v_request.student_name, v_request.course_name,
      v_booking.date, v_booking.time, v_request.date, v_request.time,
      v_booking.course_status;
    return;
  end if;

  update public.course_bookings
  set
    student_name = v_request.student_name,
    course_name = v_request.course_name,
    date = v_request.date,
    time = v_request.time,
    email = lower(trim(v_request.email)),
    phone = regexp_replace(v_request.phone, '\D', '', 'g'),
    instagram = nullif(trim(v_request.instagram), ''),
    certificate_name = coalesce(nullif(trim(v_request.certificate_name), ''), v_request.student_name),
    status = 'confirmed',
    course_status = 'confirmado',
    updated_at = now()
  where id = v_request.booking_id;

  update public.whatsapp_scheduled_messages
  set status = 'cancelled', updated_at = now()
  where booking_id = v_request.booking_id
    and status = 'pending'
    and message_type in ('confirmation', 'reminder_24h', 'reminder_1h', 'post_course');

  update public.course_reschedule_requests
  set status = 'confirmed', updated_at = now()
  where id = v_request.id;

  return query select true, 'Sua remarcação foi confirmada com sucesso.'::text,
    v_request.booking_id, v_request.student_name, v_request.course_name,
    v_booking.date, v_booking.time, v_request.date, v_request.time,
    'confirmado'::text;
end;
$$;

revoke all on function public.confirm_public_course_reschedule(uuid) from public;
grant execute on function public.confirm_public_course_reschedule(uuid) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');
