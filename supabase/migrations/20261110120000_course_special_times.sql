begin;

-- Horários especiais são slots com hora própria; usuários públicos só os leem.
grant select on public.course_slots to anon, authenticated;
grant insert, delete on public.course_slots to authenticated;
drop policy if exists "Admins manage special course slots" on public.course_slots;
create policy "Admins manage special course slots" on public.course_slots
  for all to authenticated
  using (lower(auth.jwt()->>'email') in (
    'digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com'
  ))
  with check (lower(auth.jwt()->>'email') in (
    'digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com'
  ));

create or replace function public.get_course_slot_booking_counts(p_course_name text)
returns table(booking_date date, booking_time text, booking_count bigint)
language sql stable security definer set search_path = public as $$
  select b.date, left(b.time, 5), count(*)
  from public.course_bookings b
  where b.course_name = p_course_name
    and b.date between (now() at time zone 'America/Sao_Paulo')::date
      and (now() at time zone 'America/Sao_Paulo')::date + 90
    and b.status = 'confirmed'
    and coalesce(b.course_status, '') not in ('cancelado', 'concluido', 'concluído')
  group by b.date, left(b.time, 5);
$$;
grant execute on function public.get_course_slot_booking_counts(text) to anon, authenticated;

-- Um horário especial diferente (por exemplo 17:00) pode coexistir com uma
-- turma padrão do mesmo turno, mas não com outra turma no mesmo horário.
create or replace function public.guard_shared_google_meta_agenda()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_family text;
  v_shift text;
  v_clock text;
  v_special boolean;
  v_conflict text;
begin
  v_family := case when lower(trim(new.course_name)) in ('curso google ads','curso de google ads') then 'google'
    when lower(trim(new.course_name)) in ('curso meta ads','curso de meta ads','curso meta ads avançado','curso de meta ads avançado') then 'meta' end;
  if v_family is null then return new; end if;
  if tg_table_name = 'course_bookings' then
    if new.status <> 'confirmed' or coalesce(new.course_status,'') = 'cancelado' then return new; end if;
    if tg_op = 'UPDATE' and new.course_name is not distinct from old.course_name and new.date is not distinct from old.date
      and new.time is not distinct from old.time and new.status is not distinct from old.status
      and new.course_status is not distinct from old.course_status then return new; end if;
  elsif tg_op = 'UPDATE' then
    if new.course_name is not distinct from old.course_name and new.date is not distinct from old.date
      and new.time is not distinct from old.time then return new; end if;
  end if;
  v_special := trim(new.time) ~ '^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$'
    and left(trim(new.time),5) not in ('08:30','14:00');
  v_clock := case when lower(trim(new.time)) in ('manhã','manha') then '08:30'
    when lower(trim(new.time)) = 'tarde' then '14:00' else left(trim(new.time),5) end;
  v_shift := case when lower(trim(new.time)) in ('manhã','manha') then 'manha'
    when lower(trim(new.time)) = 'tarde' then 'tarde'
    when trim(new.time) ~ '^0?[0-9]:[0-9]{2}(:[0-9]{2})?$' or trim(new.time) ~ '^1[01]:[0-9]{2}(:[0-9]{2})?$' then 'manha'
    when trim(new.time) ~ '^[12][0-9]:[0-9]{2}(:[0-9]{2})?$' then 'tarde' else lower(trim(new.time)) end;
  perform pg_advisory_xact_lock(hashtextextended('shared-google-meta:' || new.date::text || ':' || v_shift, 0));
  select course_name into v_conflict from (
    select b.course_name, b.time from public.course_bookings b where b.date=new.date and b.status='confirmed'
      and coalesce(b.course_status,'') <> 'cancelado' and (tg_table_name <> 'course_bookings' or b.id <> new.id)
    union all
    select s.course_name, s.time from public.course_slots s where s.date=new.date
      and (tg_table_name <> 'course_slots' or s.id <> new.id)
  ) occupied
  where (case when lower(trim(course_name)) in ('curso google ads','curso de google ads') then 'google'
    when lower(trim(course_name)) in ('curso meta ads','curso de meta ads','curso meta ads avançado','curso de meta ads avançado') then 'meta' end) <> v_family
    and (case when lower(trim(time)) in ('manhã','manha') then 'manha' when lower(trim(time))='tarde' then 'tarde'
      when trim(time) ~ '^0?[0-9]:[0-9]{2}(:[0-9]{2})?$' or trim(time) ~ '^1[01]:[0-9]{2}(:[0-9]{2})?$' then 'manha'
      when trim(time) ~ '^[12][0-9]:[0-9]{2}(:[0-9]{2})?$' then 'tarde' else lower(trim(time)) end) = v_shift
    and not (
      (v_special or (trim(time) ~ '^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$' and left(trim(time),5) not in ('08:30','14:00')))
      and (case when lower(trim(time)) in ('manhã','manha') then '08:30' when lower(trim(time))='tarde' then '14:00' else left(trim(time),5) end) <> v_clock
    )
  limit 1;
  if v_conflict is not null then raise exception using errcode='23514', message='Este período já está reservado para ' || v_conflict || '. Escolha outro horário.'; end if;
  return new;
end;
$$;

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
  v_capacity integer := 5;
  v_sibling_course text;
  v_has_exception boolean := false;
  v_is_special boolean := false;
  v_requested_date date;
  v_shift_time time;
  v_slot_time text;
  v_booking_shift text;
  v_min_advance_minutes integer := 60;
  v_clean_email text := lower(trim(coalesce(p_email, '')));
  v_clean_name text := trim(p_student_name);
  v_clean_phone text := trim(p_phone);
begin
  if p_course_name is null or length(trim(p_course_name)) < 2 then raise exception 'Nome do curso inválido'; end if;
  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Data inválida'; end if;
  v_requested_date := p_date::date;

  if p_shift = 'Manhã' then v_shift_time := time '08:30'; v_slot_time := 'Manhã';
  elsif p_shift = 'Tarde' then v_shift_time := time '14:00'; v_slot_time := 'Tarde';
  elsif p_shift ~ '^([01]\d|2[0-3]):[0-5]\d$' then
    v_shift_time := p_shift::time;
    v_slot_time := to_char(v_shift_time, 'HH24:MI');
    select exists(select 1 from public.course_slots s where s.course_name=p_course_name and s.date=v_requested_date and left(s.time,5)=v_slot_time)
      into v_is_special;
    if not v_is_special then raise exception 'Este horário especial não está mais disponível'; end if;
  else raise exception 'Horário inválido'; end if;
  v_booking_shift := public.course_booking_shift(to_char(v_shift_time, 'HH24:MI'));

  if length(v_clean_name) < 2 then raise exception 'Nome inválido'; end if;
  if v_clean_email <> '' and v_clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido'; end if;
  if length(v_clean_phone) < 10 then raise exception 'Telefone inválido'; end if;

  select coalesce(min_advance_minutes, 60) into v_min_advance_minutes
    from public.booking_settings limit 1;
  if (v_requested_date + v_shift_time) < (now() at time zone 'America/Sao_Paulo') + make_interval(mins => v_min_advance_minutes) then
    raise exception 'Este horário não respeita a antecedência mínima';
  end if;

  if not v_is_special and exists (
    select 1 from public.course_disabled_days
    where course_name = p_course_name and day_of_week = extract(dow from v_requested_date)::integer
      and (shift is null or shift in (p_shift, to_char(v_shift_time, 'HH24:MI')))
  ) then raise exception 'Este dia ou turno está desativado'; end if;

  if exists (
    select 1 from public.course_blocked_dates
    where date = v_requested_date and (course_name is null or course_name = p_course_name)
      and (shift is null or shift in (p_shift, v_booking_shift, to_char(v_shift_time, 'HH24:MI')))
  ) then raise exception 'Esta data ou turno está bloqueado'; end if;

  if p_course_name = 'Curso Meta Ads' then v_sibling_course := 'Curso Meta Ads Avançado';
  elsif p_course_name = 'Curso Meta Ads Avançado' then v_sibling_course := 'Curso Meta Ads'; end if;
  if v_sibling_course is not null then
    select exists(select 1 from public.meta_ads_exceptions
      where date = v_requested_date and (shift is null or public.course_booking_shift(shift) = v_booking_shift)) into v_has_exception;
    if not v_has_exception and (
      exists(select 1 from public.course_bookings where course_name=v_sibling_course and date=v_requested_date
        and public.course_booking_shift(time)=v_booking_shift and status='confirmed' and coalesce(course_status,'') <> 'cancelado')
      or exists(select 1 from public.course_slots where course_name=v_sibling_course and date=v_requested_date
        and public.course_booking_shift(time)=v_booking_shift)
    ) then raise exception 'Este turno já está reservado para %. Escolha outro horário.', v_sibling_course; end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('course-online:'||v_requested_date::text||':'||v_booking_shift,0));
  select id, max_students into v_slot_id, v_capacity from public.course_slots
    where course_name=p_course_name and date=v_requested_date and left(time,5)=v_slot_time limit 1 for update;
  if v_slot_id is null then
    if v_is_special then raise exception 'Este horário especial não está mais disponível'; end if;
    insert into public.course_slots(course_name,date,time,max_students) values(p_course_name,v_requested_date,v_slot_time,5) returning id into v_slot_id;
  end if;
  select count(*) into v_booking_count from public.course_bookings
    where slot_id=v_slot_id and status='confirmed' and coalesce(course_status,'') not in ('cancelado','concluido','concluído');
  if v_booking_count >= coalesce(v_capacity,5) then raise exception 'Este horário está lotado'; end if;

  insert into public.course_bookings(id,slot_id,course_name,student_name,email,phone,instagram,certificate_name,date,time,status)
  values(v_booking_id,v_slot_id,p_course_name,v_clean_name,v_clean_email,v_clean_phone,coalesce(trim(p_instagram),''),
    coalesce(nullif(trim(p_certificate_name),''),v_clean_name),v_requested_date,v_slot_time,'confirmed');
  return jsonb_build_object('booking_id',v_booking_id);
exception when unique_violation then raise exception 'Você já está agendado neste horário';
end;
$$;

grant execute on function public.create_public_course_booking(text,text,text,text,text,text,text,text) to anon, authenticated;
select pg_notify('pgrst','reload schema');
commit;
