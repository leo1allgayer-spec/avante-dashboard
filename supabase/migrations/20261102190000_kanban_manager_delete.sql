begin;
-- Same managers already allowed to manage the board's stages. Existing owner
-- access and restrictive board policies remain in force.
create policy "managers delete operational kanban tasks"
on public.social_media_kanban_tasks for delete to authenticated
using (lower(auth.jwt() ->> 'email') in (
  'digitalavante3@gmail.com', 'nicolaspatzlaff02@gmail.com',
  'lucadsilva666@gmail.com', 'leonardowebster.ja@gmail.com'
));
commit;
