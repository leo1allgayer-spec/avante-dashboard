
-- Table for individual creative-sale tracking (per student)
CREATE TABLE public.criativos_vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_aluno TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  criativo TEXT NOT NULL,
  valor_curso NUMERIC NOT NULL DEFAULT 0,
  valor_ads NUMERIC NOT NULL DEFAULT 0,
  roas NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for creative summary/performance tracking
CREATE TABLE public.criativos_resumo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mes_ano TEXT NOT NULL, -- e.g. '2026-02'
  criativo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  leads_recebidos INTEGER NOT NULL DEFAULT 0,
  custo_por_lead NUMERIC NOT NULL DEFAULT 0,
  quantidade_fechamentos INTEGER NOT NULL DEFAULT 0,
  valor_fechado NUMERIC NOT NULL DEFAULT 0,
  valor_gasto NUMERIC NOT NULL DEFAULT 0,
  roas NUMERIC NOT NULL DEFAULT 0,
  cac NUMERIC NOT NULL DEFAULT 0,
  taxa_conversao NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, mes_ano, criativo)
);

-- Enable RLS
ALTER TABLE public.criativos_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criativos_resumo ENABLE ROW LEVEL SECURITY;

-- Policies for criativos_vendas
CREATE POLICY "Auth users can view criativos_vendas" ON public.criativos_vendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert criativos_vendas" ON public.criativos_vendas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update criativos_vendas" ON public.criativos_vendas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete criativos_vendas" ON public.criativos_vendas FOR DELETE TO authenticated USING (true);

-- Policies for criativos_resumo
CREATE POLICY "Auth users can view criativos_resumo" ON public.criativos_resumo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert criativos_resumo" ON public.criativos_resumo FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update criativos_resumo" ON public.criativos_resumo FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete criativos_resumo" ON public.criativos_resumo FOR DELETE TO authenticated USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_criativos_vendas_updated_at BEFORE UPDATE ON public.criativos_vendas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_criativos_resumo_updated_at BEFORE UPDATE ON public.criativos_resumo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
