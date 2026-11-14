begin;

drop policy if exists client_weekly_editors on public.client_weekly_performance;
create policy client_weekly_editors on public.client_weekly_performance for all to authenticated
using (lower(coalesce(auth.jwt()->>'email', '')) in (
  'digitalavante3@gmail.com',
  'nicolaspatzlaff02@gmail.com',
  'lucadsilva666@gmail.com',
  'leonardowebster.ja@gmail.com',
  'emanoelbull@gmail.com',
  'zanchikaua7@gmail.com',
  'hiagooleques1505@gmail.com'
))
with check (
  lower(coalesce(auth.jwt()->>'email', '')) in (
    'digitalavante3@gmail.com',
    'nicolaspatzlaff02@gmail.com',
    'lucadsilva666@gmail.com',
    'leonardowebster.ja@gmail.com',
    'emanoelbull@gmail.com',
    'zanchikaua7@gmail.com',
    'hiagooleques1505@gmail.com'
  )
  and (
    report_id is null
    or exists (
      select 1
      from public.client_reports r
      where r.id = report_id and r.client_id = client_weekly_performance.client_id
    )
  )
);

do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id
  from auth.users
  where lower(email) = 'hiagooleques1505@gmail.com' and deleted_at is null
  limit 1;

  if target_user_id is not null then
    update public.user_permissions
    set can_access_clients = true
    where user_id = target_user_id;

    if not found then
      insert into public.user_permissions (user_id, email, can_access_clients, can_access_tasks, can_access_bookings)
      values (target_user_id, 'hiagooleques1505@gmail.com', true, false, false);
    end if;
  end if;
end $$;

commit;
