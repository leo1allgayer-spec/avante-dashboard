begin;

-- Every booking made in an explicitly created extra-time slot belongs to Nicolas,
-- regardless of course or the instructor selected for the surrounding standard shift.
do $migration$
declare
  definition text;
  anchor text := $anchor$begin
 if public.course_id_from_name(new.course_name)='video' then$anchor$;
  replacement text := $replacement$begin
 if exists (
   select 1 from public.course_slots s
   where s.id = new.slot_id
     and s.course_name = new.course_name
     and s.date = new.date
     and left(s.time, 5) = left(new.time, 5)
     and trim(s.time) not in ('Manhã', 'Tarde', '08:30', '14:00')
 ) then
  if new.status <> 'confirmed' or coalesce(new.course_status, '') in ('cancelado','concluido','concluído','realizado','faltou') then
   new.instructor := null;
   return new;
  end if;
  new.instructor := 'Nicolas';
  return new;
 end if;
 if public.course_id_from_name(new.course_name)='video' then$replacement$;
begin
  definition := pg_get_functiondef('public.assign_course_instructor()'::regprocedure);
  if position(anchor in definition) = 0 then
    raise exception 'Unexpected assign_course_instructor definition';
  end if;
  execute replace(definition, anchor, replacement);
end;
$migration$;

-- Correct active bookings already made in extra-time slots. The trigger above
-- guarantees that this backfill changes only the instructor assignment.
update public.course_bookings b
set instructor = 'Nicolas'
from public.course_slots s
where s.id = b.slot_id
  and s.course_name = b.course_name
  and s.date = b.date
  and left(s.time, 5) = left(b.time, 5)
  and trim(s.time) not in ('Manhã', 'Tarde', '08:30', '14:00')
  and b.status = 'confirmed'
  and coalesce(b.course_status, '') not in ('cancelado','concluido','concluído','realizado','faltou')
  and b.instructor is distinct from 'Nicolas';

commit;
