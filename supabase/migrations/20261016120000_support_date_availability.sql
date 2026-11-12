begin;
create table if not exists public.support_date_overrides (
 id uuid primary key default gen_random_uuid(),
 slot_date date not null, start_time time not null,
 capacity integer not null default 1 check(capacity between 1 and 50),
 active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(slot_date,start_time)
);
alter table public.support_date_overrides enable row level security;
revoke all on public.support_date_overrides from anon;
grant select,insert,update,delete on public.support_date_overrides to authenticated;
create policy support_date_schedule_editors on public.support_date_overrides for all to authenticated
 using (not public.is_social_operation_user() and lower(coalesce(auth.jwt()->>'email','')) not in ('hjasiulzwicz@gmail.com','emanoelbull@gmail.com'))
 with check (not public.is_social_operation_user() and lower(coalesce(auth.jwt()->>'email','')) not in ('hjasiulzwicz@gmail.com','emanoelbull@gmail.com'));

create or replace function public.list_support_slots(p_from date default current_date, p_to date default (current_date + 60))
returns table(slot_date date, start_time time, capacity integer, booked integer)
language sql security definer set search_path = public
as $$
 with days as (
  select d::date as day from generate_series(greatest(p_from,(now() at time zone 'America/Sao_Paulo')::date)::timestamp,
   least(p_to,(now() at time zone 'America/Sao_Paulo')::date+90)::timestamp,interval '1 day') d
 ), effective as (
  select d.day,r.start_time,r.capacity from days d join public.support_availability_rules r
   on r.weekday=extract(dow from d.day)::integer and r.active
  where not exists(select 1 from public.support_date_overrides o where o.slot_date=d.day and o.start_time=r.start_time)
  union all
  select o.slot_date,o.start_time,o.capacity from public.support_date_overrides o join days d on d.day=o.slot_date where o.active
 )
 select rule.day,rule.start_time,rule.capacity,count(booking.id)::integer
 from effective rule
 left join public.support_bookings booking on booking.booking_date=rule.day and booking.start_time=rule.start_time and booking.status<>'cancelado'
 where rule.day+rule.start_time > now() at time zone 'America/Sao_Paulo'
 and not exists (
  select 1 from public.meetings m where m.date::date=rule.day and m.status<>'cancelled'
   and (m.responsible='Nicolas' or m.professional='Nicolas' or 'Nicolas'=any(coalesce(m.participants,array[]::text[])))
   and (m.time::time,m.time::time+(coalesce(m.duration_minutes,60)||' minutes')::interval)
    overlaps (rule.start_time,rule.start_time+interval '60 minutes')
 )
 group by rule.day,rule.start_time,rule.capacity having count(booking.id)<rule.capacity order by rule.day,rule.start_time;
$$;
revoke all on function public.list_support_slots(date,date) from public;
grant execute on function public.list_support_slots(date,date) to anon,authenticated;
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
  v_rule record;
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

  select * into v_rule from public.list_support_slots(p_date,p_date) where start_time=p_start_time limit 1;
  if v_rule.start_time is null then raise exception 'Este horário não está mais disponível'; end if;

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


notify pgrst,'reload schema';
commit;
