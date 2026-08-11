begin;

-- Mantém apenas o pagamento original de R$ 2.000, alocado no Site.
-- A baixa posterior em Gestão de Tráfego Meta Ads foi duplicada.
update public.fechamentos_diarios
set valor_sinal = 0,
    valor_a_entrar = 2500,
    status = 'a receber',
    updated_at = now()
where id = 'e2a3ffb4-ae71-4acb-ab5a-ad3dbb7deafb';

update public.vendas
set status = 'pendente',
    comissao = 0,
    updated_at = now()
where id = '0764dd74-4720-4a53-a581-b3ca5c61be10';

commit;
