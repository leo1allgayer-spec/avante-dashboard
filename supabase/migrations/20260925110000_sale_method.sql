ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS forma_venda text;
ALTER TABLE public.vendas ADD CONSTRAINT vendas_forma_venda_check
  CHECK (forma_venda IS NULL OR forma_venda IN ('nao_informado', 'conversa', 'ligacao', 'reuniao', 'reuniao_na_hora', 'reuniao_depois'));
COMMENT ON COLUMN public.vendas.forma_venda IS 'Canal da venda e momento do fechamento quando realizado em reunião.';
