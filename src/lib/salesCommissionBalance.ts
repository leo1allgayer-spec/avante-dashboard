import type {Venda} from '@/hooks/useVendas';
import type {FechamentoDiario} from '@/hooks/useFechamentosDiarios';
import {canonicalizeSaleCategory} from '@/constants/serviceCategories';
import {collectionCalculator} from './collectionCalculator';
import {registeredPaidCommission,pendingEarnedCommission} from './salesCommissionPayments';
import {getSaleCommissionRate} from '@/constants/saleOrigins';

const key=(value?:string|null)=>(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const category=(sale:Venda)=>key(canonicalizeSaleCategory(sale.servico||sale.produto));
const closingCategory=(closing:FechamentoDiario)=>key(canonicalizeSaleCategory(closing.categoria||closing.produto_servico));

// Filter each service before grouping an order. One overdue service must not pull
// its already settled siblings into a different month's commission balance.
export function salesInCommissionPeriod(sales:Venda[],closings:FechamentoDiario[],start:string,end:string,includeCarried:boolean){
 const inRange=(date?:string|null)=>!!date&&date>=start&&date<=end;
 return sales.filter(sale=>{
  const saleDate=sale.data||(sale.created_at?new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(sale.created_at)):'');
  const related=closings.filter(closing=>key(closing.status)!=='cancelado'&&(closing.venda_id?closing.venda_id===sale.id:key(closing.cliente)===key(sale.cliente)&&key(closing.vendedor)===key(sale.vendedor)&&closingCategory(closing)===category(sale)));
  const received=related.some(closing=>(closing.observacao||'').split('\n').some(line=>{
   if(!line.startsWith('[PAGAMENTO_VENDA]'))return false;
   try{const payment=JSON.parse(line.slice('[PAGAMENTO_VENDA]'.length));return !!payment.id&&Number(payment.amount)>0&&inRange(payment.date);}catch{return false;}
  }));
  const scheduled=related.some(closing=>inRange(closing.previsao_entrada)||(Array.isArray(closing.parcelas_datas)?closing.parcelas_datas:[]).some(inRange));
  const carried=includeCarried&&saleDate<start&&related.some(closing=>Number(closing.valor_a_entrar||0)>0&&!['cancelado','recebido'].includes(key(closing.status)));
  return inRange(saleDate)||received||scheduled||carried;
 });
}

// Shared by Vendas and Pagamentos: commission is earned only on collected net money.
export function salesCommissionBalance(rawItems:Venda[],closings:FechamentoDiario[],allSales:Venda[]=rawItems,taxProfile:'opcao1'|'opcao2'='opcao1',recalculateFees=false){
 const items=[...rawItems];
 const reference=items[0];
 const ids=new Set(rawItems.map(item=>item.id)),legacyPairs=new Set(items.map(item=>`${key(item.vendedor)}|${category(item)}`));
 const related=reference?closings.filter(closing=>key(closing.status)!=='cancelado'&&(closing.venda_id?ids.has(closing.venda_id):key(closing.cliente)===key(reference.cliente)&&legacyPairs.has(`${key(closing.vendedor)}|${closingCategory(closing)}`))):[];
 const {getFechamentoCollectedNet}=collectionCalculator(allSales,'0000-01-01','9999-12-31',taxProfile,recalculateFees);
 const bySale=new Map<string,{gross:number;net:number}>(),byLegacyCategory=new Map<string,{gross:number;net:number}>();
 related.forEach(closing=>{const k=closingCategory(closing),target=closing.venda_id?bySale:byLegacyCategory,targetKey=closing.venda_id||k,previous=target.get(targetKey)||{gross:0,net:0};target.set(targetKey,{gross:Math.max(previous.gross,Number(closing.valor_sinal||0),0),net:Math.max(previous.net,getFechamentoCollectedNet(closing))});});
 const linkedCategories=new Set(related.filter(closing=>closing.venda_id).map(closingCategory));
 const closingTotals=[...bySale.values(),...[...byLegacyCategory.entries()].filter(([key])=>!linkedCategories.has(key)).map(([,value])=>value)];
 const totalSold=items.reduce((sum,item)=>sum+Math.max(0,Number(item.valor||0)),0);
 const gross=Math.min(totalSold,closingTotals.reduce((sum,item)=>sum+item.gross,0));
 const net=Math.min(gross,closingTotals.reduce((sum,item)=>sum+item.net,0));
 const earned=+items.reduce((sum,item)=>sum+Number((net*(totalSold>0?Math.max(0,Number(item.valor||0))/totalSold:0)*getSaleCommissionRate(item.origem)).toFixed(2)),0).toFixed(2);
 const paid=+items.reduce((sum,item)=>sum+registeredPaidCommission(item),0).toFixed(2);
 return {items,related,totalSold,gross,net,earned,paid,pending:pendingEarnedCommission(earned,paid)};
}

export function groupSalesCommissionBalances(sales:Venda[],closings:FechamentoDiario[]){
 const groups=new Map<string,Venda[]>();
 sales.forEach(sale=>{const k=[sale.data,sale.cliente.trim().toLowerCase(),sale.vendedor.trim().toLowerCase()].join('|');groups.set(k,[...(groups.get(k)||[]),sale]);});
 return [...groups.entries()].map(([id,items])=>({id,...salesCommissionBalance(items,closings,sales)}));
}
