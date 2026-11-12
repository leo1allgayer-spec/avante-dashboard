-- Operational editors use a restricted profile RPC rather than direct client
-- table access. Match that existing Meta-client scope for the history too.
create or replace function public.client_history_editor_can_read(p_client uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.is_client_profile_editor() and exists(
  select 1 from public.gestao_clients g where g.id=p_client and not exists(
   select 1 from jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n where n->>'id'='__client_area__' and n->>'text'='google_ads'
  )
 );
$$;
revoke all on function public.client_history_editor_can_read(uuid) from public,anon;
grant execute on function public.client_history_editor_can_read(uuid) to authenticated;
alter policy client_change_history_read on public.client_change_history using (
 exists(select 1 from public.gestao_clients g where g.id=client_id)
 or public.client_history_editor_can_read(client_id)
);
