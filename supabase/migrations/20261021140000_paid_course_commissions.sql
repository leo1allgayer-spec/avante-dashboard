begin;
alter table public.cursos_dados add column if not exists comissao_paga_valor numeric(14,2) not null default 0 check(comissao_paga_valor>=0);
alter table public.cursos_dados add column if not exists data_pagamento_comissao date;
comment on column public.cursos_dados.comissao_paga_valor is 'Valor efetivamente pago ao instrutor; não preencher automaticamente com a comissão prevista.';
commit;
