begin;
drop policy if exists emanoel_support_schedule on public.support_date_overrides;
create policy emanoel_support_schedule on public.support_date_overrides
for all to authenticated
using (lower(coalesce(auth.jwt()->>'email', '')) = 'emanoelbull@gmail.com')
with check (lower(coalesce(auth.jwt()->>'email', '')) = 'emanoelbull@gmail.com');
commit;
