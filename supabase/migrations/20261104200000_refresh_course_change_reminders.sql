begin;
do $patch$
declare definition text; anchor text := 'new.date is not distinct from old.date and new.time is not distinct from old.time';
begin
 select pg_get_functiondef(oid) into strict definition from pg_proc where pronamespace='public'::regnamespace and proname='reschedule_course_whatsapp_messages';
 if position(anchor in definition)=0 then raise exception 'Reminder schedule guard missing'; end if;
 definition := replace(definition,anchor,anchor || ' and new.course_name is not distinct from old.course_name');
 execute definition;
end $patch$;
drop trigger if exists course_booking_reschedule_whatsapp on public.course_bookings;
create trigger course_booking_reschedule_whatsapp
after update of date, time, course_name on public.course_bookings
for each row execute function public.reschedule_course_whatsapp_messages();
commit;
