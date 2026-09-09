update public.team_members
set name = 'Leonardo Webster'
where lower(trim(name)) = 'leonardo';

with team_owner as (
  select user_id
  from public.team_members
  order by created_at
  limit 1
),
missing_members(name) as (
  values
    ('Leonardo Allgayer'),
    ('Ana'),
    ('Andrei')
)
insert into public.team_members (name, user_id)
select missing.name, owner.user_id
from missing_members missing
cross join team_owner owner
where not exists (
  select 1
  from public.team_members member
  where lower(trim(member.name)) = lower(missing.name)
);

select pg_notify('pgrst', 'reload schema');
