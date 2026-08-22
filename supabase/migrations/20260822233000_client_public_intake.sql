alter table public.gestao_clients
  add column if not exists intake_token uuid not null default gen_random_uuid();

create unique index if not exists gestao_clients_intake_token_key
  on public.gestao_clients(intake_token);

create or replace function public.submit_client_intake_form(
  p_token uuid,
  p_company text,
  p_responsible_name text,
  p_contract_company_data text,
  p_email text,
  p_phone text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
  profile_note jsonb;
  existing_profile jsonb := '{}'::jsonb;
begin
  if coalesce(trim(p_company), '') = '' or coalesce(trim(p_responsible_name), '') = '' or
     coalesce(trim(p_contract_company_data), '') = '' or coalesce(trim(p_email), '') = '' or
     coalesce(trim(p_phone), '') = '' then
    return false;
  end if;

  select coalesce((
    select (item->>'text')::jsonb
    from jsonb_array_elements(coalesce(g.notes, '[]'::jsonb)) item
    where item->>'id' = '__client_profile__'
    limit 1
  ), '{}'::jsonb)
  into existing_profile
  from public.gestao_clients g
  where g.intake_token = p_token;

  if not found then return false; end if;

  profile_note := jsonb_build_object(
    'id', '__client_profile__',
    'date', '',
    'text', (existing_profile || jsonb_build_object(
      'responsibleName', trim(p_responsible_name),
      'contractCompanyData', trim(p_contract_company_data),
      'email', trim(p_email),
      'phone', trim(p_phone)
    ))::text
  );

  update public.gestao_clients g
  set company = trim(p_company),
      notes = coalesce((
        select jsonb_agg(item)
        from jsonb_array_elements(coalesce(g.notes, '[]'::jsonb)) item
        where item->>'id' <> '__client_profile__'
      ), '[]'::jsonb) || jsonb_build_array(profile_note)
  where g.intake_token = p_token;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.submit_client_intake_form(uuid, text, text, text, text, text) from public;
grant execute on function public.submit_client_intake_form(uuid, text, text, text, text, text) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');
