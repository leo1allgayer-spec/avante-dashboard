import {it,expect} from 'vitest';
import type {Venda} from '@/hooks/useVendas';
import type {FechamentoDiario} from '@/hooks/useFechamentosDiarios';
import {salesCommissionBalance,groupSalesCommissionBalances,salesInCommissionPeriod} from './salesCommissionBalance';
const sale=(patch:Partial<Venda>={}):Venda=>({id:'site',cliente:'Jodoe',vendedor:'Lucas',data:'2026-10-16',produto:'Desenvolvimento de Site',servico:'',valor:10000,origem:'Indicação',comissao:1500,comissao_paga_valor:0,status:'pendente',created_at:'2026-10-16T12:00:00Z',...patch} as Venda);
const closing=(patch:Partial<FechamentoDiario>={}):FechamentoDiario=>({id:'receipt',venda_id:'site',cliente:'Jodoe',vendedor:'Lucas',produto_servico:'Desenvolvimento de Site',categoria:'Desenvolvimento de Site',valor_sinal:5000,valor_sinal_liquido:5000,status:'a receber',data:'2026-10-16',...patch} as FechamentoDiario);
it('Jodoe earns 750 on the 5000 received across two services, not 1500 on the total sold',()=>{
 const items=[sale({valor:2000}),sale({id:'google',produto:'Gestão de Tráfego Pago - Google Ads',valor:8000})];
 const receipts=[closing({valor_sinal:2000,valor_sinal_liquido:2000}),closing({id:'receipt-google',venda_id:'google',produto_servico:items[1].produto,categoria:items[1].produto,valor_sinal:3000,valor_sinal_liquido:3000})];
 const balance=salesCommissionBalance(items,receipts);expect(balance).toMatchObject({gross:5000,net:5000,earned:750,paid:0,pending:750});
});
it('Denis Martins earns 1185 on 7900 received, excluding the 8000 still outstanding',()=>{
 const item=sale({cliente:'Denis Martins',valor:15900,produto:'CRM/Treinamento Comercial'});
 expect(salesCommissionBalance([item],[closing({valor_sinal:7900,valor_sinal_liquido:7900})])).toMatchObject({earned:1185,pending:1185});
});
it('subtracts paid commissions, retains zero for overpayments and never earns on uncollected money',()=>{
 expect(salesCommissionBalance([sale({comissao_paga_valor:300})],[closing()]).pending).toBe(450);
 expect(salesCommissionBalance([sale({comissao_paga_valor:900})],[closing()]).pending).toBe(0);
 expect(salesCommissionBalance([sale()],[]).pending).toBe(0);
});
it('uses net collections and the social seller rate',()=>{
 expect(salesCommissionBalance([sale({origem:'Social Seller'})],[closing({valor_sinal_liquido:4500})])).toMatchObject({net:4500,earned:450,pending:450});
});
it('does not count canceled receipts, duplicate snapshots or another sale linked by ID',()=>{
 const receipts=[closing(),closing({id:'snapshot'}),closing({id:'other-sale',venda_id:'other',valor_sinal:10000}),closing({id:'cancelled',status:'cancelado',valor_sinal:10000})];
 expect(groupSalesCommissionBalances([sale()],receipts)[0]).toMatchObject({gross:5000,pending:750});
});
it('Espaço marmo: an overdue Meta service does not bring settled August/September services into October',()=>{
 const services=['Gestão de Tráfego Pago - Meta Ads','Desenvolvimento de Site','Gestão de Tráfego Pago - Google Ads','Captacao/Edicao de Conteudo'];
 const items=services.map((service,index)=>sale({id:`marmo-${index}`,cliente:'Espaço marmo',data:'2026-08-06',produto:service,valor:2000,origem:'Social Seller',comissao_paga_valor:50,data_ultimo_pagamento_comissao:'2026-09-02'}));
 const receipts=items.map((item,index)=>closing({id:`marmo-receipt-${index}`,venda_id:item.id,cliente:item.cliente,categoria:item.produto,produto_servico:item.produto,data:index===3?'2026-08-06':'2026-09-30',valor_sinal:index===0?0:2000,valor_sinal_liquido:index===0?0:2000,valor_a_entrar:index===0?2000:0,status:index===0?'a receber':'recebido',observacao:index===1||index===2?'[PAGAMENTO_VENDA]{"id":"old-receipt","date":"2026-09-30","amount":2000,"netAmount":2000,"method":"PIX"}':null}));
 expect(groupSalesCommissionBalances(items,receipts)[0]).toMatchObject({net:6000,pending:400});
 const october=salesInCommissionPeriod(items,receipts,'2026-10-01','2026-10-31',true);
 expect(october.map(item=>item.id)).toEqual(['marmo-0']);
 expect(groupSalesCommissionBalances(october,receipts)[0]).toMatchObject({net:0,paid:50,pending:0});
 const august=salesInCommissionPeriod(items,receipts,'2026-08-01','2026-08-31',true);
 expect(august).toHaveLength(4);
 expect(salesInCommissionPeriod(items,receipts,'2026-10-01','2026-10-31',false)).toHaveLength(0);
});
it('keeps older sales with real receipts or scheduled installments in the selected period',()=>{
 const item=sale({data:'2026-08-06'});
 const receipt=closing({status:'recebido',observacao:'[PAGAMENTO_VENDA]{"id":"payment","date":"2026-10-10","amount":5000}'});
 expect(salesInCommissionPeriod([item],[receipt],'2026-10-01','2026-10-31',false)).toHaveLength(1);
 expect(salesInCommissionPeriod([item],[closing({parcelas_datas:['2026-10-15']})],'2026-10-01','2026-10-31',false)).toHaveLength(1);
 expect(salesInCommissionPeriod([item],[{...receipt,status:'cancelado'}],'2026-10-01','2026-10-31',true)).toHaveLength(0);
});
it('recalculates earned and pending commission but preserves commission already paid',()=>{
 const item=sale({valor:1000,pagamento:'Infinity (Visa/Master)',parcelas:'1x',origem:'Social Seller',comissao_paga_valor:50});
 const receipt=closing({valor_sinal:1000,valor_sinal_liquido:950,pagamento_sinal:'Infinity (Visa/Master)'});
 expect(salesCommissionBalance([item],[receipt],[item],'opcao1',true)).toMatchObject({net:971.10,earned:97.11,paid:50,pending:47.11});
 expect(salesCommissionBalance([item],[receipt],[item],'opcao2',true)).toMatchObject({net:972.10,earned:97.21,paid:50,pending:47.21});
});

