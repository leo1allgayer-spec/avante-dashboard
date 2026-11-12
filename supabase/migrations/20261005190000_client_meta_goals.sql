create table if not exists public.client_meta_goals (
  client_id uuid not null references public.gestao_clients(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  targets jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (client_id, month)
);
alter table public.client_meta_goals enable row level security;
revoke all on public.client_meta_goals from anon, authenticated;
grant all on public.client_meta_goals to service_role;
notify pgrst, 'reload schema';
