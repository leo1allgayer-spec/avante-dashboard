create table if not exists public.recorrencias_manuais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grupo_id uuid not null,
  tipo text not null check (tipo in ('crm', 'sites')),
  cliente text not null,
  servico text not null,
  parcela_numero integer not null check (parcela_numero > 0),
  parcelas_total integer not null check (parcelas_total > 0),
  vencimento date not null,
  valor numeric not null check (valor > 0),
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  pago_em date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grupo_id, parcela_numero)
);

alter table public.recorrencias_manuais enable row level security;
drop policy if exists "authenticated manage manual recurrences" on public.recorrencias_manuais;
create policy "authenticated manage manual recurrences" on public.recorrencias_manuais
for all to authenticated
using (
  auth.uid() = user_id or auth.uid() in (
    '7aefc8ff-cc00-4704-9a07-be45791fb539'::uuid,
    '4b2d0f41-d422-4b69-8a7b-419890dbcfe7'::uuid,
    'a4178654-ba1c-4ab9-aae6-efcd7444114d'::uuid
  )
)
with check (
  auth.uid() = user_id or auth.uid() in (
    '7aefc8ff-cc00-4704-9a07-be45791fb539'::uuid,
    '4b2d0f41-d422-4b69-8a7b-419890dbcfe7'::uuid,
    'a4178654-ba1c-4ab9-aae6-efcd7444114d'::uuid
  )
);

create index if not exists recorrencias_manuais_vencimento_idx
  on public.recorrencias_manuais (vencimento, status);

select pg_notify('pgrst', 'reload schema');
