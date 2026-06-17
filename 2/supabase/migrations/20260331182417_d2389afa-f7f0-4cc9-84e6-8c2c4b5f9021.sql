ALTER TABLE public.criativos_vendas ADD COLUMN sinal numeric NOT NULL DEFAULT 0;
ALTER TABLE public.criativos_vendas ADD COLUMN status text NOT NULL DEFAULT 'pendente';