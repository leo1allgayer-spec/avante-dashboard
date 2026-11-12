import type { Client } from "@/types/clients/client";
import { getAlertStatus, getMonthlyContractValue } from "@/types/clients/client";
import { inRange, type DateRange } from "./evolutionMetrics";
export function clientAnalytics(clients: Client[], range: DateRange) {
  const active=clients.filter(c=>c.status==="Ativo");
  const billable=active.filter(c=>c.paymentStatus!=="permuta");
  const overdue=billable.filter(c=>c.paymentStatus==="atrasado");
  const activity=[{name:"Rotinas em dia",value:0},{name:"Rotinas atrasadas",value:0},{name:"Sem datas completas",value:0}];
  active.forEach(c=>{if(!c.lastBalanceDate||!c.lastReportDate)activity[2].value++;else if(getAlertStatus(c.lastBalanceDate)==="late"||getAlertStatus(c.lastReportDate)==="late")activity[1].value++;else activity[0].value++;});
  const services=new Map<string,number>();
  clients.forEach(c=>new Set((c.servicesDescription||"").split(/[\n;,]+/).map(s=>s.trim()).filter(Boolean)).forEach(s=>services.set(s,(services.get(s)||0)+1)));
  return {active:active.length,paused:clients.length-active.length,overdue:overdue.length,
    overdueRate:billable.length ? overdue.length/billable.length*100:null,
    exposedMonthly:overdue.reduce((s,c)=>s+getMonthlyContractValue(c),0),
    missingValues:overdue.filter(c=>getMonthlyContractValue(c)<=0).length,
    newClients:clients.filter(c=>inRange(c.startDate,range)).length,
    missingStarts:clients.filter(c=>!c.startDate).length,
    noRenewal:active.filter(c=>c.contractRenewal==="nao").length,
    activity, services:[...services].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value),
    satisfaction:["muito_satisfeito","satisfeito","neutro","insatisfeito","muito_insatisfeito","nao_avaliado"].map((key,i)=>({name:["Muito satisfeito","Satisfeito","Neutro","Insatisfeito","Muito insatisfeito","Não avaliado"][i],value:clients.filter(c=>(c.satisfaction||"nao_avaliado")===key).length})),
    renewal:["sim","nao","em_negociacao","nao_definido"].map((key,i)=>({name:["Vai renovar","Não vai renovar","Em negociação","Não definido"][i],value:clients.filter(c=>(c.contractRenewal||"nao_definido")===key).length})),
  };
}
