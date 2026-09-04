create or replace function public.list_team_members_for_assignment()
returns table (id uuid, name text)
language sql
security definer
set search_path = public
stable
as $$
  select tm.id, tm.name
  from public.team_members tm
  where nullif(trim(tm.name), '') is not null
  order by tm.name;
$$;

revoke all on function public.list_team_members_for_assignment() from public;
grant execute on function public.list_team_members_for_assignment() to authenticated;