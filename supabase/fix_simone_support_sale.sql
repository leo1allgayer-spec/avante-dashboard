update public.vendas
set
  produto = 'Suporte Extra',
  servico = '',
  updated_at = now()
where id = '7c3e6b02-fcb7-461b-9606-117aaf032ce3';

update public.fechamentos_diarios
set
  produto_servico = 'Suporte Extra',
  categoria = 'Suporte Extra',
  updated_at = now()
where id = '0cfae3f7-90fe-4545-8900-12dca1a207cc';
