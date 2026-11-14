begin;

do $$
declare
  v_user_id uuid;
  v_member_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = 'hiagooleques1505@gmail.com' and deleted_at is null
  order by created_at desc
  limit 1;

  if v_user_id is null then
    raise exception 'Usuário Hiago não encontrado em auth.users';
  end if;

  select id into v_member_id
  from public.team_members
  where user_id = v_user_id
  order by created_at
  limit 1;

  if v_member_id is null then
    insert into public.team_members (name, user_id)
    values ('Hiago', v_user_id)
    returning id into v_member_id;
  else
    update public.team_members
    set name = 'Hiago'
    where id = v_member_id;
  end if;

  insert into public.task_assignee_directory (member_id, account_id, display_name, phone)
  select v_member_id, v_user_id, 'Hiago', coalesce(nullif(u.phone, ''), '')
  from auth.users u
  where u.id = v_user_id
  on conflict (account_id) do update
    set member_id = excluded.member_id,
        display_name = excluded.display_name,
        phone = case when excluded.phone <> '' then excluded.phone else public.task_assignee_directory.phone end;
end;
$$;

select pg_notify('pgrst', 'reload schema');
commit;
