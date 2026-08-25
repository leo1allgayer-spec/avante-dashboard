alter table public.support_bookings
  add column if not exists modality text not null default 'presencial'
  check (modality in ('presencial', 'online'));

drop function if exists public.create_support_booking(text, date, time, text, text);

create or replace function public.create_support_booking(
  p_cpf text,
  p_date date,
  p_start_time time,
  p_modality text default 'presencial',
  p_student_name text default null,
  p_student_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_student public.alunos_futuros%rowtype;
  v_name text;
  v_phone text;
  v_rule public.support_availability_rules%rowtype;
  v_used integer;
  v_booked integer;
  v_booking public.support_bookings%rowtype;
begin
  if length(v_cpf) <> 11 then raise exception 'Informe um CPF válido'; end if;
  if p_modality not in ('presencial', 'online') then raise exception 'Escolha uma modalidade válida'; end if;
  if (p_date + p_start_time) <= (now() at time zone 'America/Sao_Paulo') then raise exception 'Escolha um horário futuro'; end if;

  perform pg_advisory_xact_lock(hashtext(p_date::text || '|' || p_start_time::text));
  select * into v_student from public.alunos_futuros where cpf_limpo = v_cpf order by created_at desc limit 1;
  v_name := coalesce(nullif(trim(v_student.nome), ''), nullif(trim(p_student_name), ''));
  v_phone := coalesce(nullif(trim(v_student.telefone), ''), nullif(trim(p_student_phone), ''));
  if v_name is null then raise exception 'Informe o nome completo'; end if;
  if length(regexp_replace(coalesce(v_phone, ''), '\D', '', 'g')) < 10 then raise exception 'Informe um WhatsApp válido'; end if;

  select * into v_rule from public.support_availability_rules
  where active and weekday = extract(dow from p_date)::integer and start_time = p_start_time limit 1;
  if v_rule.id is null then raise exception 'Este horário não está mais disponível'; end if;

  select count(*)::integer into v_used from public.support_bookings
  where cpf_limpo = v_cpf and status in ('agendado', 'concluido');
  if v_used >= 3 then raise exception 'Você já utilizou as três aulas de suporte disponíveis'; end if;
  if exists (select 1 from public.support_bookings where cpf_limpo = v_cpf and booking_date = p_date and start_time = p_start_time and status <> 'cancelado') then raise exception 'Esta aula já está agendada para você'; end if;
  select count(*)::integer into v_booked from public.support_bookings
  where booking_date = p_date and start_time = p_start_time and status <> 'cancelado';
  if v_booked >= v_rule.capacity then raise exception 'Este horário acabou de ser preenchido'; end if;

  insert into public.support_bookings (student_id, cpf_limpo, student_name, student_phone, booking_date, start_time, modality)
  values (v_student.id, v_cpf, v_name, v_phone, p_date, p_start_time, p_modality)
  returning * into v_booking;

  return jsonb_build_object('id', v_booking.id, 'name', v_booking.student_name, 'date', v_booking.booking_date, 'time', v_booking.start_time, 'modality', v_booking.modality, 'used', v_used + 1, 'remaining', greatest(0, 2 - v_used));
end;
$$;

revoke all on function public.create_support_booking(text, date, time, text, text, text) from public;
grant execute on function public.create_support_booking(text, date, time, text, text, text) to anon, authenticated;
select pg_notify('pgrst', 'reload schema');
