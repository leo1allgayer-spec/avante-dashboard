import type { Venda } from "@/hooks/useVendas";
import type { FechamentoDiario } from "@/hooks/useFechamentosDiarios";
import { collectionCalculator } from "./collectionCalculator";
import { canonicalizeSaleCategory } from "@/constants/serviceCategories";
import { inRange, validSales, salesSummary, type DateRange } from "./evolutionMetrics";
const nameKey=(value:string)=>value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
export function businessCrossMetrics(sales:Venda[],closings:FechamentoDiario[],range:DateRange) {
 const valid=validSales(sales),current=valid.filter(s=>inRange(s.data,range));
 const previousNames=new Set(valid.filter(s=>s.data<range.start).map(s=>nameKey(s.cliente)).filter(Boolean));
 const buyers=new Set(current.map(s=>nameKey(s.cliente)).filter(Boolean));
 const repeat=[...buyers].filter(n=>previousNames.has(n)).length;
 const calc=collectionCalculator(sales,range.start,range.end),customers=new Map<string,{name:string;revenue:number}>(),categories=new Map<string,{name:string;revenue:number}>();
 closings.filter(c=>!["cancelado","cancelada"].includes(c.status.toLowerCase())).forEach(c=>{
  const amount=calc.getCollectedNetInPeriod(c);if(!amount)return;
  const key=nameKey(c.cliente)||c.id,entry=customers.get(key)||{name:c.cliente||"Não informado",revenue:0};entry.revenue+=amount;customers.set(key,entry);
  const category=canonicalizeSaleCategory(c.categoria||c.produto_servico),bucket=categories.get(category)||{name:category,revenue:0};bucket.revenue+=amount;categories.set(category,bucket);
 });
 current.forEach(s=>{const name=canonicalizeSaleCategory(s.servico||s.produto);if(!categories.has(name))categories.set(name,{name,revenue:0});});
 const sources=[...categories.values()].map(c=>({...c,...salesSummary(current.filter(s=>canonicalizeSaleCategory(s.servico||s.produto)===c.name),range)})).sort((a,b)=>b.revenue-a.revenue);
 const ranked=[...customers.values()].sort((a,b)=>b.revenue-a.revenue),total=ranked.reduce((s,c)=>s+c.revenue,0);
 return {sources,ranked,total,buyers:buyers.size,repeat,firstObserved:buyers.size-repeat,repeatRate:buyers.size?repeat/buyers.size*100:null,top5Share:total>0?ranked.slice(0,5).reduce((s,c)=>s+c.revenue,0)/total*100:null};
}
