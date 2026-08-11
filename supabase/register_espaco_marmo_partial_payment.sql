-- Registra a segunda baixa de R$ 2.000 do Espaço Marmo sem duplicar a venda.
-- O pagamento é alocado parcialmente em Gestão de Tráfego Pago - Meta Ads.
update public.fechamentos_diarios
set valor_sinal = 2000,
    valor_a_entrar = 500,
    status = 'a receber',
    pagamento_saldo = 'PIX',
    updated_at = now()
where lower(trim(cliente)) = lower(trim('Espaço marmo'))
  and status <> 'cancelado'
  and lower(trim(coalesce(categoria, produto_servico))) = lower(trim('Gestão de Tráfego Pago - Meta Ads'));

update public.vendas
set status = 'pendente',
    comissao = 300,
    pagamento_saldo = 'PIX',
    updated_at = now()
where lower(trim(cliente)) = lower(trim('Espaço marmo'))
  and lower(trim(coalesce(servico, produto))) = lower(trim('Gestão de Tráfego Pago - Meta Ads'))
  and status <> 'cancelada';
