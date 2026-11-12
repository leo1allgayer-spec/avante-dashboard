-- The confirmed primary account can manage the team's editorial records.
-- Existing author policies and shared authenticated read policies remain in place.
create policy "Editorial primary edit" on public.editorial_entries for update to authenticated
using (lower(auth.jwt()->>'email') = 'digitalavante3@gmail.com')
with check (lower(auth.jwt()->>'email') = 'digitalavante3@gmail.com');
create policy "Editorial primary delete" on public.editorial_entries for delete to authenticated
using (lower(auth.jwt()->>'email') = 'digitalavante3@gmail.com');
create policy "Editorial primary notes edit" on public.editorial_day_notes for update to authenticated
using (lower(auth.jwt()->>'email') = 'digitalavante3@gmail.com')
with check (lower(auth.jwt()->>'email') = 'digitalavante3@gmail.com');
create policy "Editorial primary folders edit" on public.editorial_folders for update to authenticated
using (lower(auth.jwt()->>'email') = 'digitalavante3@gmail.com')
with check (lower(auth.jwt()->>'email') = 'digitalavante3@gmail.com');
