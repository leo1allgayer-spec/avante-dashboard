begin;
create or replace function public.can_manage_client_feedback()
returns boolean language sql stable security definer set search_path=public,auth as $$
  select auth.uid() is not null and lower(coalesce(auth.jwt()->>'email','')) in (
    'abreuconsultoriaempresarial@gmail.com','nicolaspatzlaff02@gmail.com',
    'leonardowebster.ja@gmail.com','digitalavante3@gmail.com','lucadsilva666@gmail.com'
  );
$$;
create table public.client_feedback_invites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  client_id uuid references public.gestao_clients(id) on delete set null,
  client_key text not null,
  client_name text not null,
  manager text not null default '',
  month date not null check (extract(day from month)=1),
  expires_at timestamptz not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique(client_key,month)
);
create table public.client_feedback_responses (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null unique references public.client_feedback_invites(id),
  nps integer not null check(nps between 0 and 10),
  atendimento integer check(atendimento between 1 and 5),
  comunicacao integer check(comunicacao between 1 and 5),
  resultados integer check(resultados between 1 and 5),
  prazos integer check(prazos between 1 and 5),
  reason text not null check(char_length(reason) between 3 and 2000),
  suggestion text not null default '' check(char_length(suggestion)<=2000),
  respondent text not null default '' check(char_length(respondent)<=120),
  created_at timestamptz not null default now()
);
alter table public.client_feedback_invites enable row level security;
alter table public.client_feedback_responses enable row level security;
grant select on public.client_feedback_invites,public.client_feedback_responses to authenticated;
create policy "Staff read feedback invitations" on public.client_feedback_invites for select to authenticated using(public.can_manage_client_feedback());
create policy "Staff read client feedback" on public.client_feedback_responses for select to authenticated using(public.can_manage_client_feedback());

create or replace function public.create_client_feedback_invite(p_client uuid,p_month date)
returns public.client_feedback_invites language plpgsql security definer set search_path=public,auth as $$
declare c public.gestao_clients; result public.client_feedback_invites; k text; contract_type text;
begin
  if not public.can_manage_client_feedback() then raise exception 'Sem permissão para criar pesquisas'; end if;
  if p_month is null or extract(day from p_month)<>1 or p_month < date_trunc('month',now() at time zone 'America/Sao_Paulo')::date then raise exception 'Selecione o mês atual ou futuro'; end if;
  select * into c from public.gestao_clients where id=p_client;
  if not found or c.status<>'Ativo' then raise exception 'O cliente precisa estar ativo'; end if;
  select coalesce((note->>'text')::jsonb->>'type','MRR') into contract_type
    from jsonb_array_elements(coalesce(c.notes::jsonb,'[]'::jsonb)) note where note->>'id'='__contract_config__' limit 1;
  if coalesce(contract_type,'MRR')<>'MRR' then raise exception 'Esta pesquisa é para clientes recorrentes'; end if;
  k:=translate(lower(regexp_replace(trim(c.name),'^[0-9]{1,3}[.)-]?[[:space:]]+','','')),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc');
  k:=regexp_replace(regexp_replace(k,'\mcosmeticos\M','cosmetico','g'),'[^a-z0-9]','','g');
  if k='' then raise exception 'Nome de cliente inválido'; end if;
  insert into public.client_feedback_invites(client_id,client_key,client_name,manager,month,expires_at,created_by)
    values(c.id,k,c.name,coalesce(c.manager,''),p_month,((p_month+interval '2 months')::timestamp at time zone 'America/Sao_Paulo'),auth.uid())
    on conflict(client_key,month) do nothing;
  select * into result from public.client_feedback_invites where client_key=k and month=p_month;
  return result;
end;
$$;

create or replace function public.get_client_feedback_form(p_token uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare i public.client_feedback_invites;
begin
  select * into i from public.client_feedback_invites where token=p_token;
  if not found then return jsonb_build_object('error','Link de pesquisa inválido'); end if;
  return jsonb_build_object('clientName',i.client_name,'month',i.month,'answered',exists(select 1 from public.client_feedback_responses where invite_id=i.id),'expired',now()>=i.expires_at);
end;
$$;

create or replace function public.submit_client_feedback(p_token uuid,p_nps integer,p_ratings jsonb,p_reason text,p_suggestion text default '',p_respondent text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare i public.client_feedback_invites; field text;
begin
  select * into i from public.client_feedback_invites where token=p_token for update;
  if not found then raise exception 'Link inválido'; end if;
  if exists(select 1 from public.client_feedback_responses where invite_id=i.id) then return jsonb_build_object('alreadyAnswered',true); end if;
  if now()>=i.expires_at then raise exception 'Esta pesquisa expirou'; end if;
  if p_nps is null or p_nps not between 0 and 10 then raise exception 'Informe a nota de indicação de 0 a 10'; end if;
  foreach field in array array['atendimento','comunicacao','resultados','prazos'] loop
    if p_ratings is null or not (p_ratings ? field) or (jsonb_typeof(p_ratings->field)<>'null' and (jsonb_typeof(p_ratings->field)<>'number' or (p_ratings->>field)::numeric not between 1 and 5 or (p_ratings->>field)::numeric<>trunc((p_ratings->>field)::numeric))) then raise exception 'Avaliação de área inválida'; end if;
  end loop;
  insert into public.client_feedback_responses(invite_id,nps,atendimento,comunicacao,resultados,prazos,reason,suggestion,respondent)
    values(i.id,p_nps,(p_ratings->>'atendimento')::integer,(p_ratings->>'comunicacao')::integer,(p_ratings->>'resultados')::integer,(p_ratings->>'prazos')::integer,trim(p_reason),coalesce(trim(p_suggestion),''),coalesce(trim(p_respondent),''));
  return jsonb_build_object('success',true);
end;
$$;
revoke all on function public.create_client_feedback_invite(uuid,date) from public,anon;
grant execute on function public.create_client_feedback_invite(uuid,date) to authenticated;
revoke all on function public.get_client_feedback_form(uuid),public.submit_client_feedback(uuid,integer,jsonb,text,text,text) from public;
grant execute on function public.get_client_feedback_form(uuid),public.submit_client_feedback(uuid,integer,jsonb,text,text,text) to anon,authenticated;
select pg_notify('pgrst','reload schema');
commit;
