import {collectionCalculator} from '../src/lib/collectionCalculator';
import {creativeSalesRoas} from '../src/lib/creativeSalesRoas';
import {crmMeetingAgenda,localMeetingAgenda} from '../src/lib/crmMeetingAgenda';
const norm=(v:any)=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const active=(v:any)=>!['cancelada','cancelado','recusada','recusado'].includes(norm(v));
const round=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
export function weeklyMetrics(data:any,since:string,until:string,ads:any,mql:any,creatives:any){
 const inside=(date:string)=>date>=since&&date<=until;
 const rows=data.vendas.filter((v:any)=>inside(v.data)&&active(v.status));
 const calculator=collectionCalculator(data.vendas,since,until);
 const closings=data.fechamentos_diarios.filter((v:any)=>active(v.status));
 const net=round(closings.reduce((s:number,v:any)=>s+calculator.getCollectedNetInPeriod(v),0));
 const gross=round(closings.reduce((s:number,v:any)=>s+calculator.getCollectedGrossInPeriod(v),0));
 const sold=round(rows.reduce((s:number,v:any)=>s+Number(v.valor||0),0));
 const meetings=data.meetings.filter((m:any)=>inside(m.date)&&(m.external_id?crmMeetingAgenda(m.responsible,m.meeting_type):localMeetingAgenda(m.agenda_category||'reunioes',m.responsible,m.meeting_type))==='reunioes');
 const spend=ads?.accountInsights?.spend!=null?Number(ads.accountInsights.spend):null;
 const approvedItems=rows.filter((v:any)=>['aprovada','pago','paga'].includes(norm(v.status))).length;
 const pending=meetings.filter((m:any)=>m.status==='pending').length;
 const closed=meetings.filter((m:any)=>m.status==='completed'&&(m.closing_status==='closed'||m.has_closing===true)).length;
 const notClosed=meetings.filter((m:any)=>m.status==='completed'&&m.closing_status==='not_closed').length;
 const meetingByResponsible=[...new Set(meetings.map((m:any)=>m.responsible||'Não informado'))].map(name=>{const items=meetings.filter((m:any)=>(m.responsible||'Não informado')===name);return {name,scheduled:items.length,held:items.filter((m:any)=>m.status==='completed').length,pending:items.filter((m:any)=>m.status==='pending').length,cancelled:items.filter((m:any)=>m.status==='cancelled').length};});
 const conversations=ads?.accountInsights?Number((ads.accountInsights.actions||[]).find((a:any)=>a.action_type==='onsite_conversion.messaging_conversation_started_7d')?.value||0):null;
 const origins=[...new Set(rows.map((v:any)=>v.origem||'Não informado'))].map(name=>({name,sold:round(rows.filter((v:any)=>(v.origem||'Não informado')===name).reduce((s:number,v:any)=>s+Number(v.valor||0),0))})).sort((a,b)=>b.sold-a.sold);
 const adRows=creatives?.rows||[];
 const attribution=creativeSalesRoas(adRows.map((a:any)=>({ad_id:a.ad_id,ad_name:a.ad_name,spend:Number(a.spend||0)})),data.vendas,data.criativos_vendas,since,until);
 const topCreatives=adRows.map((a:any)=>({...attribution.byAd.get(a.ad_id),name:a.ad_name,spend:Number(a.spend||0)})).filter((a:any)=>a.count>0).sort((a:any,b:any)=>b.revenue-a.revenue).slice(0,3);
 return {since,until,sold,net,gross,approvedItems,cac:spend!=null&&approvedItems?round(spend/approvedItems):null,roasGeneral:spend?net/spend:null,roasSold:spend?sold/spend:null,pending,closed,notClosed,meetingByResponsible,fees:round(gross-net),items:rows.length,ticket:rows.length?round(sold/rows.length):null,orders:new Set(rows.map((v:any)=>[v.data,norm(v.cliente),norm(v.vendedor)].join('|'))).size,meetings:meetings.length,held:meetings.filter((m:any)=>m.status==='completed').length,cancelled:meetings.filter((m:any)=>m.status==='cancelled').length,spend,conversations,leads:mql?.leadsComplete?Object.values(mql.leadsDaily||{}).reduce((s:number,n:any)=>s+Number(n),0):null,mql:mql?.total??null,origins,topCreatives,unattributed:attribution.unattributedCount};
}
const money=(v:any)=>v==null?'não disponível':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=(v:string)=>v.split('-').reverse().join('/');
const delta=(v:number,p:number)=>p?`${((v/p-1)*100).toLocaleString('pt-BR',{maximumFractionDigits:1,signDisplay:'always'})}%`:p===0&&v===0?'0%':'sem base anterior';
export function weeklyMessage(current:any,previous:any){
 const c=current,p=previous;
 const lines=[`📊 *Relatório comercial semanal — Avante*`,`📅 ${date(c.since)} a ${date(c.until)}`,`Comparação: ${date(p.since)} a ${date(p.until)}`,'',`💰 *Vendas e recebimentos*`,`• Total vendido: ${money(c.sold)} (${delta(c.sold,p.sold)})`,`• Recebido líquido no período: ${money(c.net)} (${delta(c.net,p.net)})`,`• Taxas descontadas: ${money(c.fees)}`,`• Itens vendidos: ${c.items} (${delta(c.items,p.items)})`,`• Vendas agrupadas por cliente/data/vendedor: ${c.orders}`,`• Ticket médio por item: ${money(c.ticket)}${c.ticket!=null&&p.ticket!=null?` (${delta(c.ticket,p.ticket)})`:''}`,'',`📞 *Funil comercial*`,`• Leads CRM: ${c.leads??'não disponível'}`,`• Leads qualificados (MQL): ${c.mql??'não disponível'}`,`• Reuniões agendadas para a semana: ${c.meetings}`,`• Realizadas: ${c.held} | Canceladas: ${c.cancelled}`,'',`📣 *Anúncios*`,`• Investimento: ${money(c.spend)}`,`• Conversas iniciadas (Meta): ${c.conversations??'não disponível'}`,`• Custo por conversa: ${money(c.spend!=null&&c.conversations>0?c.spend/c.conversations:null)}`,'',`🧭 *Origem das vendas*`,...c.origins.map((o:any)=>`• ${o.name}: ${money(o.sold)}`),'',`🎨 *Criativos com vendas vinculadas*`,...(c.topCreatives.length?c.topCreatives.map((a:any)=>`• ${a.name}: ${a.count} item(ns), ${money(a.revenue)} vendidos | investido ${money(a.spend)} | ROAS registrado ${a.roas!=null?a.roas.toFixed(2)+'x':'sem base de gasto'}`):['• Nenhuma venda com vínculo identificável no período.']),`• Itens sem vínculo com criativo: ${c.unattributed}`,'',`🔎 *Leitura da semana*`,c.sold>p.sold?'• O valor vendido aumentou frente à semana anterior.':c.sold<p.sold?'• O valor vendido caiu frente à semana anterior.':'• O valor vendido ficou estável frente à semana anterior.',c.ticket!=null&&p.ticket!=null?`• O ticket médio por item ${c.ticket>p.ticket?'subiu':c.ticket<p.ticket?'caiu':'ficou estável'}.`: '• Ainda não há base para comparar o ticket.',c.unattributed?`• Vincular os ${c.unattributed} itens sem criativo melhora a análise dos anúncios.`:'• As vendas do período têm vínculo identificável com criativo.','',`Fonte: dashboard Avante, Meta e CRM. Recebimentos incluem vendas antigas pagas na semana. Ticket por item segue o Dashboard TV. Reuniões seguem a data agendada. MQL usa a qualificação atual dos leads criados no período. ROAS registrado usa vendas vinculadas ÷ gasto e não representa lucro. Contratos recorrentes fora de Vendas não foram somados.`];
 lines.splice(lines.indexOf('🧭 *Origem das vendas*')-1,0,
  `• CAC (gasto ÷ itens aprovados): ${money(c.cac)}`,
  `• ROAS geral (recebido líquido ÷ anúncios): ${c.roasGeneral==null?'não disponível':c.roasGeneral.toFixed(2)+'x'}`,
  `• Relação vendido ÷ anúncios: ${c.roasSold==null?'não disponível':c.roasSold.toFixed(2)+'x'}`,
  '',`🤝 *Detalhamento de reuniões*`,
  `• Pendentes de resultado: ${c.pending}`,
  `• Fechadas nas realizadas: ${c.closed} | Não fechadas: ${c.notClosed} | Sem resultado comercial: ${c.held-c.closed-c.notClosed}`,
  `• Custo global por reunião agendada: ${money(c.spend!=null&&c.meetings?c.spend/c.meetings:null)}`,
  `• Custo global por reunião realizada: ${money(c.spend!=null&&c.held?c.spend/c.held:null)}`,
  ...c.meetingByResponsible.map((r:any)=>`• ${r.name}: ${r.scheduled} agendadas, ${r.held} realizadas, ${r.pending} pendentes, ${r.cancelled} canceladas`));
 return lines.join('\n');
}
