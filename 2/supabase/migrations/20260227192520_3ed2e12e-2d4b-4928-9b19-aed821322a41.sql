
-- Daily metrics table
CREATE TABLE public.daily_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Meta mensal
  meta_mensal_prevista NUMERIC DEFAULT 0,
  meta_mensal_realizada NUMERIC DEFAULT 0,
  
  -- Meta diária
  meta_diaria_prevista NUMERIC DEFAULT 0,
  meta_diaria_realizada NUMERIC DEFAULT 0,
  
  -- Faturamento
  faturamento_dia NUMERIC DEFAULT 0,
  
  -- Métricas comerciais
  leads INTEGER DEFAULT 0,
  custo_por_lead NUMERIC DEFAULT 0,
  lead_mql INTEGER DEFAULT 0,
  custo_por_lead_mql NUMERIC DEFAULT 0,
  cac NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics"
  ON public.daily_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON public.daily_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
  ON public.daily_metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metrics"
  ON public.daily_metrics FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_daily_metrics_updated_at
  BEFORE UPDATE ON public.daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
