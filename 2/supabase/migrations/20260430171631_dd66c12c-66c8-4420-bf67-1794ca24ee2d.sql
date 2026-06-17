ALTER TABLE public.cursos_dados REPLICA IDENTITY FULL;
ALTER TABLE public.vendas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cursos_dados;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;