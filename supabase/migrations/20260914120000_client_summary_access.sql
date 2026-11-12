BEGIN;
CREATE OR REPLACE FUNCTION public.is_client_summary_user()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(auth.jwt()->'app_metadata'->>'clients_access', '') = 'summary'
    OR lower(coalesce(auth.jwt()->>'email', '')) = 'emanoelbull@gmail.com';
$$;
REVOKE ALL ON FUNCTION public.is_client_summary_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_client_summary_user() TO authenticated;

DO $$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['gestao_clients','clients','client_contract_notes','client_reports','user_permissions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format('CREATE POLICY client_summary_restriction ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_client_summary_user()) WITH CHECK (NOT public.is_client_summary_user())', target);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.list_client_summaries()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_client_summary_user() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',g.id,'name',g.name,'instagram',g.instagram,'manager',g.manager,'status',g.status,
    'monthly_budget',g.monthly_budget,'last_balance_date',g.last_balance_date,
    'last_account_update',g.last_account_update,'report_day',g.report_day
  ) ORDER BY g.name) FROM public.gestao_clients g
  WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n
    WHERE n->>'id'='__client_area__' AND n->>'text'='google_ads')), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.update_client_summary(p_id uuid, p_changes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_client_summary_user() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'object' THEN
    RAISE EXCEPTION 'Alteracao invalida' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_changes) k WHERE k NOT IN
    ('name','instagram','manager','status','monthly_budget','last_balance_date','last_account_update','report_day')) THEN
    RAISE EXCEPTION 'Campo nao autorizado' USING ERRCODE = '42501';
  END IF;
  IF (p_changes ? 'name' AND coalesce(trim(p_changes->>'name'),'')='')
    OR (p_changes ? 'manager' AND coalesce(trim(p_changes->>'manager'),'')='')
    OR (p_changes ? 'status' AND coalesce(p_changes->>'status','') NOT IN ('Ativo','Pausado'))
    OR (p_changes ? 'monthly_budget' AND (jsonb_typeof(p_changes->'monthly_budget') <> 'number' OR (p_changes->>'monthly_budget')::numeric < 0))
    OR (p_changes ? 'report_day' AND coalesce(p_changes->>'report_day','') NOT IN ('Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo')) THEN
    RAISE EXCEPTION 'Valor invalido' USING ERRCODE = '22023';
  END IF;
  UPDATE public.gestao_clients g SET
    name = CASE WHEN p_changes ? 'name' THEN trim(p_changes->>'name') ELSE g.name END,
    instagram = CASE WHEN p_changes ? 'instagram' THEN p_changes->>'instagram' ELSE g.instagram END,
    manager = CASE WHEN p_changes ? 'manager' THEN trim(p_changes->>'manager') ELSE g.manager END,
    status = CASE WHEN p_changes ? 'status' THEN p_changes->>'status' ELSE g.status END,
    monthly_budget = CASE WHEN p_changes ? 'monthly_budget' THEN (p_changes->>'monthly_budget')::numeric ELSE g.monthly_budget END,
    last_balance_date = CASE WHEN p_changes ? 'last_balance_date' THEN nullif(p_changes->>'last_balance_date','')::date ELSE g.last_balance_date END,
    last_account_update = CASE WHEN p_changes ? 'last_account_update' THEN nullif(p_changes->>'last_account_update','')::date ELSE g.last_account_update END,
    report_day = CASE WHEN p_changes ? 'report_day' THEN p_changes->>'report_day' ELSE g.report_day END
  WHERE g.id=p_id AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n
    WHERE n->>'id'='__client_area__' AND n->>'text'='google_ads');
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente indisponivel' USING ERRCODE = '42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.list_client_summaries() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_client_summary(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_client_summaries() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_summary(uuid,jsonb) TO authenticated;
COMMIT;
