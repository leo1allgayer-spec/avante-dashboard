BEGIN;

CREATE OR REPLACE FUNCTION public.create_client_summary(p_settings jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  client_name text;
  company_name text;
  client_instagram text;
  client_manager text;
  client_report_day text;
  today date;
  created_id uuid;
  client_notes jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_client_summary_user() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF lower(coalesce(auth.jwt()->>'email', '')) <> 'emanoelbull@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_settings) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Dados do cliente inválidos' USING ERRCODE = '22023';
  END IF;

  client_name := trim(coalesce(p_settings->>'name', ''));
  company_name := trim(coalesce(p_settings->>'company', ''));
  client_instagram := trim(coalesce(p_settings->>'instagram', ''));
  client_manager := trim(coalesce(p_settings->>'manager', ''));
  client_report_day := coalesce(p_settings->>'reportDay', 'Segunda-feira');
  IF client_name = '' OR client_manager NOT IN ('Leonardo', 'Lucas', 'Nicolas') OR
    client_report_day NOT IN ('Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo') THEN
    RAISE EXCEPTION 'Informe nome, gestor e dia do relatório válidos' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.gestao_clients g
    WHERE lower(trim(g.name)) = lower(client_name)
      AND coalesce((SELECT n->>'text' FROM jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n WHERE n->>'id'='__client_area__' LIMIT 1), 'meta_ads') = 'meta_ads'
  ) THEN
    RAISE EXCEPTION 'Já existe um cliente com esse nome. Confira o cadastro existente para evitar duplicidade.';
  END IF;

  today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  client_notes := jsonb_build_array(
    jsonb_build_object('id','__client_area__','date','','text','meta_ads'),
    jsonb_build_object('id','__contract_config__','date','','text',jsonb_build_object('type','MRR','months',1,'monthly',0,'settled',false,'received',0)::text),
    jsonb_build_object('id','__client_profile__','date','','text',jsonb_build_object('level','nao_definido')::text)
  );

  INSERT INTO public.gestao_clients (
    user_id,name,company,instagram,manager,status,payment_status,monthly_budget,payment_date,
    commission_value,contract_value,last_balance_date,balance_note,last_report_date,report_day,
    last_account_update,start_date,notes
  ) VALUES (
    auth.uid(),client_name,company_name,client_instagram,client_manager,'Ativo','a receber',0,1,
    0,0,today,'',today,client_report_day,today,today,client_notes
  ) RETURNING id INTO created_id;

  RETURN created_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_client_summary(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_client_summary(jsonb) TO authenticated;
SELECT pg_notify('pgrst','reload schema');
COMMIT;
