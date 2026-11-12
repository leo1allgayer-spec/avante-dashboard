import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEvolutionData } from "@/hooks/useEvolutionData";
import { clientSnapshot, inRange, ratio, revenueSummary, salesSummary, type DateRange } from "@/lib/evolutionMetrics";
import { money } from "@/components/evolution/EvolutionPrimitives";

const leadActionNames = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "offsite_complete_registration_add_meta_leads", "offsite_content_view_add_meta_leads"];
const metaLeads = (actions?: Array<{ action_type: string; value: string }>) => Number(actions?.find(action => leadActionNames.includes(action.action_type))?.value || 0);

export const operationalIndicators = [
  { key: "leads", label: "Leads recebidos", unit: "count", description: "Leads criados no CRM dentro de cada mês." },
  { key: "mql", label: "Leads qualificados (MQL)", unit: "count", description: "MQL do CRM, pela mesma data usada no funil comercial." },
  { key: "scheduled", label: "Reuniões marcadas", unit: "count", description: "Reuniões comerciais pela data agendada; Agenda Closer e CRM sem duplicar vínculos." },
  { key: "held", label: "Reuniões realizadas", unit: "count", description: "Reuniões comerciais concluídas, pela data agendada." },
  { key: "sales", label: "Fechamentos", unit: "count", description: "Compras registradas em Vendas, agrupando itens da mesma compra." },
  { key: "ticket", label: "Ticket médio", unit: "money", description: "Valor contratado nas novas vendas dividido pela quantidade de compras." },
  { key: "cac", label: "CAC da carteira", unit: "money", lower: true, description: "Anúncios com imposto divididos pelos novos clientes com início de contrato. Mesma base do CAC na Evolução; não inclui outros custos comerciais." },
  { key: "costSale", label: "Custo por fechamento", unit: "money", lower: true, description: "Anúncios com imposto divididos pelos fechamentos do mês." },
  { key: "cpl", label: "Custo por lead", unit: "money", lower: true, description: "Anúncios com imposto divididos pelos leads recebidos do CRM." },
  { key: "cpmql", label: "Custo por MQL", unit: "money", lower: true, description: "Anúncios com imposto divididos pelos MQL do CRM." },
  { key: "costScheduled", label: "Custo por reunião marcada", unit: "money", lower: true, description: "Anúncios com imposto divididos pelas reuniões agendadas." },
  { key: "costHeld", label: "Custo por reunião realizada", unit: "money", lower: true, description: "Anúncios com imposto divididos pelas reuniões concluídas." },
  { key: "investment", label: "Investimento em anúncios", unit: "money", description: "Investimento em anúncios acrescido de 12,25% de imposto." },
  { key: "mqlRate", label: "Taxa de MQL", unit: "percent", description: "MQL divididos pelos leads recebidos, em percentual." },
  { key: "attendance", label: "Taxa de reuniões realizadas", unit: "percent", description: "Reuniões realizadas divididas pelas agendadas, em percentual." },
  { key: "conversion", label: "Conversão de leads em vendas", unit: "percent", description: "Fechamentos divididos pelos leads do mês. Relação entre volumes, sem acompanhamento individual de cada lead." },
  { key: "roas", label: "ROAS", unit: "multiple", description: "Faturamento coletado líquido dividido pelo investimento em anúncios com imposto." },
] as const;

type Month = DateRange & { label: string };
export default function OperationalHistoryPanel({ indicatorKey, months, ongoing }: { indicatorKey: string; months: Month[]; ongoing: boolean }) {
  const range = useMemo(() => ({start: months[5].start, end: months[0].end}), [months]);
  const d = useEvolutionData(range);
  const indicator = operationalIndicators.find(i => i.key === indicatorKey)!;
  const format = (value: number | null) => value == null ? "Dados indisponíveis" : indicator.unit === "money" ? money(value) : `${value.toLocaleString("pt-BR", {maximumFractionDigits: indicator.unit === "count" ? 0 : 1})}${indicator.unit === "percent" ? "%" : indicator.unit === "multiple" ? "x" : ""}`;
  const cells = months.map(month => {
    const investment = d.investment(month);
    const crmLeads = d.leads(month);
    const metaLeadsInRange = d.meta.data?.dailyInsights
      .filter(item => inRange(item.date_start, month))
      .reduce((sum, item) => sum + metaLeads(item.actions), 0) ?? null;
    const leads = crmLeads != null ? crmLeads : metaLeadsInRange;
    const mql = d.crm.data?.daily ? Object.entries(d.crm.data.daily).filter(([date]) => inRange(date,month)).reduce((sum,[,value]) => sum + Number(value || 0),0) : null;
    const meetings = d.meetingCounts(month);
    const sales = d.sales.data ? salesSummary(d.sales.data, month) : null;
    const clients = d.clients.data ? clientSnapshot(d.clients.data, month) : null;
    const collected = d.sales.data && d.closings.data ? revenueSummary(d.sales.data,d.closings.data,month).total : null;
    const percentage = (a:number|null,b:number|null) => {const value=ratio(a,b);return value == null ? null : value * 100;};
    const values: Record<string,number|null> = {
      leads,mql,scheduled:meetings.scheduled,held:meetings.held,sales:sales?.count ?? null,ticket:sales?.ticket ?? null,
      cac:ratio(investment,clients?.joined ?? null),costSale:ratio(investment,sales?.count ?? null),
      cpl:ratio(investment,leads),cpmql:ratio(investment,mql),costScheduled:ratio(investment,meetings.scheduled),costHeld:ratio(investment,meetings.held),
      investment,mqlRate:percentage(mql,leads),attendance:percentage(meetings.held,meetings.scheduled),conversion:percentage(sales?.count ?? null,leads),roas:ratio(collected,investment),
    };
    return {...month,value:values[indicator.key]};
  });
  const pending = [d.crm,d.meta,d.agenda,d.sales,d.closings,d.clients].some(q=>q.isFetching);
  const current = cells[0], previous = cells[1];
  const best = cells.reduce((winner, cell, index) => cell.value != null && cell.value > (winner.value ?? -Infinity) ? { value: cell.value, index } : winner, { value: null as number | null, index: 0 });
  const change = current?.value != null && previous?.value != null && previous.value > 0 ? (current.value / previous.value - 1) * 100 : null;
  const insights = [
    change == null ? "Ainda não há base válida para comparar com o mês anterior." : `${change >= 0 ? "Aumentou" : "Diminuiu"} ${Math.abs(change).toLocaleString("pt-BR", {maximumFractionDigits:1})}% em relação a ${months[1].label}.`,
    best.value == null ? "Não há dados suficientes para apontar o melhor mês." : `Melhor resultado dos seis meses: ${months[best.index].label}, com ${format(best.value)}.`,
    indicator.lower ? "Para este indicador, uma redução representa melhora de eficiência." : "Para este indicador, um aumento representa crescimento do resultado.",
  ];
  return <div>
    <h3 className="text-lg font-semibold">{indicator.label}</h3><p className="mt-2 mb-5 text-sm text-muted-foreground">{indicator.description}</p>
    <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="mb-3 text-sm font-semibold">Insights de {indicator.label}</p><div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">{insights.map((insight,index)=><p key={index} className="flex gap-2"><span className="text-primary">→</span><span>{insight}</span></p>)}</div></div>
    {pending && <p className="mb-3 text-xs text-muted-foreground">Atualizando indicadores...</p>}
    <div className="mb-6 h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...cells].reverse()}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))"/><XAxis dataKey="label" tick={{fontSize:11}}/><YAxis width={64} tick={{fontSize:11}} tickFormatter={v=>new Intl.NumberFormat("pt-BR",{notation:"compact"}).format(v)}/><Tooltip contentStyle={{background:"hsl(var(--popover))",borderColor:"hsl(var(--border))",borderRadius:12}} formatter={(v:number)=>format(v)}/><Bar dataKey="value" name={indicator.label} fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={48}/></BarChart></ResponsiveContainer></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cells.map((cell,index)=>{
      const previous=cells[index+1]?.value;
      const diff=cell.value != null && previous != null && previous > 0 ? (cell.value/previous-1)*100 : null;
      const improved=diff != null && ("lower" in indicator ? diff < 0 : diff > 0);
      return <article key={cell.start} className={`rounded-xl border p-5 ${index===0 ? "border-primary/50 bg-primary/5" : "border-border bg-secondary/10"}`}><div className="mb-3 flex flex-wrap justify-between gap-2"><h4 className="font-semibold capitalize">{cell.label}</h4>{index===0 && <span className="text-xs text-primary">Mês selecionado</span>}</div><p className="text-xs text-muted-foreground">{ongoing && index===0 ? "Acumulado do mês em andamento" : "Resultado do mês completo"}</p><p className="mt-2 text-2xl font-bold tabular-nums">{format(cell.value)}</p>{index<5 && <p className={`mt-4 border-t border-border pt-3 text-sm ${diff == null || diff===0 ? "text-muted-foreground" : improved ? "text-success" : "text-amber-500"}`}>{diff==null ? "Sem base para variação percentual" : `${diff>0?"+":""}${diff.toLocaleString("pt-BR",{maximumFractionDigits:1})}% em relação ao mês anterior`}</p>}</article>;
    })}</div><p className="mt-4 text-xs text-muted-foreground">Indicadores sem dados ou sem denominador válido ficam indisponíveis, sem serem tratados como zero.</p>
  </div>;
}
