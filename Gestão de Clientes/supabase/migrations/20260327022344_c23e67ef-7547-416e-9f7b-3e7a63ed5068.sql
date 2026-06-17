
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  company text DEFAULT '',
  instagram text DEFAULT '',
  manager text NOT NULL,
  status text NOT NULL DEFAULT 'Ativo',
  monthly_budget numeric NOT NULL DEFAULT 0,
  payment_date integer NOT NULL DEFAULT 1,
  commission_value numeric NOT NULL DEFAULT 0,
  last_balance_date text DEFAULT '',
  balance_note text DEFAULT '',
  last_report_date text DEFAULT '',
  report_day text DEFAULT 'Segunda-feira',
  last_account_update text DEFAULT '',
  start_date text DEFAULT '',
  notes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
