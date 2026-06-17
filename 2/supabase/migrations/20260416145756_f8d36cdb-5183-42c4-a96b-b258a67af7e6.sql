
CREATE TABLE public.pagamentos_variaveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pessoa TEXT NOT NULL,
  cliente TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  mes_ano TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamentos_variaveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view pagamentos_variaveis" ON public.pagamentos_variaveis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert pagamentos_variaveis" ON public.pagamentos_variaveis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update pagamentos_variaveis" ON public.pagamentos_variaveis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete pagamentos_variaveis" ON public.pagamentos_variaveis FOR DELETE TO authenticated USING (true);
