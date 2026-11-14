begin;

create or replace function public.create_client_summary(p_settings jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  client_name text;
  company_name text;
  client_instagram text;
  client_manager text;
  client_report_day text;
  today date;
  created_id uuid;
  client_notes jsonb;
begin
  if auth.uid() is null or not public.is_client_summary_user() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if lower(coalesce(auth.jwt()->>'email', '')) <> 'emanoelbull@gmail.com' then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_settings) is distinct from 'object' then
    raise exception 'Dados do cliente inválidos' using errcode = '22023';
  end if;

  client_name := trim(coalesce(p_settings->>'name', ''));
  company_name := trim(coalesce(p_settings->>'company', ''));
  client_instagram := trim(coalesce(p_settings->>'instagram', ''));
  client_manager := trim(coalesce(p_settings->>'manager', ''));
  client_report_day := coalesce(p_settings->>'reportDay', 'Segunda-feira');
  if client_name = '' or client_manager not in ('Leonardo', 'Lucas', 'Nicolas', 'Emanoel', 'Kauan', 'Hiago') or
    client_report_day not in ('Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo') then
    raise exception 'Informe nome, gestor e dia do relatório válidos' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.gestao_clients g
    where lower(trim(g.name)) = lower(client_name)
      and coalesce((select n->>'text' from jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n where n->>'id'='__client_area__' limit 1), 'meta_ads') = 'meta_ads'
  ) then
    raise exception 'Já existe um cliente com esse nome. Confira o cadastro existente para evitar duplicidade.';
  end if;

  today := (now() at time zone 'America/Sao_Paulo')::date;
  client_notes := jsonb_build_array(
    jsonb_build_object('id','__client_area__','date','','text','meta_ads'),
    jsonb_build_object('id','__contract_config__','date','','text',jsonb_build_object('type','MRR','months',1,'monthly',0,'settled',false,'received',0)::text),
    jsonb_build_object('id','__client_profile__','date','','text',jsonb_build_object('level','nao_definido')::text)
  );

  insert into public.gestao_clients (
    user_id,name,company,instagram,manager,status,payment_status,monthly_budget,payment_date,
    commission_value,contract_value,last_balance_date,balance_note,last_report_date,report_day,
    last_account_update,start_date,notes
  ) values (
    auth.uid(),client_name,company_name,client_instagram,client_manager,'Ativo','a receber',0,1,
    0,0,today,'',today,client_report_day,today,today,client_notes
  ) returning id into created_id;

  return created_id;
end;
$$;

revoke all on function public.create_client_summary(jsonb) from public, anon;
grant execute on function public.create_client_summary(jsonb) to authenticated;
select pg_notify('pgrst','reload schema');

commit;
