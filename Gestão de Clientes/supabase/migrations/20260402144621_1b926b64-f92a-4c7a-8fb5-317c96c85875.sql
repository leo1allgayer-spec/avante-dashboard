
-- Table to store per-user module access permissions
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  can_access_clients boolean NOT NULL DEFAULT true,
  can_access_tasks boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view permissions (needed to check own + admin to see all)
CREATE POLICY "Authenticated users can view all permissions"
  ON public.user_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert permissions"
  ON public.user_permissions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update permissions"
  ON public.user_permissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete permissions"
  ON public.user_permissions FOR DELETE TO authenticated USING (true);

-- Auto-create permissions row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_permissions (user_id, email, can_access_clients, can_access_tasks)
  VALUES (NEW.id, COALESCE(NEW.email, ''), true, true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_permissions
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_permissions();

-- Backfill existing users
INSERT INTO public.user_permissions (user_id, email, can_access_clients, can_access_tasks)
SELECT id, COALESCE(email, ''), true, true
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
