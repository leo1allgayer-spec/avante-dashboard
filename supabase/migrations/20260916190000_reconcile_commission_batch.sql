update public.vendas
set comissao = case
  when lower(trim(cliente)) = lower('Brenda Schonardie bier') then 251.65
  when lower(trim(cliente)) = lower('Alessandra Aparecida Araujo Oliveira') then 15.00
  when lower(trim(cliente)) = lower('Gabryelly Cristinne de oliveira') then 149.77
  when lower(trim(cliente)) = lower('LEONARDO DE ARAUJO PIMENTEL') then 159.79
  when lower(trim(cliente)) = lower('RAFAEL NADIR ANDREAZZA') then 405.00
  when lower(trim(cliente)) = lower('Alex stumpf Bernardes') then 172.05
  when lower(trim(cliente)) = lower('Felipe Hahn Dias') then 674.85
  else comissao
end,
comissao_paga_valor = case
  when lower(trim(cliente)) = lower('Brenda Schonardie bier') then 251.65
  when lower(trim(cliente)) = lower('Alessandra Aparecida Araujo Oliveira') then 15.00
  when lower(trim(cliente)) = lower('Gabryelly Cristinne de oliveira') then 149.77
  when lower(trim(cliente)) = lower('LEONARDO DE ARAUJO PIMENTEL') then 159.79
  when lower(trim(cliente)) = lower('RAFAEL NADIR ANDREAZZA') then 405.00
  when lower(trim(cliente)) = lower('Alex stumpf Bernardes') then 172.05
  when lower(trim(cliente)) = lower('Felipe Hahn Dias') then 674.85
  else comissao_paga_valor
end
where data_ultimo_pagamento_comissao = '2026-09-16'
  and lower(trim(cliente)) in (
    lower('Brenda Schonardie bier'),
    lower('Alessandra Aparecida Araujo Oliveira'),
    lower('Gabryelly Cristinne de oliveira'),
    lower('LEONARDO DE ARAUJO PIMENTEL'),
    lower('RAFAEL NADIR ANDREAZZA'),
    lower('Alex stumpf Bernardes'),
    lower('Felipe Hahn Dias')
  );
