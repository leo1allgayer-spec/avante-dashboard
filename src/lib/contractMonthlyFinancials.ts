import type { Client } from '@/types/clients/client';
export const currentBillingMonth = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date()).slice(0,7);
export const contractMonthlyReceipt = (c: Client, month: string) => c.receivedMonth === month ? Number(c.monthlyReceived || 0) : c.receivedMonth ? 0 : c.paidMonth === month && c.paymentStatus === 'pago' ? c.monthlyContractValue : 0;
export function contractMonthlyFinancials(clients: Client[], month: string) {
 const active=clients.filter(c=>c.status==='Ativo'&&c.paymentStatus!=='permuta');
 const received=active.reduce((sum,c)=>sum+contractMonthlyReceipt(c,month)+(c.arrearsReceivedMonth===month?Number(c.arrearsReceived||0):0),0);
 const pending=active.reduce((sum,c)=>sum+(c.contractSettled||(c.paymentStatus==='pago'&&(!c.paidMonth||c.paidMonth===month))?0:Math.max(c.monthlyContractValue-contractMonthlyReceipt(c,month),0)),0);
 return {received,pending};
}
