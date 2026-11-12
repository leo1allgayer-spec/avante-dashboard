-- Meta (básico/avançado) e Google usam o mesmo período de disponibilidade.
-- Não altera agendamentos existentes nem as exceções entre básico e avançado.
begin;
create or replace function public.guard_shared_google_meta_agenda()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_family text;
  v_shift text;
  v_conflict text;
begin
  v_family := case when lower(trim(new.course_name)) in ('curso google ads','curso de google ads') then 'google'
    when lower(trim(new.course_name)) in ('curso meta ads','curso de meta ads','curso meta ads avançado','curso de meta ads avançado') then 'meta' end;
  if v_family is null then return new; end if;
  if tg_table_name = 'course_bookings' then
    if new.status <> 'confirmed' or coalesce(new.course_status,'') = 'cancelado' then return new; end if;
    if tg_op = 'UPDATE' then
      if new.course_name is not distinct from old.course_name and new.date is not distinct from old.date
        and new.time is not distinct from old.time and new.status is not distinct from old.status
        and new.course_status is not distinct from old.course_status then return new; end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.course_name is not distinct from old.course_name and new.date is not distinct from old.date
      and new.time is not distinct from old.time then return new; end if;
  end if;
  v_shift := case when lower(trim(new.time)) in ('manhã','manha') then 'manha'
    when lower(trim(new.time)) = 'tarde' then 'tarde'
    when trim(new.time) ~ '^0?[0-9]:[0-9]{2}(:[0-9]{2})?$' or trim(new.time) ~ '^1[01]:[0-9]{2}(:[0-9]{2})?$' then 'manha'
    when trim(new.time) ~ '^[12][0-9]:[0-9]{2}(:[0-9]{2})?$' then 'tarde' else lower(trim(new.time)) end;
  perform pg_advisory_xact_lock(hashtextextended('shared-google-meta:' || new.date::text || ':' || v_shift, 0));
  select course_name into v_conflict from (
    select b.course_name, b.time from public.course_bookings b
      where b.date = new.date and b.status = 'confirmed' and coalesce(b.course_status,'') <> 'cancelado'
        and (tg_table_name <> 'course_bookings' or b.id <> new.id)
    union all
    select s.course_name, s.time from public.course_slots s
      where s.date = new.date and (tg_table_name <> 'course_slots' or s.id <> new.id)
  ) occupied
  where (case when lower(trim(course_name)) in ('curso google ads','curso de google ads') then 'google'
    when lower(trim(course_name)) in ('curso meta ads','curso de meta ads','curso meta ads avançado','curso de meta ads avançado') then 'meta' end) <> v_family
    and (case when lower(trim(time)) in ('manhã','manha') then 'manha'
      when lower(trim(time)) = 'tarde' then 'tarde'
      when trim(time) ~ '^0?[0-9]:[0-9]{2}(:[0-9]{2})?$' or trim(time) ~ '^1[01]:[0-9]{2}(:[0-9]{2})?$' then 'manha'
      when trim(time) ~ '^[12][0-9]:[0-9]{2}(:[0-9]{2})?$' then 'tarde' else lower(trim(time)) end) = v_shift
  limit 1;
  if v_conflict is not null then
    raise exception using errcode = '23514', message = 'Este período já está reservado para ' || v_conflict || '. Escolha outro turno.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_shared_google_meta_agenda() from public, anon, authenticated;
create trigger guard_shared_google_meta_booking
before insert or update on public.course_bookings
for each row execute function public.guard_shared_google_meta_agenda();
create trigger guard_shared_google_meta_slot
before insert or update on public.course_slots
for each row execute function public.guard_shared_google_meta_agenda();
commit;
select tgname as regra, tgenabled as ativa from pg_trigger
where tgname in ('guard_shared_google_meta_booking','guard_shared_google_meta_slot');
