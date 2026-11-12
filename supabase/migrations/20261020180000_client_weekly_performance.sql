begin;
create table public.client_weekly_performance(
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.gestao_clients(id) on delete cascade,
 week_start date not null check(extract(isodow from week_start)=1),
 spend numeric(16,2) check(spend>=0),messages integer check(messages>=0),cost_per_message numeric(16,4) check(cost_per_message>=0),roas numeric(16,4) check(roas>=0),
 creative_names text[], report_id uuid references public.client_reports(id) on delete set null,notes text not null default '' check(length(notes)<=1000),
 updated_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(client_id,week_start)
);
alter table public.client_weekly_performance enable row level security;
revoke all on public.client_weekly_performance from anon;
grant select,insert,update,delete on public.client_weekly_performance to authenticated;
create policy client_weekly_editors on public.client_weekly_performance for all to authenticated
using(lower(coalesce(auth.jwt()->>'email','')) in ('digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com','emanoelbull@gmail.com'))
with check(lower(coalesce(auth.jwt()->>'email','')) in ('digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com','emanoelbull@gmail.com') and (report_id is null or exists(select 1 from public.client_reports r where r.id=report_id and r.client_id=client_weekly_performance.client_id)));
commit;
