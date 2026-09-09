drop policy if exists "Authenticated meetings can read" on public.meetings;

create policy "Authenticated meetings can read"
on public.meetings
for select
to authenticated
using (true);
