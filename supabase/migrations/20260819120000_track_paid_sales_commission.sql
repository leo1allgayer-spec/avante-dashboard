alter table public.vendas
  add column if not exists comissao_paga_valor numeric not null default 0,
  add column if not exists data_ultimo_pagamento_comissao date;

update public.vendas
set comissao_paga_valor = greatest(0, coalesce(comissao, 0))
where status_comissao = 'paga'
  and coalesce(comissao_paga_valor, 0) = 0;

select pg_notify('pgrst', 'reload schema');
