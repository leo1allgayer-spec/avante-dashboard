begin;
do $patch$
declare definition text; anchor text := 'new.course_name is not distinct from old.course_name and new.email is not distinct from old.email and new.phone is not distinct from old.phone';
begin
 select pg_get_functiondef(oid) into strict definition from pg_proc where pronamespace='public'::regnamespace and proname='guard_repeat_public_course_booking';
 if position(anchor in definition)=0 then raise exception 'Duplicate guard anchor missing'; end if;
 -- Changing modality inside the same course family does not create another registration.
 definition := replace(definition,anchor,'public.booking_course_family(new.course_name) is not distinct from public.booking_course_family(old.course_name) and new.email is not distinct from old.email and new.phone is not distinct from old.phone');
 execute definition;
end $patch$;
commit;
