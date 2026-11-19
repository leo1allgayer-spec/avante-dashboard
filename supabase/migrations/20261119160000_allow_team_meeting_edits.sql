-- Meetings are shared with the authenticated team for agenda collaboration.
-- The previous update policy only allowed the original creator (user_id) to edit,
-- so teammates could open shared meetings but their changes silently affected zero rows.
drop policy if exists "Authenticated meetings can update" on public.meetings;

create policy "Authenticated team can update meetings"
on public.meetings
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);
