BEGIN;
-- Expose only these two profile attributes, never the private notes/profile.
CREATE OR REPLACE FUNCTION public.list_client_summaries()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_client_summary_user() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',g.id,'name',g.name,'instagram',g.instagram,'manager',g.manager,'status',g.status,
    'monthly_budget',g.monthly_budget,'last_balance_date',g.last_balance_date,
    'last_report_date',g.last_report_date,'report_day',g.report_day,
    'satisfaction',coalesce(profile.value->>'satisfaction','nao_avaliado'),
    'contract_renewal',coalesce(profile.value->>'contractRenewal','nao_definido')
  ) ORDER BY g.name) FROM public.gestao_clients g
  LEFT JOIN LATERAL (
    SELECT (n->>'text')::jsonb AS value
    FROM jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n
    WHERE n->>'id'='__client_profile__' LIMIT 1
  ) profile ON true
  WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n
    WHERE n->>'id'='__client_area__' AND n->>'text'='google_ads')), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_client_summaries() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_client_summaries() TO authenticated;
COMMIT;
