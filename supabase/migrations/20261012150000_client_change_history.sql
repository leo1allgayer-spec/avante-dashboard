begin;
create table if not exists public.client_change_history (
 id uuid primary key default gen_random_uuid(), client_id uuid not null,
 client_name text not null, changed_at timestamptz not null default now(),
 actor_id uuid, actor_email text, action text not null,
 old_status text, new_status text, changed_fields text[] not null
);
create index if not exists client_change_history_client_date on public.client_change_history(client_id,changed_at desc);
alter table public.client_change_history enable row level security;
revoke all on public.client_change_history from anon,authenticated;
grant select on public.client_change_history to authenticated;
create policy client_change_history_read on public.client_change_history for select to authenticated using (
 exists(select 1 from public.gestao_clients g where g.id=client_id)
 or (public.is_client_profile_editor() and exists(select 1 from public.gestao_clients g where g.id=client_id and not exists(select 1 from jsonb_array_elements(coalesce(g.notes,'[]'::jsonb)) n where n->>'id'='__client_area__' and n->>'text'='google_ads')))
);
create or replace function public.client_stamp_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger client_stamp_updated_at before update on public.gestao_clients for each row execute function public.client_stamp_updated_at();
create or replace function public.client_capture_history() returns trigger language plpgsql security definer set search_path='' as $$
declare changed text[]; actor_email_value text;
begin
 select array_agg(key order by key) into changed from jsonb_each(to_jsonb(new)) where key<>'updated_at' and value is distinct from to_jsonb(old)->key;
 if changed is null then return new; end if;
 select email into actor_email_value from auth.users where id=auth.uid();
 insert into public.client_change_history(client_id,client_name,actor_id,actor_email,action,old_status,new_status,changed_fields)
 values(new.id,new.name,auth.uid(),actor_email_value,'update',old.status,new.status,changed);
 return new;
end $$;
revoke all on function public.client_capture_history() from public,anon,authenticated;
create trigger client_capture_history after update on public.gestao_clients for each row execute function public.client_capture_history();
select pg_notify('pgrst','reload schema');
commit;
