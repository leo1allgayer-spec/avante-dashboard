begin;

drop policy if exists client_weekly_editors on public.client_weekly_performance;
create policy client_weekly_editors on public.client_weekly_performance for all to authenticated
using (lower(coalesce(auth.jwt()->>'email', '')) in (
  'digitalavante3@gmail.com',
  'nicolaspatzlaff02@gmail.com',
  'lucadsilva666@gmail.com',
  'leonardowebster.ja@gmail.com',
  'emanoelbull@gmail.com',
  'zanchikaua7@gmail.com'
))
with check (
  lower(coalesce(auth.jwt()->>'email', '')) in (
    'digitalavante3@gmail.com',
    'nicolaspatzlaff02@gmail.com',
    'lucadsilva666@gmail.com',
    'leonardowebster.ja@gmail.com',
    'emanoelbull@gmail.com',
    'zanchikaua7@gmail.com'
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

commit;
