import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {transformSync} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/constants/courseCatalog.ts'),'utf8');
const compiled=transformSync(source,{loader:'ts',format:'esm',target:'es2022'}).code;
const {COURSE_CATALOG}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const quote=value=>`'${value.replaceAll("'","''")}'`;
const rows=COURSE_CATALOG.map(course=>` (${quote(course.id)},${quote(course.name)},array[${[course.id,course.name,course.financialName,...course.aliases].map(quote).join(',')}])`).join(',\n');
const sql=`-- Generated from src/constants/courseCatalog.ts by scripts/sync-course-catalog.mjs.
-- No historical sale, payment, survey or booking rows are rewritten.
begin;
create or replace function public.course_alias_key(p_value text) returns text language sql immutable set search_path='' as $$
 select trim(regexp_replace(translate(lower(coalesce(p_value,'')),'áàãâäéêëíïóôõöúüç','aaaaaeeeiioooouuc'),'[^a-z0-9]+',' ','g'));
$$;
create or replace function public.course_catalog() returns table(course_id text,course_name text,aliases text[]) language sql immutable set search_path='' as $$
 values
${rows};
$$;
create or replace function public.course_id_from_name(p_value text) returns text language sql immutable set search_path='' as $$
 select c.course_id from public.course_catalog() c where exists(select 1 from unnest(c.aliases) a where public.course_alias_key(a)=public.course_alias_key(p_value)) limit 1;
$$;
create or replace function public.canonical_course_name(p_value text) returns text language sql immutable set search_path='' as $$
 select coalesce((select c.course_name from public.course_catalog() c where c.course_id=public.course_id_from_name(p_value)),trim(coalesce(p_value,'')));
$$;
create or replace function public.student_course_key(p_value text) returns text language sql immutable set search_path='' as $$
 select coalesce(public.course_id_from_name(p_value),trim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(translate(lower(coalesce(p_value,'')),'áàãâäéêëíïóôõöúüç','aaaaaeeeiioooouuc'),'\\mtrafego\\s+pago\\M',' ','g'),'\\mcurso\\M',' ','g'),'\\mde\\M',' ','g'),'[^a-z0-9]+',' ','g')));
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
`;
const files=[['supabase/functions/_shared/course-catalog.ts','// Generated from src/constants/courseCatalog.ts. Run node scripts/sync-course-catalog.mjs.\n'+source],['supabase/migrations/20261029200000_shared_course_catalog.sql',sql]];
for(const [file,text] of files){const full=path.join(root,file);if(process.argv.includes('--check')){if(!fs.existsSync(full)||fs.readFileSync(full,'utf8')!==text)throw Error(`Course catalog is out of sync: ${file}`);}else fs.writeFileSync(full,text);}
console.log(process.argv.includes('--check')?'Course catalog copies match.':'Course catalog SQL and Edge helper generated.');
