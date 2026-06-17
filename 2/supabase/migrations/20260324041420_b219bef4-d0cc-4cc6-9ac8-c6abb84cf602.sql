
CREATE TABLE public.instagram_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  seguidores_novos INTEGER NOT NULL DEFAULT 0,
  custo_por_seguidor NUMERIC NOT NULL DEFAULT 0,
  seguidores_mql INTEGER NOT NULL DEFAULT 0,
  taxa_seguidores_mql NUMERIC NOT NULL DEFAULT 0,
  abordagens_feitas INTEGER NOT NULL DEFAULT 0,
  taxa_resposta_abordagem NUMERIC NOT NULL DEFAULT 0,
  fechamentos_social_seller INTEGER NOT NULL DEFAULT 0,
  cac_social_seller NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.instagram_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view instagram_metrics" ON public.instagram_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert instagram_metrics" ON public.instagram_metrics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update instagram_metrics" ON public.instagram_metrics FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete instagram_metrics" ON public.instagram_metrics FOR DELETE TO authenticated USING (true);
