begin;
create or replace function public.booking_course_family(p_course text) returns text language sql immutable set search_path='' as $$
 select case when public.student_course_key(p_course) in (public.student_course_key('Curso Meta Ads'),public.student_course_key('Curso Meta Ads Online')) then 'meta_basic_any_modality' else public.student_course_key(p_course) end;
$$;
do $patch$
declare definition text; old_fragment text;
begin
 select pg_get_functiondef(oid) into definition from pg_proc where pronamespace='public'::regnamespace and proname='register_future_student_from_booking' limit 1;
 old_fragment := 'public.student_course_key(elements.item->>''nome'') = public.student_course_key(v_item_nome)';
 if position(old_fragment in definition)=0 then raise exception 'Registration anchor missing';end if;
 definition:=replace(definition,old_fragment,'public.booking_course_family(elements.item->>''nome'') = public.booking_course_family(v_item_nome)');
 execute definition;
end;
$patch$;
-- Last line of defense for direct booking creation and concurrent submissions.
create or replace function public.guard_repeat_public_course_booking() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status is distinct from 'confirmed' or coalesce(new.course_status,'') in ('cancelado','concluido','concluído') then return new;end if;
 if tg_op='UPDATE' then
  if new.course_name is not distinct from old.course_name and new.email is not distinct from old.email and new.phone is not distinct from old.phone then return new;end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('booking-student:'||public.booking_course_family(new.course_name)||':'||lower(trim(coalesce(new.email,''))),0));
 if exists(select 1 from public.course_bookings b where b.id<>new.id and b.status='confirmed' and coalesce(b.course_status,'') not in ('cancelado','concluido','concluído') and public.booking_course_family(b.course_name)=public.booking_course_family(new.course_name) and
 ((nullif(trim(new.email),'') is not null and lower(trim(b.email))=lower(trim(new.email)) and regexp_replace(coalesce(b.phone,''),'\D','','g')=regexp_replace(coalesce(new.phone,''),'\D','','g')))) then
 raise exception 'Você já possui este curso agendado. Volte e escolha trocar a data do agendamento existente.';
 end if;
 return new;
end;$$;
drop trigger if exists guard_repeat_public_course_booking on public.course_bookings;
create trigger guard_repeat_public_course_booking before insert or update of course_name,email,phone on public.course_bookings for each row execute function public.guard_repeat_public_course_booking();
commit;
