
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Authenticated users can view all clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (true);
