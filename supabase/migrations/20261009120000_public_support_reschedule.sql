create or replace function public.list_my_support_bookings(p_cpf text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cpf text := regexp_replace(coalesce(p_cpf,''),'\D','','g'); v_phone text := regexp_replace(coalesce(p_phone,''),'\D','','g'); v_rows jsonb;
begin
  if length(v_cpf) <> 11 or length(v_phone) not in (10,11,12,13) then raise exception 'Informe CPF e WhatsApp válidos'; end if;
  if length(v_phone) in (12,13) and left(v_phone,2)='55' then v_phone := substring(v_phone from 3); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'date',b.booking_date,'time',b.start_time,'modality',b.modality) order by b.booking_date,b.start_time),'[]'::jsonb) into v_rows
  from public.support_bookings b left join public.alunos_futuros a on a.id=b.student_id
  where b.cpf_limpo=v_cpf and b.status='agendado' and b.booking_date+b.start_time > now() at time zone 'America/Sao_Paulo'
  and right(regexp_replace(coalesce(nullif(b.student_phone,''),a.telefone,''),'\D','','g'),length(v_phone))=v_phone;
  return v_rows;
end; $$;
create or replace function public.reschedule_support_booking(p_booking_id uuid,p_cpf text,p_phone text,p_date date,p_start_time time,p_modality text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_booking public.support_bookings%rowtype; v_used integer;
begin
  if not exists(select 1 from jsonb_array_elements(public.list_my_support_bookings(p_cpf,p_phone)) x where x->>'id'=p_booking_id::text) then raise exception 'Aula não encontrada. Confira CPF e WhatsApp do cadastro'; end if;
  select * into v_booking from public.support_bookings where id=p_booking_id for update;
  if v_booking.status <> 'agendado' or v_booking.booking_date+v_booking.start_time <= now() at time zone 'America/Sao_Paulo' then raise exception 'Somente aulas futuras podem ser remarcadas'; end if;
  if p_modality is null or p_modality not in ('presencial','online') then raise exception 'Escolha a modalidade'; end if;
  if p_date is null or p_start_time is null or p_date+p_start_time <= now() at time zone 'America/Sao_Paulo' then raise exception 'Escolha um horário futuro'; end if;
  if p_date=v_booking.booking_date and p_start_time=v_booking.start_time then raise exception 'Escolha um novo horário'; end if;
  perform pg_advisory_xact_lock(hashtext(p_date::text || '|' || p_start_time::text));
  if not exists(select 1 from public.list_support_slots(p_date,p_date) s where s.slot_date=p_date and s.start_time=p_start_time) then raise exception 'Este horário não está mais disponível'; end if;
  if exists(select 1 from public.support_bookings where cpf_limpo=v_booking.cpf_limpo and booking_date=p_date and start_time=p_start_time and status<>'cancelado' and id<>p_booking_id) then raise exception 'Você já possui aula neste horário'; end if;
  update public.support_bookings set booking_date=p_date,start_time=p_start_time,modality=p_modality,updated_at=now() where id=p_booking_id returning * into v_booking;
  update public.support_notification_jobs set scheduled_for=((p_date+p_start_time) at time zone 'America/Sao_Paulo') - interval '1 hour',status='pending',attempts=0,last_error=null
  where booking_id=p_booking_id and message_type in ('student_reminder_1h','admin_reminder_1h','admin_leonardo_reminder_1h') and status<>'processing';
  select count(*) into v_used from public.support_bookings where cpf_limpo=v_booking.cpf_limpo and status in ('agendado','concluido');
  return jsonb_build_object('id',v_booking.id,'name',v_booking.student_name,'date',v_booking.booking_date,'time',v_booking.start_time,'used',v_used,'remaining',greatest(0,3-v_used));
end; $$;
revoke all on function public.list_my_support_bookings(text,text) from public;
revoke all on function public.reschedule_support_booking(uuid,text,text,date,time,text) from public;
grant execute on function public.list_my_support_bookings(text,text) to anon,authenticated;
grant execute on function public.reschedule_support_booking(uuid,text,text,date,time,text) to anon,authenticated;
notify pgrst,'reload schema';

