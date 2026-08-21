create table if not exists public.support_availability_rules (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  capacity integer not null default 1 check (capacity between 1 and 50),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (weekday, start_time)
);

create table if not exists public.support_bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.alunos_futuros(id) on delete restrict,
  cpf_limpo text not null,
  student_name text not null,
  booking_date date not null,
  start_time time not null,
  status text not null default 'agendado' check (status in ('agendado', 'concluido', 'cancelado')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists public.support_bookings_student_slot_unique;
create unique index if not exists support_bookings_cpf_slot_unique
  on public.support_bookings (cpf_limpo, booking_date, start_time)
  where status <> 'cancelado';

create index if not exists support_bookings_date_idx
  on public.support_bookings (booking_date, start_time);

create index if not exists support_bookings_cpf_idx
  on public.support_bookings (cpf_limpo);

alter table public.support_availability_rules enable row level security;
alter table public.support_bookings enable row level security;

drop policy if exists "Authenticated manage support rules" on public.support_availability_rules;
create policy "Authenticated manage support rules"
  on public.support_availability_rules for all to authenticated
  using (true) with check (true);

drop policy if exists "Authenticated manage support bookings" on public.support_bookings;
create policy "Authenticated manage support bookings"
  on public.support_bookings for all to authenticated
  using (true) with check (true);

create or replace function public.lookup_support_student(p_cpf text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_student public.alunos_futuros%rowtype;
  v_used integer;
begin
  if length(v_cpf) <> 11 then
    raise exception 'Informe um CPF válido com 11 dígitos';
  end if;

  select * into v_student
  from public.alunos_futuros
  where cpf_limpo = v_cpf
  order by created_at desc
  limit 1;

  if v_student.id is null then
    return null;
  end if;

  select count(*)::integer into v_used
  from public.support_bookings
  where cpf_limpo = v_cpf and status in ('agendado', 'concluido');

  return jsonb_build_object(
    'student_id', v_student.id,
    'name', v_student.nome,
    'used', v_used,
    'remaining', greatest(0, 3 - v_used)
  );
end;
$$;

create or replace function public.list_support_slots(
  p_from date default current_date,
  p_to date default (current_date + 60)
)
returns table(slot_date date, start_time time, capacity integer, booked integer)
language sql
security definer
set search_path = public
as $$
  select
    day_value::date as slot_date,
    rule.start_time,
    rule.capacity,
    count(booking.id)::integer as booked
  from generate_series(
    greatest(p_from, (now() at time zone 'America/Sao_Paulo')::date)::timestamp,
    least(p_to, (now() at time zone 'America/Sao_Paulo')::date + 90)::timestamp,
    interval '1 day'
  ) day_value
  join public.support_availability_rules rule
    on rule.active
   and rule.weekday = extract(dow from day_value)::integer
  left join public.support_bookings booking
    on booking.booking_date = day_value::date
   and booking.start_time = rule.start_time
   and booking.status <> 'cancelado'
  where (day_value::date + rule.start_time) > (now() at time zone 'America/Sao_Paulo')
  group by day_value, rule.start_time, rule.capacity
  having count(booking.id) < rule.capacity
  order by day_value, rule.start_time;
$$;

create or replace function public.create_support_booking(
  p_cpf text,
  p_date date,
  p_start_time time
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_student public.alunos_futuros%rowtype;
  v_rule public.support_availability_rules%rowtype;
  v_used integer;
  v_booked integer;
  v_booking public.support_bookings%rowtype;
begin
  if length(v_cpf) <> 11 then raise exception 'Informe um CPF válido'; end if;
  if (p_date + p_start_time) <= (now() at time zone 'America/Sao_Paulo') then
    raise exception 'Escolha um horário futuro';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_date::text || '|' || p_start_time::text));

  select * into v_student from public.alunos_futuros
  where cpf_limpo = v_cpf order by created_at desc limit 1;
  if v_student.id is null then raise exception 'CPF não encontrado no cadastro de alunos'; end if;

  select * into v_rule from public.support_availability_rules
  where active
    and weekday = extract(dow from p_date)::integer
    and start_time = p_start_time
  limit 1;
  if v_rule.id is null then raise exception 'Este horário não está mais disponível'; end if;

  select count(*)::integer into v_used from public.support_bookings
  where cpf_limpo = v_cpf and status in ('agendado', 'concluido');
  if v_used >= 3 then raise exception 'Você já utilizou as três aulas de suporte disponíveis'; end if;

  if exists (
    select 1 from public.support_bookings
    where cpf_limpo = v_cpf and booking_date = p_date
      and start_time = p_start_time and status <> 'cancelado'
  ) then raise exception 'Esta aula já está agendada para você'; end if;

  select count(*)::integer into v_booked from public.support_bookings
  where booking_date = p_date and start_time = p_start_time and status <> 'cancelado';
  if v_booked >= v_rule.capacity then raise exception 'Este horário acabou de ser preenchido'; end if;

  insert into public.support_bookings (
    student_id, cpf_limpo, student_name, booking_date, start_time
  ) values (
    v_student.id, v_cpf, v_student.nome, p_date, p_start_time
  ) returning * into v_booking;

  return jsonb_build_object(
    'id', v_booking.id,
    'name', v_booking.student_name,
    'date', v_booking.booking_date,
    'time', v_booking.start_time,
    'used', v_used + 1,
    'remaining', greatest(0, 2 - v_used)
  );
end;
$$;

revoke all on function public.lookup_support_student(text) from public;
revoke all on function public.list_support_slots(date, date) from public;
revoke all on function public.create_support_booking(text, date, time) from public;
grant execute on function public.lookup_support_student(text) to anon, authenticated;
grant execute on function public.list_support_slots(date, date) to anon, authenticated;
grant execute on function public.create_support_booking(text, date, time) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');
