import {expect,it} from 'vitest';
import {registeredPaidCommission,commissionPaymentDate,commissionPaidInPeriod,commissionPaymentShare,pendingEarnedCommission} from './salesCommissionPayments';
it('owes only commission on collected money, excluding the unpaid balance',()=>{
 // Sale 2,000: customer paid 750, leaving 1,250 still to collect.
 expect(pendingEarnedCommission(750*0.15,12.50)).toBe(100);
 expect(pendingEarnedCommission(0,0)).toBe(0);
 expect(pendingEarnedCommission(100*0.15,150)).toBe(0);
 expect(pendingEarnedCommission(750*0.15,112.50)).toBe(0);
});
it('selects by the actual commission payment date, even for older sales',()=>{
 const sale={data:'2026-09-10',comissao:300,comissao_paga_valor:150,data_ultimo_pagamento_comissao:'2026-10-20'};
 expect(commissionPaidInPeriod(sale,'2026-10-01','2026-10-31')).toBe(150);
 expect(commissionPaidInPeriod(sale,'2026-09-01','2026-09-30')).toBe(0);
});
it('preserves real paid amounts after revisions and partial payments with pending status',()=>{
 expect(registeredPaidCommission({comissao:15,comissao_paga_valor:150,status_comissao:'paga'})).toBe(150);
 expect(registeredPaidCommission({comissao:100,comissao_paga_valor:0.45,status_comissao:'pendente'})).toBe(0.45);
 expect(registeredPaidCommission({comissao:60,status_comissao:'paga'})).toBe(60);
});
it('does not substitute the sale or course date when the payment date is unknown',()=>{
 const sale={comissao_paga_valor:99};expect(commissionPaymentDate(sale)).toBe('');expect(commissionPaidInPeriod(sale,'2026-01-01','2026-12-31')).toBe(0);
});
it('the three quotas reconcile exactly in cents, including values below one real',()=>{
 for(const amount of [0.01,0.02,0.45,1,15.01,2836.47]){
 const shares=[0,1,2].map(index=>commissionPaymentShare(amount,index));expect(Math.round(shares.reduce((sum,value)=>sum+value,0)*100)).toBe(Math.round(amount*100));
 }
 expect([0,1,2].map(i=>commissionPaymentShare(1,i))).toEqual([0.34,0.33,0.33]);
});
