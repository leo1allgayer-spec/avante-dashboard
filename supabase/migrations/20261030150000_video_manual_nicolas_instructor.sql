begin;
do $migration$
declare definition text; anchor text;
begin
 definition:=pg_get_functiondef('public.transfer_selected_course_instructor(uuid,text,text,date,text,uuid[])'::regprocedure);
 anchor:=$old$if b.course_name not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online') then raise exception 'A troca entre Nicolas e Henrique está disponível para os três cursos de Meta';end if;$old$;
 if position(anchor in definition)=0 then raise exception 'Unexpected transfer definition';end if;
 definition:=replace(definition,anchor,$new$if public.course_id_from_name(b.course_name)='video' then
  if p_instructor<>'Nicolas' then raise exception 'Para Captação e Edição de Vídeo, selecione Nicolas';end if;
 elsif b.course_name not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online') then raise exception 'Curso sem troca de professor configurada';end if;$new$);
 execute definition;
 definition:=pg_get_functiondef('public.assign_course_instructor()'::regprocedure);
 anchor:=$old$if new.course_name not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online') then new.instructor:=null;return new;end if;$old$;
 if position(anchor in definition)=0 then raise exception 'Unexpected instructor trigger definition';end if;
 definition:=replace(definition,anchor,$new$if public.course_id_from_name(new.course_name)='video' then
  if tg_op='UPDATE' then
   if new.instructor is distinct from old.instructor then
    if new.instructor='Nicolas' and exists(select 1 from public.course_instructor_changes c where c.applying and c.transaction_id=txid_current() and c.requested_by=auth.uid() and new.id=any(c.booking_ids) and c.course_name=new.course_name and c.course_date=new.date and c.shift=public.course_booking_shift(new.time) and c.new_instructor=new.instructor) then return new;end if;
    raise exception 'Use Trocar professor para atribuir o curso ao Nicolas';
   end if;
  elsif new.instructor is not null then raise exception 'Use Trocar professor para atribuir o curso ao Nicolas';end if;
  return new;
 end if;
 if new.course_name not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online') then new.instructor:=null;return new;end if;$new$);
 execute definition;
end $migration$;
select pg_notify('pgrst','reload schema');
commit;
