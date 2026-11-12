begin;
create function public.transfer_selected_course_instructor(p_booking_id uuid,p_instructor text,p_expected_instructor text default null,p_expected_date date default null,p_expected_shift text default null,p_booking_ids uuid[] default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.course_bookings%rowtype;ids uuid[];names text[];old_teachers text;change_id uuid;locked_date date;locked_shift text;
begin
 if auth.uid() is null or lower(coalesce(auth.jwt()->>'email','')) not in ('digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com') then raise exception 'Sem permissão para trocar o professor';end if;
 if coalesce(cardinality(p_booking_ids),0)=0 or array_position(p_booking_ids,null) is not null then raise exception 'Selecione pelo menos um aluno';end if;
 if not (p_booking_id=any(p_booking_ids)) then raise exception 'O agendamento principal precisa estar selecionado';end if;
 if p_instructor not in ('Nicolas','Henrique') or p_instructor is null then raise exception 'Selecione Nicolas ou Henrique';end if;
 select * into b from public.course_bookings where id=p_booking_id;
 if not found then raise exception 'Agendamento não encontrado';end if;
 locked_date:=b.date;locked_shift:=public.course_booking_shift(b.time);
 perform pg_advisory_xact_lock(hashtextextended('course-online:'||b.date::text||':'||public.course_booking_shift(b.time),0));
 select * into b from public.course_bookings where id=p_booking_id for update;
 if not found or b.date is distinct from locked_date or public.course_booking_shift(b.time) is distinct from locked_shift then raise exception 'O horário foi alterado. Atualize a agenda e tente novamente.';end if;
 if (p_expected_date is not null and b.date<>p_expected_date) or (p_expected_shift is not null and public.course_booking_shift(b.time)<>public.course_booking_shift(p_expected_shift)) then raise exception 'A turma foi reagendada. Atualize a agenda e tente novamente.';end if;
 if b.course_name not in ('Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online') then raise exception 'A troca entre Nicolas e Henrique está disponível para os três cursos de Meta';end if;
 if b.status<>'confirmed' or coalesce(b.course_status,'') in ('cancelado','concluido','concluído','realizado','faltou') then raise exception 'A turma está cancelada ou encerrada';end if;
 if b.instructor is distinct from p_expected_instructor then raise exception 'O professor foi alterado por outra pessoa. Atualize a agenda e tente novamente.';end if;
 perform 1 from public.course_bookings where course_name=b.course_name and date=b.date and public.course_booking_shift(time)=public.course_booking_shift(b.time) and status='confirmed' and coalesce(course_status,'') not in ('cancelado','concluido','concluído','realizado','faltou') for update;
 select array_agg(id order by created_at),array_agg(student_name order by created_at),string_agg(distinct instructor,', ') into ids,names,old_teachers from public.course_bookings where id=any(p_booking_ids) and course_name=b.course_name and date=b.date and public.course_booking_shift(time)=public.course_booking_shift(b.time) and status='confirmed' and coalesce(course_status,'') not in ('cancelado','concluido','concluído','realizado','faltou');
 if coalesce(cardinality(ids),0)<>(select count(distinct x) from unnest(p_booking_ids) x) then raise exception 'Algum aluno selecionado mudou de turma ou não está mais disponível. Atualize a agenda.';end if;
 if exists(select 1 from public.course_bookings where id=any(ids) and instructor is distinct from p_expected_instructor) then raise exception 'O professor de algum aluno foi alterado. Atualize a agenda.';end if;
 if not exists(select 1 from public.course_bookings where id=any(ids) and instructor is distinct from p_instructor) then return jsonb_build_object('changed',false,'studentCount',cardinality(ids));end if;
 if not public.course_instructor_enabled(p_instructor,b.course_name,b.date,b.time) then raise exception '% está indisponível neste curso, dia e turno. Ajuste a disponibilidade do professor antes de trocar.',p_instructor;end if;
 if exists(select 1 from public.course_bookings where date=b.date and public.course_booking_shift(time)=public.course_booking_shift(b.time) and status='confirmed' and coalesce(course_status,'') not in ('cancelado','concluido','concluído') and instructor=p_instructor and course_name<>b.course_name) then raise exception '% já tem outro curso neste turno.',p_instructor;end if;
 insert into public.course_instructor_changes(course_name,course_date,shift,old_instructor,new_instructor,booking_ids,student_names,requested_by,applying) values(b.course_name,b.date,public.course_booking_shift(b.time),old_teachers,p_instructor,ids,names,auth.uid(),true) returning id into change_id;
 update public.course_bookings set instructor=p_instructor,updated_at=now() where id=any(ids);
 update public.course_instructor_changes set applying=false where id=change_id;
 return jsonb_build_object('changed',true,'changeId',change_id,'studentCount',cardinality(ids),'instructor',p_instructor);
end;$$;
revoke all on function public.transfer_selected_course_instructor(uuid,text,text,date,text,uuid[]) from public,anon;
grant execute on function public.transfer_selected_course_instructor(uuid,text,text,date,text,uuid[]) to authenticated;
select pg_notify('pgrst','reload schema');
commit;

