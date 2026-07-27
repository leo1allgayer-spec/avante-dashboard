create extension if not exists "pgcrypto";

create table if not exists public.fechamentos_diarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  data date not null default current_date,
  cliente text default '',
  vendedor text default '',
  produto_servico text default '',
  status text not null default 'a receber',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.fechamentos_diarios
  add column if not exists categoria text,
  add column if not exists valor_sinal numeric not null default 0,
  add column if not exists valor_a_entrar numeric not null default 0,
  add column if not exists valor_recorrente numeric not null default 0,
  add column if not exists parcelas_total integer,
  add column if not exists valor_parcela numeric not null default 0,
  add column if not exists previsao_entrada date,
  add column if not exists observacao text,
  add column if not exists parcelas_datas jsonb not null default '[]'::jsonb;

alter table public.fechamentos_diarios
  alter column user_id drop not null,
  alter column data set default current_date,
  alter column cliente set default '',
  alter column vendedor set default '',
  alter column produto_servico set default '',
  alter column cliente drop not null,
  alter column vendedor drop not null,
  alter column produto_servico drop not null,
  alter column valor_sinal set default 0,
  alter column valor_a_entrar set default 0,
  alter column valor_recorrente set default 0,
  alter column valor_parcela set default 0,
  alter column parcelas_datas set default '[]'::jsonb;

update public.fechamentos_diarios
set categoria = coalesce(nullif(categoria, ''), nullif(produto_servico, ''), 'Sem categoria')
where categoria is null or categoria = '';

alter table public.fechamentos_diarios enable row level security;

drop policy if exists "Users can view their own daily closings" on public.fechamentos_diarios;
drop policy if exists "Users can insert their own daily closings" on public.fechamentos_diarios;
drop policy if exists "Users can update their own daily closings" on public.fechamentos_diarios;
drop policy if exists "Users can delete their own daily closings" on public.fechamentos_diarios;
drop policy if exists "Authenticated can view daily closings" on public.fechamentos_diarios;
drop policy if exists "Authenticated can insert daily closings" on public.fechamentos_diarios;
drop policy if exists "Authenticated can update daily closings" on public.fechamentos_diarios;
drop policy if exists "Authenticated can delete daily closings" on public.fechamentos_diarios;

create policy "Authenticated can view daily closings"
  on public.fechamentos_diarios for select to authenticated
  using (true);

create policy "Authenticated can insert daily closings"
  on public.fechamentos_diarios for insert to authenticated
  with check (true);

create policy "Authenticated can update daily closings"
  on public.fechamentos_diarios for update to authenticated
  using (true)
  with check (true);

create policy "Authenticated can delete daily closings"
  on public.fechamentos_diarios for delete to authenticated
  using (true);

select pg_notify('pgrst', 'reload schema');
