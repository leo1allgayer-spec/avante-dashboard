create table if not exists public.client_meta_analysis_notes (
 client_id uuid not null references public.gestao_clients(id) on delete cascade,
 period_key text not null, sections jsonb not null, updated_at timestamptz not null default now(),
 primary key(client_id,period_key)
);
alter table public.client_meta_analysis_notes enable row level security;
revoke all on public.client_meta_analysis_notes from anon,authenticated;
grant all on public.client_meta_analysis_notes to service_role;
create or replace function public.client_meta_analysis_notes_access(p_client_id uuid,p_period_key text,p_sections jsonb default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_email text := lower(coalesce(auth.jwt()->>'email','')); v_sections jsonb;
begin
 if v_email not in ('digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com','emanoelbull@gmail.com') then raise exception 'Sem acesso'; end if;
 if length(p_period_key)>2000 or p_period_key is null then raise exception 'Período inválido'; end if;
 if p_sections is not null then
  if v_email='emanoelbull@gmail.com' then raise exception 'Sem permissão para editar análise'; end if;
  if jsonb_typeof(p_sections)<>'object' or length(p_sections::text)>40000 or exists(select 1 from jsonb_each(p_sections) where key not in ('summary','strengths','attention','improvements') or jsonb_typeof(value)<>'string') then raise exception 'Análise inválida'; end if;
  insert into public.client_meta_analysis_notes(client_id,period_key,sections) values(p_client_id,p_period_key,p_sections)
  on conflict(client_id,period_key) do update set sections=excluded.sections,updated_at=now();
 end if;
 select sections into v_sections from public.client_meta_analysis_notes where client_id=p_client_id and period_key=p_period_key;
 return v_sections;
end; $$;
revoke all on function public.client_meta_analysis_notes_access(uuid,text,jsonb) from public;
grant execute on function public.client_meta_analysis_notes_access(uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
