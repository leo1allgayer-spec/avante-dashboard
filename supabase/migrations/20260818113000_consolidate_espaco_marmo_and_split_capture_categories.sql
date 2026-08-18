-- Separa o curso do serviço de captação e consolida as baixas repetidas
-- do Espaço Marmo. Os registros excedentes são cancelados, não apagados.

update public.fechamentos_diarios
set status = 'cancelado', updated_at = now()
where lower(trim(cliente)) = lower('Espaço marmo')
  and lower(coalesce(categoria, produto_servico, '')) = lower('Captacao/Edicao de Conteudo')
  and id <> '447dbc18-204a-423b-b5af-24d4aebc3e2c'::uuid
  and lower(coalesce(status, '')) <> 'cancelado';

update public.fechamentos_diarios
set
  produto_servico = 'Captacao/Edicao de Conteudo',
  categoria = 'Captacao/Edicao de Conteudo',
  valor_sinal = 2000,
  valor_a_entrar = 0,
  previsao_entrada = null,
  parcelas_total = null,
  valor_parcela = 0,
  parcelas_datas = '[]'::jsonb,
  status = 'recebido',
  updated_at = now()
where id = '447dbc18-204a-423b-b5af-24d4aebc3e2c'::uuid;

-- Mantém os outros três itens da venda como pendentes, cada um no seu
-- serviço e sem criar novos fechamentos.
update public.fechamentos_diarios
set valor_sinal = 0, valor_a_entrar = 2000, status = 'a receber', updated_at = now()
where id in (
  '2f9ed5a6-9eb2-4a6b-8714-726fa992ff89'::uuid,
  'e2a3ffb4-ae71-4acb-ab5a-ad3dbb7deafb'::uuid,
  'a9e7bbba-6cb7-4f22-bc05-acef58701a14'::uuid
);

update public.vendas
set status = case
  when id = 'a79949dc-d65e-4111-8e9e-7b3c90bd9f20'::uuid then 'pago'
  else 'pendente'
end,
comissao = case
  when id = 'a79949dc-d65e-4111-8e9e-7b3c90bd9f20'::uuid then 300
  else 0
end,
updated_at = now()
where id in (
  'a79949dc-d65e-4111-8e9e-7b3c90bd9f20'::uuid,
  '0764dd74-4720-4a53-a581-b3ca5c61be10'::uuid,
  'a0a8d5b4-00d6-4391-8558-d744913c7b8f'::uuid,
  'f1b2eec2-3e55-48ac-994b-097b98d58850'::uuid
);

select pg_notify('pgrst', 'reload schema');
