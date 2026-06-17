
-- Update clients policies: all authenticated users can read, insert, update, delete
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
CREATE POLICY "Authenticated users can view all clients" ON public.clients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
CREATE POLICY "Authenticated users can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
CREATE POLICY "Authenticated users can update all clients" ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
CREATE POLICY "Authenticated users can delete all clients" ON public.clients FOR DELETE TO authenticated USING (true);

-- Update tasks policies
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Authenticated users can view all tasks" ON public.tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Authenticated users can update all tasks" ON public.tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Authenticated users can delete all tasks" ON public.tasks FOR DELETE TO authenticated USING (true);

-- Update meetings policies
DROP POLICY IF EXISTS "Users can view own meetings" ON public.meetings;
CREATE POLICY "Authenticated users can view all meetings" ON public.meetings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own meetings" ON public.meetings;
CREATE POLICY "Authenticated users can insert meetings" ON public.meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meetings" ON public.meetings;
CREATE POLICY "Authenticated users can update all meetings" ON public.meetings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own meetings" ON public.meetings;
CREATE POLICY "Authenticated users can delete all meetings" ON public.meetings FOR DELETE TO authenticated USING (true);

-- Update team_members policies
DROP POLICY IF EXISTS "Users can view own team" ON public.team_members;
CREATE POLICY "Authenticated users can view all team" ON public.team_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own team" ON public.team_members;
CREATE POLICY "Authenticated users can insert team" ON public.team_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own team" ON public.team_members;
CREATE POLICY "Authenticated users can update all team" ON public.team_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own team" ON public.team_members;
CREATE POLICY "Authenticated users can delete all team" ON public.team_members FOR DELETE TO authenticated USING (true);
