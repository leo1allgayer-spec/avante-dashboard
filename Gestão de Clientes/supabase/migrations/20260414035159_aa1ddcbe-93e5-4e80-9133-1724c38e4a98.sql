
-- 1. course_bookings: revoke anonymous INSERT, allow only service-role inserts
DROP POLICY IF EXISTS "Anon can insert bookings" ON public.course_bookings;

-- Add unique constraint to prevent duplicate bookings
ALTER TABLE public.course_bookings ADD CONSTRAINT unique_email_slot UNIQUE (email, slot_id);

-- 2. course_slots: restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "Anyone can insert slots" ON public.course_slots;

CREATE POLICY "Authenticated can insert slots"
ON public.course_slots FOR INSERT TO authenticated
WITH CHECK (true);

-- 3. user_permissions: restrict SELECT to own row + admins
DROP POLICY IF EXISTS "Authenticated users can view all permissions" ON public.user_permissions;

CREATE POLICY "Users view own or admins view all permissions"
ON public.user_permissions FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);
