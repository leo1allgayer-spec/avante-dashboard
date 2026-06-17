
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS on user_roles: only admins manage, all authenticated can read
CREATE POLICY "Authenticated can view roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Seed admin role for digitalavante@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'digitalavante@gmail.com'
ON CONFLICT DO NOTHING;

-- 6. Fix course_bookings: remove anon SELECT, restrict to admin
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.course_bookings;
DROP POLICY IF EXISTS "Anyone can insert bookings" ON public.course_bookings;
DROP POLICY IF EXISTS "Authenticated can update bookings" ON public.course_bookings;
DROP POLICY IF EXISTS "Authenticated can delete bookings" ON public.course_bookings;

-- Anon can still INSERT (public booking form)
CREATE POLICY "Anon can insert bookings"
  ON public.course_bookings FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can SELECT
CREATE POLICY "Admins can view bookings"
  ON public.course_bookings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can UPDATE
CREATE POLICY "Admins can update bookings"
  ON public.course_bookings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can DELETE
CREATE POLICY "Admins can delete bookings"
  ON public.course_bookings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Fix user_permissions: restrict writes to admin
DROP POLICY IF EXISTS "Authenticated users can insert permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Authenticated users can update permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Authenticated users can delete permissions" ON public.user_permissions;

CREATE POLICY "Admins can insert permissions"
  ON public.user_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update permissions"
  ON public.user_permissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete permissions"
  ON public.user_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
