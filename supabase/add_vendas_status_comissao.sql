alter table public.vendas
  add column if not exists status_comissao text not null default 'pendente';

alter table public.vendas
  drop constraint if exists vendas_status_comissao_check;

alter table public.vendas
  add constraint vendas_status_comissao_check
  check (status_comissao in ('pendente', 'paga'));
