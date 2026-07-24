create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  company text,
  instagram text,
  manager text not null default '',
  status text not null default 'Ativo',
  payment_status text not null default 'a receber',
  monthly_budget numeric not null default 0,
  payment_date integer not null default 1,
  commission_value numeric not null default 0,
  contract_value numeric not null default 0,
  last_balance_date date,
  balance_note text,
  last_report_date date,
  report_day text,
  last_account_update date,
  start_date date,
  next_charge_date date,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.clients
  add column if not exists user_id uuid,
  add column if not exists name text,
  add column if not exists nome text,
  add column if not exists company text,
  add column if not exists instagram text,
  add column if not exists manager text not null default '',
  add column if not exists consultor text,
  add column if not exists status text not null default 'Ativo',
  add column if not exists valor numeric default 0,
  add column if not exists leads integer default 0,
  add column if not exists mql integer default 0,
  add column if not exists ultima_atividade date,
  add column if not exists payment_status text not null default 'a receber',
  add column if not exists monthly_budget numeric not null default 0,
  add column if not exists payment_date integer not null default 1,
  add column if not exists commission_value numeric not null default 0,
  add column if not exists contract_value numeric not null default 0,
  add column if not exists last_balance_date date,
  add column if not exists balance_note text,
  add column if not exists last_report_date date,
  add column if not exists report_day text,
  add column if not exists last_account_update date,
  add column if not exists start_date date,
  add column if not exists next_charge_date date,
  add column if not exists notes jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamp with time zone not null default now(),
  add column if not exists updated_at timestamp with time zone not null default now();

alter table public.clients enable row level security;

drop policy if exists "Users can view their own clients" on public.clients;
drop policy if exists "Users can insert their own clients" on public.clients;
drop policy if exists "Users can update their own clients" on public.clients;
drop policy if exists "Users can delete their own clients" on public.clients;

create policy "Users can view their own clients"
  on public.clients for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own clients"
  on public.clients for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own clients"
  on public.clients for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own clients"
  on public.clients for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_clients_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_clients_updated_at();

select pg_notify('pgrst', 'reload schema');
