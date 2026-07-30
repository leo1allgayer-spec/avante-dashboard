alter table public.team_members enable row level security;

drop policy if exists "Authenticated can view all team members" on public.team_members;

create policy "Authenticated can view all team members"
on public.team_members
for select
to authenticated
using (true);

select pg_notify('pgrst', 'reload schema');
