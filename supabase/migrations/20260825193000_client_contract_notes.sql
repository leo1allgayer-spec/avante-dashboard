create table if not exists public.client_contract_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.gestao_clients(id) on delete set null,
  document_key text not null,
  client_data jsonb not null default '{}'::jsonb,
  team_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists client_contract_notes_document_key_key
  on public.client_contract_notes(document_key);

alter table public.client_contract_notes enable row level security;
drop policy if exists "authenticated manage client contract notes" on public.client_contract_notes;
create policy "authenticated manage client contract notes"
  on public.client_contract_notes for all to authenticated
  using (true) with check (true);

create or replace function public.submit_client_contract_notes(p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_document text;
  saved_id uuid;
begin
  normalized_document := regexp_replace(coalesce(nullif(p_data->>'cnpj', ''), p_data->>'cpf', ''), '\D', '', 'g');
  if normalized_document = '' or coalesce(trim(p_data->>'responsibleName'), '') = '' then
    raise exception 'Documento e nome do responsável são obrigatórios';
  end if;

  insert into public.client_contract_notes(document_key, client_data, submitted_at, updated_at)
  values (normalized_document, p_data, now(), now())
  on conflict (document_key) do update
    set client_data = excluded.client_data,
        submitted_at = now(),
        updated_at = now()
  returning id into saved_id;
  return saved_id;
end;
$$;

revoke all on function public.submit_client_contract_notes(jsonb) from public;
grant execute on function public.submit_client_contract_notes(jsonb) to anon, authenticated;
select pg_notify('pgrst', 'reload schema');
