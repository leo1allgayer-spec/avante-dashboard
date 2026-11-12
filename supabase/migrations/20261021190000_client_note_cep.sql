begin;
do $$declare definition text; updated text; function_name text;begin
 foreach function_name in array array['public.submit_client_note_intake(jsonb,uuid)','public.submit_linked_client_contract_notes(jsonb,uuid)'] loop
  select pg_get_functiondef(function_name::regprocedure) into definition;
  if function_name like '%submit_client_note_intake%' and position('''cep''' in definition)=0 then
   updated:=replace(definition,'''address'',''email''','''address'',''cep'',''email''');
   if updated=definition then raise exception 'Cannot locate client intake field allowlist';end if;
   definition:=updated;
  end if;
  if position('Informe um CEP com 8 dígitos' in definition)=0 then
   definition:=regexp_replace(definition,'\mbegin\M',$code$begin
    if p_data ? 'cep' and coalesce(p_data->>'cep','')<>'' and length(regexp_replace(p_data->>'cep','[^0-9]','','g'))<>8 then raise exception 'Informe um CEP com 8 dígitos';end if;
   $code$,'i');
  end if;
  execute definition;
 end loop;
 select pg_get_functiondef('public.create_gestao_client_from_note(uuid,jsonb)'::regprocedure) into definition;
 if position('CEP: ' in definition)=0 then
  updated:=replace(definition,$old$nullif(r.client_data->>'address',''))$old$,$new$nullif(r.client_data->>'address',''),nullif('CEP: '||coalesce(r.client_data->>'cep',''),'CEP: '))$new$);
  if updated=definition then raise exception 'Cannot locate client address mapping';end if;
  execute updated;
 end if;
end $$;
select pg_notify('pgrst','reload schema');
commit;
