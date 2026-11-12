type CommissionPayment={comissao?:number|null;comissao_paga_valor?:number|null;status_comissao?:string|null;data_ultimo_pagamento_comissao?:string|null};
// Only commission earned on money already collected can be owed now.
export function pendingEarnedCommission(earnedOnCollected:number,alreadyPaid:number){return +Math.max(0,earnedOnCollected-alreadyPaid).toFixed(2);}
// A recorded payment is an actual outflow, even if the current commission was revised later.
export function registeredPaidCommission(sale:CommissionPayment){return Math.max(0,Number(sale.comissao_paga_valor??(sale.status_comissao==='paga'?sale.comissao:0))||0);}
export function commissionPaymentDate(sale:CommissionPayment){const date=sale.data_ultimo_pagamento_comissao||'';return /^\d{4}-\d{2}-\d{2}$/.test(date)?date:'';}
export function commissionPaidInPeriod(sale:CommissionPayment,start:string,end:string){const date=commissionPaymentDate(sale);return date&&date>=start&&date<=end?registeredPaidCommission(sale):0;}
// Distribute integer cents so the three shares always add up to the recorded payment.
export function commissionPaymentShare(amount:number,index:number,count=3){const cents=Math.round(Math.max(0,amount)*100);return (Math.floor(cents/count)+(index<cents%count?1:0))/100;}
