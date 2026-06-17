CREATE TABLE public.cursos_dados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  instrutor text NOT NULL,
  tipo_curso text NOT NULL,
  nome_aluno text NOT NULL,
  comissao_extra numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cursos_dados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cursos_dados" ON public.cursos_dados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cursos_dados" ON public.cursos_dados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cursos_dados" ON public.cursos_dados FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cursos_dados" ON public.cursos_dados FOR DELETE TO authenticated USING (true);