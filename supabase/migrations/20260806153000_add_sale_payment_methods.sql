alter table public.vendas
  add column if not exists pagamento_saldo text;

alter table public.fechamentos_diarios
  add column if not exists pagamento_sinal text,
  add column if not exists pagamento_saldo text;
