alter table public.vendas
  add column if not exists saldo_recorrente_sem_comissao boolean not null default false;
