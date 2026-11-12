import type {Venda} from '@/hooks/useVendas';
import type {FechamentoDiario} from '@/hooks/useFechamentosDiarios';
import {canonicalizeSaleCategory} from '@/constants/serviceCategories';
import {collectionCalculator} from './collectionCalculator';
import {registeredPaidCommission,pendingEarnedCommission} from './salesCommissionPayments';

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
 const consolidated=new Map<string,Venda>();
 [...rawItems].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).forEach(item=>{
  const categoryKey=category(item),previous=consolidated.get(categoryKey);
  const duplicate=previous&&(Boolean(previous.aluno_futuro_id)!==Boolean(item.aluno_futuro_id)||(Boolean(previous.aluno_futuro_id)&&previous.aluno_futuro_id===item.aluno_futuro_id));
  if(!previous)consolidated.set(categoryKey,item);
  else if(duplicate){const preferred=Number(item.valor||0)>Number(previous.valor||0)?item:previous;consolidated.set(categoryKey,{...preferred,valor:Math.max(Number(previous.valor||0),Number(item.valor||0)),comissao:Math.max(Number(previous.comissao||0),Number(item.comissao||0)),comissao_paga_valor:Math.max(registeredPaidCommission(previous),registeredPaidCommission(item))});}
  else consolidated.set(`${categoryKey}|${item.id}`,item);
 });
 const items=[...consolidated.values()];
 const reference=items[0];
 const ids=new Set(rawItems.map(item=>item.id)),categories=new Set(items.map(category));
 const related=reference?closings.filter(closing=>key(closing.status)!=='cancelado'&&(closing.venda_id?ids.has(closing.venda_id):key(closing.cliente)===key(reference.cliente)&&key(closing.vendedor)===key(reference.vendedor)&&categories.has(closingCategory(closing)))):[];
 const {getFechamentoCollectedNet}=collectionCalculator(allSales,'0000-01-01','9999-12-31',taxProfile,recalculateFees);
 const byCategory=new Map<string,{gross:number;net:number}>();
 related.forEach(closing=>{const k=closingCategory(closing),previous=byCategory.get(k)||{gross:0,net:0};byCategory.set(k,{gross:Math.max(previous.gross,Number(closing.valor_sinal||0),0),net:Math.max(previous.net,getFechamentoCollectedNet(closing))});});
 const totalSold=items.reduce((sum,item)=>sum+Math.max(0,Number(item.valor||0)),0);
 const gross=Math.min(totalSold,[...byCategory.values()].reduce((sum,item)=>sum+item.gross,0));
 const net=Math.min(gross,[...byCategory.values()].reduce((sum,item)=>sum+item.net,0));
 const earned=+items.reduce((sum,item)=>sum+Number((net*(totalSold>0?Math.max(0,Number(item.valor||0))/totalSold:0)*(key(item.origem)==='social seller'?0.10:0.15)).toFixed(2)),0).toFixed(2);
 const paid=+items.reduce((sum,item)=>sum+registeredPaidCommission(item),0).toFixed(2);
 return {items,related,totalSold,gross,net,earned,paid,pending:pendingEarnedCommission(earned,paid)};
}

export function groupSalesCommissionBalances(sales:Venda[],closings:FechamentoDiario[]){
 const groups=new Map<string,Venda[]>();
 sales.forEach(sale=>{const k=[sale.data,sale.cliente.trim().toLowerCase(),sale.vendedor.trim().toLowerCase()].join('|');groups.set(k,[...(groups.get(k)||[]),sale]);});
 return [...groups.entries()].map(([id,items])=>({id,...salesCommissionBalance(items,closings,sales)}));
}
