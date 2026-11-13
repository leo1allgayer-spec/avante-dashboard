-- Generated from src/constants/courseCatalog.ts by scripts/sync-course-catalog.mjs.
-- No historical sale, payment, survey or booking rows are rewritten.
begin;
create or replace function public.course_alias_key(p_value text) returns text language sql immutable set search_path='' as $$
 select trim(regexp_replace(translate(lower(coalesce(p_value,'')),'áàãâäéêëíïóôõöúüç','aaaaaeeeiioooouuc'),'[^a-z0-9]+',' ','g'));
$$;
create or replace function public.course_catalog() returns table(course_id text,course_name text,aliases text[]) language sql immutable set search_path='' as $$
 values
 ('meta_ads','Curso Meta Ads',array['meta_ads','Curso Meta Ads','Curso de Meta Ads','Curso de Meta Ads','Meta Ads','Curso Tráfego Pago Meta Ads','Curso de Tráfego Pago Meta Ads']),
 ('meta_ads_advanced','Curso Meta Ads Avançado',array['meta_ads_advanced','Curso Meta Ads Avançado','Curso Meta Ads Avançado','Curso de Meta Ads Avançado','Meta Ads Avançado','Gestor PRO','Gestor PRO+','Curso de Tráfego Gestor PRO','Curso de Tráfego Gestor PRO+']),
 ('meta_ads_online','Curso Meta Ads Online',array['meta_ads_online','Curso Meta Ads Online','Curso Meta Ads Online','Curso de Meta Ads Online','Meta Ads Online','Curso Tráfego Pago Meta Ads Online']),
 ('google','Curso Google Ads',array['google','Curso Google Ads','Curso Google Ads','Curso de Google Ads','Google Ads','Curso Tráfego Pago Google Ads','Curso de Tráfego Pago Google Ads']),
 ('social_media','Curso Social Media',array['social_media','Curso Social Media','Curso de Social Midia','Curso de Social Media','Curso de Social Midia','Curso Social Midia','Social Media','Social Midia']),
 ('canva','Curso Canva',array['canva','Curso Canva','Curso Canva para Empreendedores','Curso de Canva','Curso Canva para Empreendedores','Curso de Canva para Empreendedores','Canva']),
 ('ia','Curso Inteligência Artificial',array['ia','Curso Inteligência Artificial','Curso de IA','Curso de Inteligência Artificial','Curso de IA','Curso IA','Inteligência Artificial','IA']),
 ('video','Curso Captação e Edição de Vídeo',array['video','Curso Captação e Edição de Vídeo','Curso Captacao/Edicao','Curso de Captação e Edição de Vídeo','Curso Captacao/Edicao','Curso Captacao Edicao','Curso Captacao/Edicao de Conteudo','Curso de Edição e Captação de Vídeos','Curso Edição e Captação de Vídeos','Captação e Edição de Vídeo','Captação/Edição']),
 ('turma','Curso em Turma',array['turma','Curso em Turma','Curso em Turma','Curso de Turma','Curso Turma']),
 ('tiktok','Curso TikTok Ads',array['tiktok','Curso TikTok Ads','Curso de TikTok Ads','Curso de TikTok Ads','TikTok Ads']),
 ('youtube','Curso YouTube Ads',array['youtube','Curso YouTube Ads','Curso de YouTube Ads','Curso de YouTube Ads','YouTube Ads']);
$$;
create or replace function public.course_id_from_name(p_value text) returns text language sql immutable set search_path='' as $$
 select c.course_id from public.course_catalog() c where exists(select 1 from unnest(c.aliases) a where public.course_alias_key(a)=public.course_alias_key(p_value)) limit 1;
$$;
create or replace function public.canonical_course_name(p_value text) returns text language sql immutable set search_path='' as $$
 select coalesce((select c.course_name from public.course_catalog() c where c.course_id=public.course_id_from_name(p_value)),trim(coalesce(p_value,'')));
$$;
create or replace function public.student_course_key(p_value text) returns text language sql immutable set search_path='' as $$
 select coalesce(public.course_id_from_name(p_value),trim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(translate(lower(coalesce(p_value,'')),'áàãâäéêëíïóôõöúüç','aaaaaeeeiioooouuc'),'\mtrafego\s+pago\M',' ','g'),'\mcurso\M',' ','g'),'\mde\M',' ','g'),'[^a-z0-9]+',' ','g')));
$$;
create or replace function public.course_name_for_enrollment(p_type text) returns text language sql immutable set search_path='' as $$
 select coalesce((select c.course_name from public.course_catalog() c where c.course_id=p_type),p_type);
$$;
create or replace function public.course_payment_summary() returns table(student_name text,course_name text,remaining numeric) language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or lower(coalesce(auth.jwt()->>'email','')) not in ('digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com') then raise exception using errcode='42501',message='Sem acesso financeiro';end if;
 return query select a.nome::text,public.canonical_course_name(item->>'nome'),case when item->>'valor_pendente' ~ '^[0-9]+([.][0-9]+)?$' then (item->>'valor_pendente')::numeric else null end from public.alunos_futuros a cross join lateral jsonb_array_elements(coalesce(a.itens,'[]'::jsonb)) item where coalesce(item->>'tipo','curso')='curso';
end;$$;
revoke all on function public.course_payment_summary() from public,anon;
grant execute on function public.course_payment_summary() to authenticated;
do $$ declare c record;a text;begin
 for c in select * from public.course_catalog() loop
  foreach a in array c.aliases loop
   if public.course_id_from_name(a) is distinct from c.course_id or public.canonical_course_name(a) is distinct from c.course_name then raise exception 'Course alias mismatch: %',a;end if;
  end loop;
 end loop;
 if public.student_course_key('Curso de Meta Ads')=public.student_course_key('Curso Meta Ads Avançado') or public.student_course_key('Curso de Meta Ads')=public.student_course_key('Curso Meta Ads Online') then raise exception 'Distinct Meta courses merged';end if;
end $$;
select pg_notify('pgrst','reload schema');
commit;
