import { expect, it } from 'vitest';
import { EXPENSE_CATEGORIES, financialExpenseSummary } from './financialExpenses';
it('shows cash and sales projections while deducting card fees exactly once',()=>{
 const s=financialExpenseSummary('2026-10',[{data:'2026-10-01',valor:2000,status:'aprovada'}],[{data:'2026-10-02',valor_sinal:1000,valor_sinal_liquido:950,status:'recebido'}],[{category:'fixed',amount:100}]);
 expect(s).toMatchObject({sold:2000,gross:1000,net:950,cardFees:50,costs:100,totalCosts:150,result:850,projected:1850,complete:false});
});
it('excludes cancelled and other-month entries and accepts genuine zero amounts',()=>{
 const s=financialExpenseSummary('2026-10',[{data:'2026-10-01',valor:100,status:'Cancelada'},{data:'2026-09-30',valor:100,status:'recebido'}],[{data:'2026-10-01',valor_sinal:100,valor_sinal_liquido:90,status:'cancelado'}],EXPENSE_CATEGORIES.map(c=>({category:c.id,amount:0})));
 expect(s).toMatchObject({sold:0,net:0,result:0,percentage:null,projectedPercentage:null,complete:true});
});
it('handles legacy net values and reports negative results',()=>{
 const s=financialExpenseSummary('2026-10',[],[{data:'2026-10-01',valor_sinal:100,valor_sinal_liquido:null,status:'recebido'}],[{category:'taxes',amount:150}]);
 expect(s).toMatchObject({net:100,cardFees:0,result:-50,percentage:-50});
});

it('filters inclusive date boundaries across months and subtracts automatic ads once',()=>{
 const s=financialExpenseSummary('2026-10',[
 {data:'2026-09-29',valor:100,status:'recebido'},
 {data:'2026-09-30',valor:500,status:'recebido'},
 {data:'2026-10-02',valor:700,status:'recebido'},
 {data:'2026-10-03',valor:100,status:'recebido'}
 ],[{data:'2026-10-02',valor_sinal:1000,valor_sinal_liquido:950,status:'recebido'}],
 [{category:'fixed',amount:100},{category:'variable',amount:50}],{since:'2026-09-30',until:'2026-10-02'},200);
 expect(s).toMatchObject({sold:1200,net:950,cardFees:50,manualCosts:150,adSpend:200,adTax:24.5,adMedia:175.5,adTotal:200,costs:350,totalCosts:400,result:600,projected:800});
});

it('calculates card fees when the stored net equals gross using the linked sale installments',()=>{
 const s=financialExpenseSummary('2026-10',[{id:'sale',data:'2026-10-01',valor:1000,status:'recebido',pagamento:'Infinity (Visa/Master)',parcelas:'2'}],[{venda_id:'sale',data:'2026-10-01',valor_sinal:1000,valor_sinal_liquido:1000,status:'recebido'}],[]);
 expect(s).toMatchObject({gross:1000,net:957.8,cardFees:42.2,result:957.8});
});
it('includes payment history fees on the receipt date even for an older sale',()=>{
 const payment={id:'p1',date:'2026-10-15',amount:500,netAmount:475,method:'Link Infinity'};
 const s=financialExpenseSummary('2026-10',[],[{data:'2026-09-01',valor_sinal:1000,valor_sinal_liquido:950,status:'recebido',observacao:'[PAGAMENTO_VENDA]'+JSON.stringify(payment)}],[]);
 expect(s).toMatchObject({gross:500,net:475,cardFees:25});
});

it('does not deduct pending commissions or duplicate manual sales commission',()=>{
 const s=financialExpenseSummary('2026-10',[
 {data:'2026-10-01',valor:1000,status:'aprovada',comissao:150},
 {data:'2026-10-02',valor:1000,status:'cancelada',comissao:150},
 {data:'2026-09-30',valor:1000,status:'aprovada',comissao:150}
 ],[{data:'2026-10-01',valor_sinal:1000,valor_sinal_liquido:950,status:'recebido'}],
 [{category:'sales_commission',amount:999},{category:'operational_commission',amount:50}],undefined,100,
 [{data:'2026-10-10',comissao_extra:200},{data:'2026-11-01',comissao_extra:200}]);
 expect(s).toMatchObject({salesCommission:0,courseCommission:0,manualCosts:50,costs:150,result:800,projected:800});
});

it('separates ad spend and its 12.25 percent tax with currency rounding',()=>{
 const s=financialExpenseSummary('2026-10',[],[],[],undefined,9066.33);
 expect(s).toMatchObject({adSpend:9066.33,adTax:1110.63,adMedia:7955.7,adTotal:9066.33,costs:9066.33});
 expect(financialExpenseSummary('2026-10',[],[],[],undefined,0).adTax).toBe(0);
});

it('splits included tax out of the Meta total without increasing expenses',()=>{
 const s=financialExpenseSummary('2026-10',[],[],[],undefined,9077.93);
 expect(s).toMatchObject({adMedia:7965.88,adTax:1112.05,adTotal:9077.93,costs:9077.93,result:-9077.93});
 expect(Math.round((s.adMedia+s.adTax)*100)).toBe(Math.round(s.adTotal*100));
});

it('counts paid commissions by payment date, including partial payments and old sales',()=>{
 const s=financialExpenseSummary('2026-10',[
 {data:'2026-09-01',valor:1000,status:'aprovada',comissao:150,comissao_paga_valor:50,data_ultimo_pagamento_comissao:'2026-10-15'},
 {data:'2026-10-01',valor:1000,status:'aprovada',comissao:150,status_comissao:'pendente'},
 {data:'2026-10-02',valor:1000,status:'aprovada',comissao:150,comissao_paga_valor:150,data_ultimo_pagamento_comissao:'2026-11-01'},
 {data:'2026-10-03',valor:1000,status:'aprovada',comissao:150,status_comissao:'paga'}
 ],[],[],undefined,0,[{data:'2026-09-01',comissao_extra:200,comissao_paga_valor:80,data_pagamento_comissao:'2026-10-20'},{data:'2026-10-01',comissao_extra:200}]);
 expect(s).toMatchObject({salesCommission:50,courseCommission:80,costs:130,undatedSalesCommission:150});
});
it('uses contract receipts and pending totals without duplicating recurring closings or unrelated course revenue',()=>{
 const s=financialExpenseSummary('2026-10',[
 {data:'2026-10-01',valor:2000,status:'aprovada',cliente:'Empresa A',servico:'Gestão de Tráfego Pago - Meta Ads'},
 {data:'2026-10-01',valor:1000,status:'aprovada',cliente:'Empresa A',produto:'Curso de Meta Ads'}
 ],[
 {data:'2026-10-01',valor_sinal:1200,valor_sinal_liquido:1200,status:'recebido',cliente:'Empresa A',valor_recorrente:2000},
 {data:'2026-10-01',valor_sinal:1000,valor_sinal_liquido:950,status:'recebido',cliente:'Empresa A',categoria:'Curso de Meta Ads'}
 ],[],undefined,0,[],{received:1200,pending:800,names:['Empresa A']});
 expect(s).toMatchObject({sold:1000,contractReceived:1200,contractPending:800,net:2150,gross:2200,cardFees:50,projectedRevenue:3000,result:2150,projected:2950});
});
