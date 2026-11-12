BEGIN;
CREATE TABLE public.client_meta_balance_alerts(client_id uuid PRIMARY KEY REFERENCES public.gestao_clients(id) ON DELETE CASCADE, threshold numeric NOT NULL DEFAULT 50 CHECK(threshold>0 AND threshold<=1000000), enabled boolean NOT NULL DEFAULT true);
INSERT INTO public.client_meta_balance_alerts(client_id) SELECT id FROM public.gestao_clients;
CREATE TABLE public.meta_balance_alert_destination(id boolean PRIMARY KEY DEFAULT true CHECK(id), group_id text NOT NULL CHECK(group_id ~ '^[0-9-]+@g.us$'), group_name text NOT NULL, channel text NOT NULL CHECK(channel IN ('primary','backup')));
CREATE TABLE public.meta_balance_alert_state(client_id uuid PRIMARY KEY REFERENCES public.gestao_clients(id) ON DELETE CASCADE, account_id text NOT NULL, episode uuid, available numeric, checked_at timestamptz, delivery_status text, last_error text);
ALTER TABLE public.client_meta_balance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_balance_alert_destination ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_balance_alert_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_meta_balance_alerts,public.meta_balance_alert_destination,public.meta_balance_alert_state FROM anon,authenticated;
GRANT ALL ON public.client_meta_balance_alerts,public.meta_balance_alert_destination,public.meta_balance_alert_state TO service_role;
CREATE FUNCTION public.claim_meta_balance_episode(p_client uuid,p_account text,p_available numeric,p_threshold numeric)
RETURNS uuid LANGUAGE plpgsql SET search_path='' AS $$
DECLARE rowstate public.meta_balance_alert_state; result uuid;
BEGIN
 INSERT INTO public.meta_balance_alert_state(client_id,account_id) VALUES(p_client,p_account) ON CONFLICT DO NOTHING;
 SELECT * INTO rowstate FROM public.meta_balance_alert_state WHERE client_id=p_client FOR UPDATE;
 IF p_available>=p_threshold THEN
  UPDATE public.meta_balance_alert_state SET account_id=p_account,episode=NULL,available=p_available,checked_at=now(),delivery_status=NULL,last_error=NULL WHERE client_id=p_client;
  RETURN NULL;
 END IF;
 result=CASE WHEN rowstate.account_id<>p_account OR rowstate.episode IS NULL THEN gen_random_uuid() ELSE rowstate.episode END;
 UPDATE public.meta_balance_alert_state SET account_id=p_account,episode=result,available=p_available,checked_at=now(),delivery_status=CASE WHEN episode IS DISTINCT FROM result THEN 'pending' ELSE delivery_status END,last_error=CASE WHEN episode IS DISTINCT FROM result THEN NULL ELSE last_error END WHERE client_id=p_client;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.claim_meta_balance_episode(uuid,text,numeric,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_meta_balance_episode(uuid,text,numeric,numeric) TO service_role;
SELECT pg_notify('pgrst','reload schema');
COMMIT;
