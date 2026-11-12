begin;
create or replace function public.create_gestao_client_from_note(p_note_id uuid,p_settings jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.client_contract_notes; created_client_id uuid; client_name text; company_name text; area text; manager text;
 value numeric; budget numeric; commission numeric; months integer; pay_day integer; kind text; monthly numeric; notes jsonb; today date;
begin
 if auth.uid() is null or lower(coalesce(auth.jwt()->>'email','')) not in ('abreuconsultoriaempresarial@gmail.com','nicolaspatzlaff02@gmail.com','leonardowebster.ja@gmail.com','digitalavante3@gmail.com','lucadsilva666@gmail.com') then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into r from public.client_contract_notes where id=p_note_id for update;
 if not found then raise exception 'Ficha não encontrada';end if;
 if r.client_id is not null then return r.client_id;end if;
 if coalesce(trim(r.client_data->>'responsibleName'),'')='' or regexp_replace(coalesce(nullif(r.client_data->>'cnpj',''),r.client_data->>'cpf',''),'\D','','g')='' then raise exception 'Preencha os dados do responsável e documento na ficha antes de criar o cliente';end if;
 if jsonb_typeof(p_settings) is distinct from 'object' then raise exception 'Informe os dados da Gestão de Clientes';end if;
 client_name:=trim(coalesce(p_settings->>'name',''));company_name:=trim(coalesce(p_settings->>'company',''));
 area:=coalesce(p_settings->>'area','meta_ads');manager:=trim(coalesce(p_settings->>'manager',''));
 if client_name='' or manager='' or area not in ('meta_ads','google_ads') then raise exception 'Informe nome, gestor e área válidos';end if;
 value:=coalesce((p_settings->>'contractValue')::numeric,0);budget:=coalesce((p_settings->>'monthlyBudget')::numeric,0);commission:=coalesce((p_settings->>'commissionValue')::numeric,0);
 months:=coalesce((p_settings->>'contractMonths')::integer,1);pay_day:=coalesce((p_settings->>'paymentDate')::integer,1);kind:=coalesce(p_settings->>'contractType','MRR');
 if value<0 or budget<0 or commission<0 or months<1 or pay_day<1 or pay_day>31 or kind not in ('MRR','TCV') then raise exception 'Confira os valores do contrato, duração e dia do pagamento';end if;
 if exists(select 1 from public.gestao_clients g where lower(trim(g.name))=lower(client_name) and coalesce((select n->>'text' from jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n where n->>'id'='__client_area__' limit 1),'meta_ads')=area) then raise exception 'Já existe um cliente com esse nome nessa área. Confira o cadastro existente para evitar duplicidade.';end if;
 today:=(now() at time zone 'America/Sao_Paulo')::date;monthly:=case when kind='TCV' then value/months else value end;
 notes:=jsonb_build_array(
 jsonb_build_object('id','__client_area__','date','','text',area),
 jsonb_build_object('id','__contract_config__','date','','text',jsonb_build_object('type',kind,'months',months,'monthly',monthly,'settled',false,'received',0)::text),
 jsonb_build_object('id','__client_profile__','date','','text',jsonb_build_object('responsibleName',coalesce(r.client_data->>'responsibleName',''),'email',coalesce(r.client_data->>'email',''),'phone',coalesce(r.client_data->>'phone',''),'contractCompanyData',concat_ws(' · ',nullif(r.client_data->>'cnpj',''),nullif(r.client_data->>'address','')),'servicesDescription',coalesce(r.team_data->>'contractObject',''),'paymentMethod',coalesce(r.team_data->>'paymentMethod',''))::text));
 insert into public.gestao_clients(user_id,name,company,instagram,manager,status,payment_status,monthly_budget,payment_date,commission_value,contract_value,last_balance_date,balance_note,last_report_date,report_day,last_account_update,start_date,notes)
 values(auth.uid(),client_name,company_name,coalesce(p_settings->>'instagram',''),manager,'Ativo','a receber',budget,pay_day,commission,value,today,'',today,coalesce(p_settings->>'reportDay','Segunda-feira'),today,today,notes)
 returning id into created_client_id;
 update public.client_contract_notes set client_id=created_client_id,updated_at=now() where id=p_note_id;
 return created_client_id;
end $$;
revoke all on function public.create_gestao_client_from_note(uuid,jsonb) from public;
grant execute on function public.create_gestao_client_from_note(uuid,jsonb) to authenticated;
select pg_notify('pgrst','reload schema');
commit;
