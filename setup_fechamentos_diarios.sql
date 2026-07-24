create table if not exists public.fechamentos_diarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  data date not null default current_date,
  cliente text not null,
  vendedor text not null default '',
  produto_servico text not null default '',
  valor_sinal numeric not null default 0,
  valor_a_entrar numeric not null default 0,
  previsao_entrada date,
  status text not null default 'para entrar',
  observacao text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.fechamentos_diarios enable row level security;

drop policy if exists "Users can view their own daily closings" on public.fechamentos_diarios;
drop policy if exists "Users can insert their own daily closings" on public.fechamentos_diarios;
drop policy if exists "Users can update their own daily closings" on public.fechamentos_diarios;
drop policy if exists "Users can delete their own daily closings" on public.fechamentos_diarios;

create policy "Users can view their own daily closings"
  on public.fechamentos_diarios for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own daily closings"
  on public.fechamentos_diarios for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own daily closings"
  on public.fechamentos_diarios for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own daily closings"
  on public.fechamentos_diarios for delete to authenticated
  using (auth.uid() = user_id);

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
