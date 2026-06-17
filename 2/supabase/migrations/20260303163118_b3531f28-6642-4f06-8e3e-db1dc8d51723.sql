CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Dados pessoais
  nome text NOT NULL,
  cpf text,
  cep text,
  cidade text,
  email text,
  instagram text,
  endereco text,
  whatsapp text,
  data_curso date,
  -- Jornada de compra
  como_conheceu text,
  tempo_para_fechar text,
  conversou_outras_escolas text,
  objetivo_principal text,
  segmento text,
  fator_determinante text,
  dor_principal text,
  -- Atendimento
  consultor text,
  tempo_atendimento text,
  atendimento_rapido text,
  nota_whatsapp integer,
  forma_atendimento text,
  motivacao_fechar text,
  valor_curso_opiniao text,
  sugestao_atendimento text,
  indicaria_alguem text,
  -- NPS
  nota_indicacao integer,
  -- Meta
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Política para inserção pública (formulário sem auth)
CREATE POLICY "Anyone can insert survey responses"
ON public.survey_responses FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política para leitura apenas por usuários autenticados
CREATE POLICY "Authenticated users can view survey responses"
ON public.survey_responses FOR SELECT
TO authenticated
USING (true);