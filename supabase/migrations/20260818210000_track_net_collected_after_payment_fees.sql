alter table public.fechamentos_diarios
  add column if not exists valor_sinal_liquido numeric;

-- Registros anteriores permanecem nulos para que a aplicação reconstrua o
-- líquido usando a forma e as parcelas já gravadas. Novos pagamentos salvam
-- o valor líquido exato nesta coluna.

select pg_notify('pgrst', 'reload schema');
