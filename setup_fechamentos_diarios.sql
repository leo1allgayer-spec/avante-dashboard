create table if not exists public.fechamentos_diarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  data date not null default current_date,
  cliente text not null,
  vendedor text not null default '',
  produto_servico text not null default '',
  categoria text,
  valor_sinal numeric not null default 0,
  valor_a_entrar numeric not null default 0,
  valor_recorrente numeric not null default 0,
  parcelas_total integer,
  valor_parcela numeric not null default 0,
  previsao_entrada date,
  status text not null default 'a receber',
  observacao text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.fechamentos_diarios
  add column if not exists categoria text,
  add column if not exists valor_recorrente numeric not null default 0,
  add column if not exists parcelas_total integer,
  add column if not exists valor_parcela numeric not null default 0;

update public.fechamentos_diarios
set categoria = coalesce(nullif(categoria, ''), nullif(produto_servico, ''), 'Sem categoria')
where categoria is null or categoria = '';

update public.fechamentos_diarios
set status = 'a receber'
where status = 'para entrar';

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

create or replace function public.set_fechamentos_diarios_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_fechamentos_diarios_updated_at on public.fechamentos_diarios;
create trigger trg_fechamentos_diarios_updated_at
  before update on public.fechamentos_diarios
  for each row execute function public.set_fechamentos_diarios_updated_at();

select pg_notify('pgrst', 'reload schema');
