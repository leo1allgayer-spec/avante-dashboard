-- Vincula cursos legados a vendas existentes com nomes abreviados.
update public.vendas
set cliente = 'William Gabrieol Favero', updated_at = now()
where id = 'd4bcac95-6c12-4a36-add6-e12550ac60e1';

update public.vendas
set cliente = 'Valdenir batista', updated_at = now()
where id = 'e3652cc6-88eb-462b-969e-7f9a39cd49b7';

update public.vendas
set cliente = 'Alisson Alfred', updated_at = now()
where id = '8f577a26-49d5-4f0d-8120-e906036c634b';

-- Cursos antigos sem nenhuma venda recebem uma linha financeira incompleta.
-- O valor fica zerado deliberadamente para preenchimento manual posterior.
with owner as (
  select user_id
  from public.vendas
  where user_id is not null
  order by created_at desc
  limit 1
), missing(data, cliente, produto) as (
  values
    ('2026-08-03'::date, 'Daniela de Oliveira', 'Curso de Meta Ads'),
    ('2026-08-05'::date, 'denis zilz', 'Curso de Meta Ads'),
    ('2026-08-05'::date, 'Felipe Scholles', 'Curso de Meta Ads'),
    ('2026-08-05'::date, 'Henrique da Silva Ribeiro', 'Curso de Meta Ads'),
    ('2026-08-05'::date, 'Natalia brito', 'Curso de Meta Ads'),
    ('2026-08-07'::date, 'Quezia Ávila dos Santos', 'Curso de Meta Ads'),
    ('2026-08-10'::date, 'ELEN CARPES', 'Curso de Meta Ads'),
    ('2026-08-12'::date, 'Graciela Barbosa Da Cruz', 'Curso de Google Ads')
)
insert into public.vendas (
  user_id, data, vendedor, cliente, produto, servico, valor, pagamento,
  parcelas, valor_com_juros, comissao, status_comissao, status, origem,
  updated_at
)
select
  owner.user_id, missing.data, 'A preencher', missing.cliente,
  missing.produto, '', 0, 'A definir', null, null, 0,
  'pendente', 'pendente', 'Curso legado - completar venda', now()
from missing cross join owner
where not exists (
  select 1 from public.vendas venda
  where lower(trim(regexp_replace(venda.cliente, '\s+', ' ', 'g')))
        = lower(trim(regexp_replace(missing.cliente, '\s+', ' ', 'g')))
    and lower(trim(regexp_replace(coalesce(nullif(venda.produto, ''), venda.servico), '\s+', ' ', 'g')))
        = lower(trim(regexp_replace(missing.produto, '\s+', ' ', 'g')))
);

select pg_notify('pgrst', 'reload schema');
