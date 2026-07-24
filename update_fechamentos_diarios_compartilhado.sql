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
