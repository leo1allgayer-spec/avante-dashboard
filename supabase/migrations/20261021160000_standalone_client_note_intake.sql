begin;
alter table public.client_contract_notes add column if not exists form_token uuid not null default gen_random_uuid();
create unique index if not exists client_contract_notes_form_token_key on public.client_contract_notes(form_token);
create or replace function public.submit_client_note_intake(p_data jsonb,p_token uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare note_id uuid; document text; allowed jsonb; kind text;
begin
 if p_token is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Link de cadastro inválido'; end if;
 select id into note_id from public.client_contract_notes where form_token=p_token for update;
 if note_id is null then raise exception 'Link de cadastro inválido'; end if;
 kind:=case when p_data->>'personType'='PF' then 'PF' else 'PJ' end;
 document:=regexp_replace(coalesce(case when kind='PJ' then p_data->>'cnpj' else p_data->>'cpf' end,''),'\D','','g');
 if document='' or coalesce(trim(p_data->>'responsibleName'),'')='' then raise exception 'Documento e nome do responsável são obrigatórios'; end if;
 if exists(select 1 from public.client_contract_notes where document_key=document and id<>note_id) then raise exception 'Documento já cadastrado em outra ficha. Entre em contato com a equipe.'; end if;
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into allowed from jsonb_each(p_data)
 where key in ('personType','responsibleName','nationality','maritalStatus','profession','cpf','rg','rgIssuer','companyName','tradeName','cnpj','stateRegistration','address','email','phone','photoDocumentName') and jsonb_typeof(value)='string';
 update public.client_contract_notes set document_key=document,client_data=client_data||allowed,submitted_at=now(),updated_at=now() where id=note_id;
 return note_id;
end $$;
revoke all on function public.submit_client_note_intake(jsonb,uuid) from public;
grant execute on function public.submit_client_note_intake(jsonb,uuid) to anon,authenticated;
select pg_notify('pgrst','reload schema');
commit;
