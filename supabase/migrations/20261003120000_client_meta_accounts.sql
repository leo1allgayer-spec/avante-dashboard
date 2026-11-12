create table if not exists public.client_meta_accounts (
  client_id uuid primary key references public.gestao_clients(id) on delete cascade,
  account_id text not null unique check (account_id ~ '^act_[0-9]+$'),
  account_name text not null,
  currency text not null,
  timezone_name text,
  connected_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.client_meta_accounts enable row level security;
revoke all on public.client_meta_accounts from anon, authenticated;
grant all on public.client_meta_accounts to service_role;
notify pgrst, 'reload schema';
