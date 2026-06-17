
CREATE TABLE public.meta_ads_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  shift text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, shift)
);

ALTER TABLE public.meta_ads_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view meta ads exceptions"
  ON public.meta_ads_exceptions FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Authenticated can insert meta ads exceptions"
  ON public.meta_ads_exceptions FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete meta ads exceptions"
  ON public.meta_ads_exceptions FOR DELETE
  TO authenticated USING (true);
