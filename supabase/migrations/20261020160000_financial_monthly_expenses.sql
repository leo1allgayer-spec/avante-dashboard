begin;
create table if not exists public.financial_monthly_expenses (
 id uuid primary key default gen_random_uuid(),
 month date not null check (extract(day from month)=1),
 category text not null check(category in ('fixed','variable','investment','taxes','sales_commission','operational_commission')),
 amount numeric(14,2) check(amount>=0), notes text not null default '' check(length(notes)<=500),
 updated_by uuid references auth.users(id), created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(month,category)
);
alter table public.financial_monthly_expenses enable row level security;
revoke all on public.financial_monthly_expenses from anon;
grant select,insert,update,delete on public.financial_monthly_expenses to authenticated;
create policy financial_expenses_managers on public.financial_monthly_expenses for all to authenticated
using(lower(coalesce(auth.jwt()->>'email','')) in ('abreuconsultoriaempresarial@gmail.com','nicolaspatzlaff02@gmail.com','leonardowebster.ja@gmail.com','digitalavante3@gmail.com','lucadsilva666@gmail.com'))
with check(lower(coalesce(auth.jwt()->>'email','')) in ('abreuconsultoriaempresarial@gmail.com','nicolaspatzlaff02@gmail.com','leonardowebster.ja@gmail.com','digitalavante3@gmail.com','lucadsilva666@gmail.com'));
commit;
