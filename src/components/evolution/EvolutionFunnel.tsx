import { ratio } from "@/lib/evolutionMetrics";
import { Section, Metric, money, percent, number } from "./EvolutionPrimitives";

export default function EvolutionFunnel({ leads, mql, scheduled, held, sales, ticket, investment, previous }: {
  leads: number | null; mql: number | null; scheduled: number | null; held: number | null; sales: number | null; ticket: number | null; investment: number | null;
  previous: { leads: number | null; mql: number | null; scheduled: number | null; held: number | null; sales: number | null };
}) {
  const stages = [
    { title: "Leads recebidos", value: leads, color: "#3b82f6", hint: "Leads criados no CRM no período" },
    { title: "Leads qualificados (MQL)", value: mql, color: "#a855f7", hint: "MQL do CRM no período · custo = anúncios com imposto ÷ MQL" },
    { title: "Contatados", value: null, color: "#6366f1", hint: "Falta a data do primeiro contato na integração" },
    { title: "Reuniões agendadas", value: scheduled, color: "#8b5cf6", hint: "Agenda Closer + CRM, sem duplicar vínculos" },
    { title: "Reuniões realizadas", value: held, color: "#06b6d4", hint: "Reuniões concluídas, pela data agendada" },
    { title: "Propostas", value: null, color: "#14b8a6", hint: "Falta o histórico de propostas enviadas no CRM" },
    { title: "Vendas", value: sales, color: "#10b981", hint: "Compras registradas em Vendas no período" },
  ];
  const largest = Math.max(1, ...stages.map(s => s.value || 0));
  const old = [previous.leads, previous.mql, null, previous.scheduled, previous.held, null, previous.sales];
  const leadRate = ratio(sales, leads), meetingRate = ratio(sales, held);
  return <Section title="Funil comercial" description="Volumes do período. As etapas podem incluir pessoas diferentes; as taxas são relações entre volumes, não conversão de uma mesma turma de leads.">
    <div className="space-y-3">{stages.map((stage, index) => {
      const rate = ratio(stage.value, index === 0 ? leads : stages[index - 1].value);
      const cost = ratio(investment, stage.value);
      return <div key={stage.title} className="rounded-xl border border-border/40 bg-background/40 p-4">
        <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_150px_130px]">
          <div className="min-w-0"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{stage.title}</span><strong className={stage.value == null ? "text-xs text-muted-foreground" : "text-xl tabular-nums"}>{number(stage.value)}</strong></div>
            <div className="h-3 overflow-hidden rounded-full bg-muted/40" aria-hidden="true"><div className="h-full rounded-full" style={{ width: `${(stage.value || 0) / largest * 100}%`, background: `linear-gradient(90deg, ${stage.color}66, ${stage.color})` }}/></div><p className="mt-2 text-[11px] text-muted-foreground">{stage.hint}{stage.value != null && old[index] != null ? ` · Anterior: ${number(old[index])}` : ""}</p></div>
          <div><p className="text-[11px] text-muted-foreground">{index === 1 ? "Custo por MQL" : "Custo por etapa"}</p><p className="mt-1 text-sm font-medium">{money(cost)}</p></div>
          <div><p className="text-[11px] text-muted-foreground">% da etapa anterior</p><p className="mt-1 text-sm font-medium">{percent(rate == null ? null : rate * 100)}</p></div>
        </div>
      </div>;
    })}</div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric title="Lead → Venda" value={percent(leadRate == null ? null : leadRate * 100)} detail="Vendas ÷ leads recebidos"/><Metric title="Reunião → Venda" value={percent(meetingRate == null ? null : meetingRate * 100)} detail="Vendas do período ÷ reuniões realizadas; sem vínculo individual"/><Metric title="Ticket de novas vendas" value={money(ticket)} detail="Valor contratado nas novas vendas ÷ compras"/></div>
  </Section>;
}
