
CREATE TABLE public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  vendedor text NOT NULL,
  cliente text NOT NULL,
  produto text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  pagamento text NOT NULL DEFAULT 'Dinheiro',
  parcelas text DEFAULT NULL,
  valor_com_juros numeric DEFAULT NULL,
  comissao numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vendas" ON public.vendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vendas" ON public.vendas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vendas" ON public.vendas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vendas" ON public.vendas FOR DELETE TO authenticated USING (true);
