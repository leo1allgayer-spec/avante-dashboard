with known_team(email, name) as (
  values
    ('nicolaspatzlaff02@gmail.com', 'Nicolas'),
    ('lucadsilva666@gmail.com', 'Lucas'),
    ('leonardowebster.ja@gmail.com', 'Leonardo'),
    ('hjasiulzwicz@gmail.com', 'Henrique')
)
insert into public.team_members (name, user_id)
select team.name, users.id
from known_team team
join auth.users users on lower(users.email) = team.email
where not exists (
  select 1
  from public.team_members member
  where member.user_id = users.id
     or lower(trim(member.name)) = lower(team.name)
);

select pg_notify('pgrst', 'reload schema');
