import { expect,it } from 'vitest';
import { contractMonthlyFinancials } from './contractMonthlyFinancials';
it('matches contract page totals for partial, paid, barter and arrears receipts',()=>{
 const base={status:'Ativo',monthlyContractValue:1000,paymentStatus:'a receber'};
 const s=contractMonthlyFinancials([
 {...base,receivedMonth:'2026-10',monthlyReceived:400},
 {...base,paymentStatus:'pago',paidMonth:'2026-10'},
 {...base,paymentStatus:'permuta'},
 {...base,status:'Pausado'},
 {...base,contractSettled:true,receivedMonth:'2026-10',monthlyReceived:300,arrearsReceivedMonth:'2026-10',arrearsReceived:100}
 ] as any,'2026-10');
 expect(s).toEqual({received:1800,pending:600});
});
it('does not reuse another months receipts',()=>{
 expect(contractMonthlyFinancials([{status:'Ativo',monthlyContractValue:1000,paymentStatus:'a receber',receivedMonth:'2026-09',monthlyReceived:1000}] as any,'2026-10')).toEqual({received:0,pending:1000});
});
