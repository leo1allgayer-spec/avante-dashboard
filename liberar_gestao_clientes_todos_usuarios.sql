-- Libera a visualizacao da Gestao de Clientes para todos os usuarios logados.
-- Mantem criacao, edicao e exclusao restritas ao dono do registro.
-- Rode este arquivo no Supabase SQL Editor.

alter table public.gestao_clients enable row level security;

drop policy if exists "Users can view their own gestao clients" on public.gestao_clients;
drop policy if exists "Users can insert their own gestao clients" on public.gestao_clients;
drop policy if exists "Users can update their own gestao clients" on public.gestao_clients;
drop policy if exists "Users can delete their own gestao clients" on public.gestao_clients;

drop policy if exists "Authenticated users can view all gestao clients" on public.gestao_clients;
drop policy if exists "Users can insert their own gestao clients" on public.gestao_clients;
drop policy if exists "Users can update their own gestao clients" on public.gestao_clients;
drop policy if exists "Users can delete their own gestao clients" on public.gestao_clients;

create policy "Authenticated users can view all gestao clients"
  on public.gestao_clients for select to authenticated
  using (true);

create policy "Users can insert their own gestao clients"
  on public.gestao_clients for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own gestao clients"
  on public.gestao_clients for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own gestao clients"
  on public.gestao_clients for delete to authenticated
  using (auth.uid() = user_id);

select pg_notify('pgrst', 'reload schema');
