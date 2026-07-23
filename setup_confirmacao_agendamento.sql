create or replace function public.confirm_course_booking(p_booking_id uuid)
returns table (
  success boolean,
  message text,
  student_name text,
  course_name text,
  course_date date,
  course_time text,
  course_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.course_bookings%rowtype;
begin
  select *
    into v_booking
  from public.course_bookings
  where id = p_booking_id;

  if not found then
    return query select
      false,
      'Agendamento nao encontrado.'::text,
      null::text,
      null::text,
      null::date,
      null::text,
      null::text;
    return;
  end if;

  if v_booking.status <> 'confirmed' or v_booking.course_status = 'cancelado' then
    return query select
      false,
      'Esse agendamento nao esta disponivel para confirmacao.'::text,
      v_booking.student_name,
      v_booking.course_name,
      v_booking.date,
      v_booking.time,
      v_booking.course_status;
    return;
  end if;

  if v_booking.course_status <> 'confirmado' then
    update public.course_bookings
      set course_status = 'confirmado'
    where id = p_booking_id;

    v_booking.course_status := 'confirmado';
  end if;

  return query select
    true,
    'Obrigado! Sua presenca foi confirmada com sucesso.'::text,
    v_booking.student_name,
    v_booking.course_name,
    v_booking.date,
    v_booking.time,
    v_booking.course_status;
end;
$$;

grant execute on function public.confirm_course_booking(uuid) to anon, authenticated;

update public.whatsapp_message_templates
set
  message_template = E'Ola, {{nome}}!\n\nPassando para lembrar que seu curso acontece amanha.\n\nCurso: {{curso}}\nData: {{data_agendamento}}\n\nConfirme sua presenca por aqui:\n{{confirmacao_link}}\n\nSe precisar remarcar, chama a gente por aqui.',
  updated_at = now()
where type = 'reminder_24h';

select pg_notify('pgrst', 'reload schema');
