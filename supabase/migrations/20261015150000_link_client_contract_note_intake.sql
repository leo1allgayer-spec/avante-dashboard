begin;
-- Link the confirmed submission without changing personal or contract information.
update public.client_contract_notes set client_id='75f7f573-4e78-4094-b109-0331955571d6'
where id='0ba8dca1-7e3f-4307-a0b1-5efe4fd3cc71' and client_id is null;
create or replace function public.submit_linked_client_contract_notes(p_data jsonb, p_token uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare document text; source_id uuid; saved uuid;
begin
 if p_token is not null then
  select id into source_id from public.gestao_clients where intake_token=p_token;
  if source_id is null then raise exception 'Link de cadastro inválido'; end if;
 end if;
 document:=regexp_replace(coalesce(nullif(p_data->>'cnpj',''),p_data->>'cpf',''),'\D','','g');
 if document='' or coalesce(trim(p_data->>'responsibleName'),'')='' then raise exception 'Documento e nome do responsável são obrigatórios'; end if;
 if exists(select 1 from public.client_contract_notes where document_key=document and client_id is not null and source_id is not null and client_id<>source_id) then
  raise exception 'Documento já vinculado a outro cliente. Entre em contato com a equipe.';
 end if;
 insert into public.client_contract_notes(document_key,client_id,client_data,submitted_at,updated_at)
 values(document,source_id,p_data,now(),now())
 on conflict(document_key) do update set client_data=excluded.client_data,
 client_id=coalesce(excluded.client_id,public.client_contract_notes.client_id),submitted_at=now(),updated_at=now()
 returning id into saved;
 return saved;
end $$;
revoke all on function public.submit_linked_client_contract_notes(jsonb,uuid) from public;
grant execute on function public.submit_linked_client_contract_notes(jsonb,uuid) to anon,authenticated;
select pg_notify('pgrst','reload schema');
commit;
