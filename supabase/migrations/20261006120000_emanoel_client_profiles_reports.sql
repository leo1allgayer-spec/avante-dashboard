BEGIN;
CREATE OR REPLACE FUNCTION public.is_client_profile_editor()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT lower(coalesce(auth.jwt()->>'email','')) = 'emanoelbull@gmail.com';
$$;
REVOKE ALL ON FUNCTION public.is_client_profile_editor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_client_profile_editor() TO authenticated;
DROP POLICY client_summary_restriction ON public.gestao_clients;
CREATE POLICY client_summary_restriction ON public.gestao_clients AS RESTRICTIVE FOR ALL TO authenticated
 USING (NOT public.is_client_summary_user() OR public.is_client_profile_editor())
 WITH CHECK (NOT public.is_client_summary_user() OR public.is_client_profile_editor());
CREATE POLICY client_editor_read ON public.gestao_clients FOR SELECT TO authenticated USING (public.is_client_profile_editor());
CREATE POLICY client_editor_update ON public.gestao_clients FOR UPDATE TO authenticated USING (public.is_client_profile_editor()) WITH CHECK (public.is_client_profile_editor());
CREATE POLICY client_editor_no_create ON public.gestao_clients AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_client_profile_editor());
CREATE POLICY client_editor_no_delete ON public.gestao_clients AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_client_profile_editor());
DROP POLICY client_summary_restriction ON public.client_reports;
CREATE POLICY client_summary_restriction ON public.client_reports AS RESTRICTIVE FOR ALL TO authenticated
 USING (NOT public.is_client_summary_user() OR public.is_client_profile_editor())
 WITH CHECK (NOT public.is_client_summary_user() OR public.is_client_profile_editor());
CREATE POLICY client_editor_reports_read ON public.client_reports FOR SELECT TO authenticated USING (public.is_client_profile_editor());
CREATE POLICY client_editor_report_files_read ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='client-reports' AND public.is_client_profile_editor() AND EXISTS (SELECT 1 FROM public.client_reports r WHERE r.file_path=name));
SELECT pg_notify('pgrst','reload schema');
COMMIT;
