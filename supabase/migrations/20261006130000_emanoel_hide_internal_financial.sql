BEGIN;
DROP POLICY client_editor_read ON public.gestao_clients;
DROP POLICY client_editor_update ON public.gestao_clients;
DROP POLICY client_summary_restriction ON public.gestao_clients;
CREATE POLICY client_summary_restriction ON public.gestao_clients AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_client_summary_user()) WITH CHECK (NOT public.is_client_summary_user());
CREATE OR REPLACE FUNCTION public.client_editor_safe_notes(p_notes jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(CASE WHEN n->>'id'='__client_profile__' THEN jsonb_set(n,'{text}',to_jsonb(((n->>'text')::jsonb - ARRAY['paymentMethod','dueDate'])::text)) ELSE n END),'[]'::jsonb)
 FROM jsonb_array_elements(coalesce(p_notes,'[]'::jsonb)) n WHERE n->>'id'<>'__contract_config__';
$$;
REVOKE ALL ON FUNCTION public.client_editor_safe_notes(jsonb) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.list_client_editor_profiles()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_client_profile_editor() THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg((to_jsonb(g) - ARRAY['contract_value','commission_value','payment_date','payment_status','next_charge_date','intake_token']) || jsonb_build_object('notes',public.client_editor_safe_notes(g.notes))) FROM public.gestao_clients g WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n WHERE n->>'id'='__client_area__' AND n->>'text'='google_ads')),'[]'::jsonb);
END $$;
CREATE OR REPLACE FUNCTION public.update_client_editor_profile(p_id uuid,p_changes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE oldrow public.gestao_clients; newrow public.gestao_clients; merged_notes jsonb; oldprofile jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_client_profile_editor() THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
 IF p_changes IS NULL OR jsonb_typeof(p_changes)<>'object' OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_changes) k WHERE k NOT IN ('name','company','instagram','manager','status','monthly_budget','last_balance_date','balance_note','last_report_date','report_day','last_account_update','start_date','notes')) THEN RAISE EXCEPTION 'Campo nao autorizado' USING ERRCODE='42501'; END IF;
 SELECT * INTO oldrow FROM public.gestao_clients WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(oldrow.notes,'[]'::jsonb)) n WHERE n->>'id'='__client_area__' AND n->>'text'='google_ads') THEN RAISE EXCEPTION 'Cliente indisponivel' USING ERRCODE='42501'; END IF;
 IF p_changes ? 'notes' THEN
  SELECT (n->>'text')::jsonb INTO oldprofile FROM jsonb_array_elements(coalesce(oldrow.notes,'[]'::jsonb)) n WHERE n->>'id'='__client_profile__';
  SELECT coalesce(jsonb_agg(CASE WHEN n->>'id'='__client_profile__' THEN jsonb_set(n,'{text}',to_jsonb((((n->>'text')::jsonb - ARRAY['paymentMethod','dueDate']) || (coalesce(oldprofile,'{}'::jsonb) - ARRAY['responsibleName','contractCompanyData','email','phone','servicesDescription','satisfaction','contractRenewal','contractLifecycle','contractEndDate','level']))::text)) ELSE n END),'[]'::jsonb) INTO merged_notes FROM jsonb_array_elements(p_changes->'notes') n WHERE n->>'id' NOT IN ('__contract_config__','__client_area__');
  SELECT merged_notes || coalesce(jsonb_agg(n),'[]'::jsonb) INTO merged_notes FROM jsonb_array_elements(coalesce(oldrow.notes,'[]'::jsonb)) n WHERE n->>'id' IN ('__contract_config__','__client_area__');
  p_changes=jsonb_set(p_changes,'{notes}',merged_notes);
 END IF;
 newrow=jsonb_populate_record(oldrow,p_changes);
 IF coalesce(trim(newrow.name),'')='' OR newrow.status NOT IN ('Ativo','Pausado') OR newrow.monthly_budget<0 THEN RAISE EXCEPTION 'Valor invalido' USING ERRCODE='22023'; END IF;
 UPDATE public.gestao_clients SET name=newrow.name,company=newrow.company,instagram=newrow.instagram,manager=newrow.manager,status=newrow.status,monthly_budget=newrow.monthly_budget,last_balance_date=newrow.last_balance_date,balance_note=newrow.balance_note,last_report_date=newrow.last_report_date,report_day=newrow.report_day,last_account_update=newrow.last_account_update,start_date=newrow.start_date,notes=newrow.notes WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.list_client_editor_profiles() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_client_editor_profile(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_client_editor_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_editor_profile(uuid,jsonb) TO authenticated;
SELECT pg_notify('pgrst','reload schema');
COMMIT;
