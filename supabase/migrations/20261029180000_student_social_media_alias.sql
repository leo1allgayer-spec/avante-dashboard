begin;
create or replace function public.student_course_key(p_value text)
returns text language sql immutable set search_path='' as $$
 select regexp_replace(trim(regexp_replace(
  regexp_replace(
   regexp_replace(
    regexp_replace(translate(lower(coalesce(p_value,'')),'áàãâäéêëíïóôõöúüç','aaaaaeeeiioooouuc'),'\mtrafego\s+pago\M',' ','g'),
    '\mcurso\M',' ','g'),
   '\mde\M',' ','g'),
  '[^a-z0-9]+',' ','g')),'\mmidia\M','media','g');
$$;
do $$ begin
 if public.student_course_key('Curso de Social Midia')<>public.student_course_key('Curso Social Media') then raise exception 'Social Media alias mismatch';end if;
 if public.student_course_key('Curso Meta Ads')=public.student_course_key('Curso Meta Ads Avançado') or public.student_course_key('Curso Meta Ads')=public.student_course_key('Curso Meta Ads Online') then raise exception 'Distinct Meta courses collapsed';end if;
end $$;
select pg_notify('pgrst','reload schema');
commit;
