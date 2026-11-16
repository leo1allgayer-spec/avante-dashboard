begin;

-- Kauan and Hiago manage the full client workspace. Keep the summary-only
-- restrictions for other limited accounts and for Emanoel's dedicated view.
create or replace function public.is_client_summary_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select lower(coalesce(auth.jwt()->>'email', '')) not in (
      'zanchikaua7@gmail.com',
      'hiagooleques1505@gmail.com'
    )
    and (
      coalesce(auth.jwt()->'app_metadata'->>'clients_access', '') = 'summary'
      or lower(coalesce(auth.jwt()->>'email', '')) = 'emanoelbull@gmail.com'
    );
$$;

create or replace function public.can_manage_client_contract_files()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null and lower(coalesce(auth.jwt()->>'email', '')) in (
    'abreuconsultoriaempresarial@gmail.com',
    'nicolaspatzlaff02@gmail.com',
    'leonardowebster.ja@gmail.com',
    'digitalavante3@gmail.com',
    'zanchikaua7@gmail.com',
    'hiagooleques1505@gmail.com'
  );
$$;

drop policy if exists client_team_manage_reports on public.client_reports;
create policy client_team_manage_reports on public.client_reports
for all to authenticated
using (lower(coalesce(auth.jwt()->>'email', '')) in ('zanchikaua7@gmail.com', 'hiagooleques1505@gmail.com'))
with check (lower(coalesce(auth.jwt()->>'email', '')) in ('zanchikaua7@gmail.com', 'hiagooleques1505@gmail.com'));

drop policy if exists client_team_read_report_files on storage.objects;
create policy client_team_read_report_files on storage.objects
for select to authenticated
using (bucket_id = 'client-reports' and lower(coalesce(auth.jwt()->>'email', '')) in ('zanchikaua7@gmail.com', 'hiagooleques1505@gmail.com'));

drop policy if exists client_team_delete_report_files on storage.objects;
create policy client_team_delete_report_files on storage.objects
for delete to authenticated
using (bucket_id = 'client-reports' and lower(coalesce(auth.jwt()->>'email', '')) in ('zanchikaua7@gmail.com', 'hiagooleques1505@gmail.com'));

-- Permit editing campaign analysis notes for the two full client managers.
create or replace function public.client_meta_analysis_notes_access(
  p_client_id uuid,
  p_period_key text,
  p_sections jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(coalesce(auth.jwt()->>'email', ''));
  v_sections jsonb;
begin
  if v_email not in (
    'digitalavante3@gmail.com',
    'nicolaspatzlaff02@gmail.com',
    'lucadsilva666@gmail.com',
    'leonardowebster.ja@gmail.com',
    'emanoelbull@gmail.com',
    'zanchikaua7@gmail.com',
    'hiagooleques1505@gmail.com'
  ) then raise exception 'Sem acesso'; end if;
  if length(p_period_key) > 2000 or p_period_key is null then raise exception 'Período inválido'; end if;
  if p_sections is not null then
    if v_email = 'emanoelbull@gmail.com' then raise exception 'Sem permissão para editar análise'; end if;
    if jsonb_typeof(p_sections) <> 'object' or length(p_sections::text) > 40000 or exists (
      select 1 from jsonb_each(p_sections)
      where key not in ('summary', 'strengths', 'attention', 'improvements') or jsonb_typeof(value) <> 'string'
    ) then raise exception 'Análise inválida'; end if;
    insert into public.client_meta_analysis_notes(client_id, period_key, sections)
    values (p_client_id, p_period_key, p_sections)
    on conflict (client_id, period_key) do update set sections = excluded.sections, updated_at = now();
  end if;
  select sections into v_sections from public.client_meta_analysis_notes
  where client_id = p_client_id and period_key = p_period_key;
  return v_sections;
end;
$$;

select pg_notify('pgrst', 'reload schema');
commit;
