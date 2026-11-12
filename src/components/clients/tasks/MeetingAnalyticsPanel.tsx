import MonthYearSelect from "@/components/MonthYearSelect";
import { useState } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { BarChart3, Settings2 } from "lucide-react";
import { toast } from "sonner";
import type { Meeting } from "@/types/clients/task";
import { defaultMeetingAnalytics, meetingAnalytics, meetingRatio, type MeetingAnalyticsSettings } from "@/lib/meetingAnalytics";
import { useMeetingMonthlyMetrics, useSaveMeetingMonthlyMetrics } from "@/hooks/clients/useMeetingMetrics";
import { useMeetingAdInvestment } from "@/hooks/clients/useMeetingAdInvestment";
import MeetingSalesFunnel from "@/components/charts/MeetingSalesFunnel";
import { useVendas } from "@/hooks/useVendas";
import { saleMethodAnalytics } from "@/lib/saleMethodAnalytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const count = (value: number | null) => value == null ? "—" : value.toLocaleString("pt-BR");
const percent = (value: number | null) => value == null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const money = (value: number | null) => value == null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MeetingAnalyticsPanel({ meetings, syncing }: { meetings: Meeting[]; syncing?: boolean }) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const [periodDate, setPeriodDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const periodStart = period === "month" ? `${month}-01` : period === "week" ? format(startOfWeek(new Date(`${periodDate}T12:00:00`), { weekStartsOn: 1 }), "yyyy-MM-dd") : periodDate;
  const periodEnd = period === "month" ? format(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0), "yyyy-MM-dd") : period === "week" ? format(endOfWeek(new Date(`${periodDate}T12:00:00`), { weekStartsOn: 1 }), "yyyy-MM-dd") : periodDate;
  const { data, isLoading, error } = useMeetingMonthlyMetrics(month);
  const adInvestment = useMeetingAdInvestment(month, { since: periodStart, until: periodEnd });
  const save = useSaveMeetingMonthlyMetrics();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MeetingAnalyticsSettings>(defaultMeetingAnalytics);
  const [manual, setManual] = useState({ meetings_scheduled: 0, meetings_held: 0 });
  const settings = { ...defaultMeetingAnalytics, ...data?.analytics };
  const investment = adInvestment.isError ? null : adInvestment.data?.investment ?? null;
  const commercialMeetings = meetings.filter((meeting) => {
    const type = (meeting.meetingType || "reuniao").toLocaleLowerCase("pt-BR");
    const commercial = ["reuniao", "reunião", "call", "comercial"].some((value) => type.includes(value));
    return meeting.agendaCategory === "reunioes" && commercial && meeting.date >= periodStart && meeting.date <= periodEnd;
  });
  const result = meetingAnalytics(commercialMeetings, month, { ...settings, investment }, data || manual);
  const sales = useVendas();
  const saleResults = saleMethodAnalytics(sales.data || [], periodStart, periodEnd);
  const closed = sales.isPending || sales.isError ? null : saleResults.closedMeetings;
  const conversionRate = meetingRatio(closed, result.held);
  const revenue = closed == null ? null : saleResults.meetingRevenue;
  const averageTicket = revenue == null || !closed ? null : revenue / closed;
  const cac = closed == null || closed === 0 || investment == null ? null : investment / closed;
  const roi = revenue == null || investment == null || investment <= 0 ? null : ((revenue - investment) / investment) * 100;
  const goalScheduled = settings.scheduledGoal ?? (data?.scheduling_goal || null);
  const startEdit = () => {
    setForm({ ...settings, scheduledGoal: goalScheduled });
    setManual({ meetings_scheduled: data?.meetings_scheduled || 0, meetings_held: data?.meetings_held || 0 });
    setOpen(true);
  };
  const persist = async () => {
    const invalid = Object.entries(form).some(([key, value]) => key !== "mode" && value != null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || (key.endsWith("Target") && value > 100) || (!key.endsWith("Target") && key !== "investment" && !Number.isInteger(value))));
    if (invalid) { toast.error("Use quantidades inteiras, valores não negativos e metas de taxas entre 0 e 100%."); return; }
    const issues = meetingAnalytics(meetings, month, form, manual).issues;
    if (issues.length) { toast.error(issues[0]); return; }
    try {
      await save.mutateAsync({ month, scheduling_goal: data?.scheduling_goal || 0, cost_per_scheduling: data?.cost_per_scheduling || 0, ...manual, analytics: form });
      setOpen(false); toast.success("Metas e lançamentos salvos para este mês.");
    } catch (err) { toast.error("Erro ao salvar métricas", { description: err instanceof Error ? err.message : String(err) }); }
  };
  const numericField = (key: keyof Omit<MeetingAnalyticsSettings, "mode">, label: string, fractional = false) => <div key={key} className="space-y-1.5"><Label htmlFor={`metric-${key}`}>{label}</Label><Input id={`metric-${key}`} type="number" min="0" max={key.endsWith("Target") ? 100 : undefined} step={fractional ? "0.01" : "1"} placeholder="Não informado" value={form[key] ?? ""} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value === "" ? null : Number(e.target.value) }))} /></div>;
  const rateRows = [
    ["Agendamento", result.schedulingRate, settings.schedulingTarget, "Marcadas ÷ leads", false],
    ["Comparecimento", result.attendanceRate, settings.attendanceTarget, "Realizadas ÷ marcadas", false],
    ["Não comparecimento", result.noShowRate, settings.noShowTarget, "Faltas ÷ marcadas", true],
    ["Cancelamento", result.cancellationRate, settings.cancellationTarget, "Canceladas ÷ marcadas", true],
    ["Reagendamento", result.reschedulingRate, settings.reschedulingTarget, "Reagendadas ÷ marcadas", true],
  ] as const;

  return <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-5">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div><h3 className="flex items-center gap-2 font-semibold"><BarChart3 className="h-5 w-5 text-primary" /> Métricas de Reuniões</h3><p className="text-xs text-muted-foreground mt-1">Resumo mensal apenas das reuniões agendadas na Agenda Closer.</p></div>
      <div className="flex flex-wrap items-center gap-2"><Label htmlFor="meeting-metrics-period">Período</Label><Select value={period} onValueChange={(value: "day" | "week" | "month") => setPeriod(value)}><SelectTrigger id="meeting-metrics-period" className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">Dia</SelectItem><SelectItem value="week">Semana</SelectItem><SelectItem value="month">Mês</SelectItem></SelectContent></Select>{period === "month" ? <MonthYearSelect label="Mês das métricas" value={month} onChange={setMonth} /> : <Input aria-label="Data das métricas" type="date" className="w-40" value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} />}<Button variant="outline" disabled={isLoading || !!error} onClick={startEdit}><Settings2 className="h-4 w-4 mr-2" /> Metas e lançamentos</Button></div>
    </div>
    {error ? <p role="alert" className="text-destructive">Não foi possível carregar os lançamentos deste mês. Atualize a página para tentar novamente.</p> : isLoading ? <p className="text-sm text-muted-foreground">Carregando métricas...</p> : <>
      <p className="text-xs text-muted-foreground">{settings.mode === "agenda" ? "Volumes: somente reuniões comerciais agendadas na Agenda Closer, pela data marcada. Captações, ligações e suportes não entram neste painel." : "Volumes: totais lançados manualmente nesta conta."} {syncing && "Atualizando dados do CRM…"} Investimento automático: anúncios + imposto do mês, na mesma base da Visão Geral. Metas, leads, faltas e reagendamentos são lançamentos mensais desta conta.</p>
      {adInvestment.isLoading && <p className="text-xs text-muted-foreground">Carregando investimento em anúncios...</p>}
      {adInvestment.isError && <p role="alert" className="text-sm text-amber-500">Não foi possível carregar o investimento. <button className="underline" onClick={() => adInvestment.refetch()}>Tentar novamente</button></p>}
      {adInvestment.data?.fallback && <p className="text-xs text-amber-500">Meta Ads indisponível: usando os valores de anúncios registrados no dashboard.</p>}
      {result.issues.length > 0 && <div role="alert" className="rounded-lg border border-amber-500/40 p-3 text-sm text-amber-500">{result.issues.join(" ")}</div>}
      <MeetingSalesFunnel since={periodStart} until={periodEnd} investment={investment} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Reuniões marcadas", count(result.scheduled), "Total do mês selecionado"],
          ["Reuniões realizadas", count(result.held), "Resultado registrado como concluído"],
          ["Não comparecimento", count(result.noShows), "Faltas informadas pela equipe"],
          ["Canceladas", count(result.cancelled), "Cancelamentos no período"],
          ["Reagendadas", count(result.rescheduled), "Reuniões distintas; não somar às marcadas"],
          ["Leads trabalhados", count(settings.leads), "Base informada para agendamento"],
          ["Investimento em anúncios", money(investment), "Anúncios + imposto de 12,25% • automático"],
          ["Custo por reunião marcada", money(result.costScheduled), "Investimento ÷ marcadas"],
          ["Custo por reunião realizada", money(result.costHeld), "Investimento ÷ realizadas"],
          ["Aguardando resultado", count(result.pending), "Marcadas − realizadas − canceladas − faltas"],
        ].map(([label, value, help]) => <div key={label} className="rounded-lg border bg-background/40 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-2 text-[11px] text-muted-foreground">{help}</p></div>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Fechamentos", count(closed), "Forma de venda: na reunião + depois · planilha de Vendas"],
          ["Fechou na reunião", count(closed == null ? null : saleResults.atMeeting), "Forma de venda lançada em Vendas"],
          ["Fechou depois", count(closed == null ? null : saleResults.afterMeeting), "Forma de venda lançada em Vendas"],
          ["Taxa de fechamento", percent(conversionRate), "Fechamentos ÷ realizadas"],
          ["Comparecimento", percent(result.attendanceRate), "Realizadas ÷ marcadas"],
          ["Receita gerada", money(revenue), "Valor vendido por reunião na planilha de Vendas"],
          ["Custo total", money(investment), "Investimento em anúncios"],
          ["Lucro", revenue == null || investment == null ? "—" : money(revenue - investment), "Receita − custo total"],
          ["Ticket médio", money(averageTicket), "Receita ÷ fechamentos"],
          ["CAC", money(cac), "Custo total ÷ fechamentos"],
          ["ROI", percent(roi), "(Receita − custo) ÷ custo"],
        ].map(([label, value, help]) => <div key={label} className="rounded-lg border bg-background/40 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-2 text-[11px] text-muted-foreground">{help}</p></div>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[["Meta de reuniões marcadas", result.scheduled, goalScheduled], ["Meta de reuniões realizadas", result.held, settings.heldGoal]].map(([label, actual, goal]) => {
          const progress = meetingRatio(actual as number, goal as number | null);
          return <div key={label} className="rounded-lg border p-4"><div className="flex justify-between gap-3 text-sm"><span>{label}</span><strong>{count(actual as number)} / {count(goal as number | null)}</strong></div><div className="my-3 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(progress || 0, 100)}%` }} /></div><p className="text-xs text-muted-foreground">{progress == null ? "Defina uma meta para acompanhar o progresso." : `${percent(progress)} da meta • Faltam ${Math.max(0, (goal as number) - (actual as number))}`}</p></div>;
        })}
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-3 pr-4">Etapa / fórmula × 100</th><th className="pr-4">Taxa atual</th><th className="pr-4">Meta ideal</th><th>Situação</th></tr></thead><tbody>{rateRows.map(([label, rate, target, formula, lower]) => <tr key={label} className="border-b last:border-0"><td className="py-3 pr-4 font-medium">{label}<p className="text-xs font-normal text-muted-foreground">{formula}</p></td><td className="pr-4">{percent(rate)}</td><td className="pr-4">{target == null ? "Não definida" : `${lower ? "Até" : "Pelo menos"} ${percent(target)}`}</td><td className={rate != null && target != null ? (lower ? rate <= target : rate >= target) ? "text-emerald-500" : "text-amber-500" : "text-muted-foreground"}>{rate == null ? "Sem base de cálculo" : target == null ? "Definir meta" : (lower ? rate <= target : rate >= target) ? "Dentro da meta" : "Abaixo do objetivo"}</td></tr>)}</tbody></table></div>
      <p className="text-xs text-muted-foreground">Taxas parciais enquanto houver reuniões aguardando resultado. Reagendamento pode coexistir com realização, falta ou cancelamento. “—” indica ausência de dado ou denominador zero. As taxas ideais são definidas pela equipe.</p>
    </>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-lenis-prevent><DialogHeader><DialogTitle>Metas e lançamentos · {month.split("-").reverse().join("/")}</DialogTitle></DialogHeader>
      <div className="space-y-4"><Label>Origem dos volumes</Label><Select value={form.mode} onValueChange={(mode: "agenda" | "manual") => setForm((current) => ({ ...current, mode }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="agenda">Calcular pela agenda</SelectItem><SelectItem value="manual">Lançar totais manualmente</SelectItem></SelectContent></Select>
        <p className="text-xs text-muted-foreground">Use o lançamento manual para meses históricos ou dados não registrados na agenda. Os números manuais substituem os volumes da agenda neste mês.</p>
        {form.mode === "manual" && <div className="grid gap-4 sm:grid-cols-3">{([['meetings_scheduled', 'Reuniões marcadas'], ['meetings_held', 'Reuniões realizadas']] as const).map(([key, label]) => <div key={key}><Label>{label}</Label><Input type="number" min="0" step="1" value={manual[key]} onChange={(e) => setManual((current) => ({ ...current, [key]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} /></div>)}{numericField("cancelled", "Canceladas")}</div>}
        <div className="grid gap-4 sm:grid-cols-2">{numericField("leads", "Leads trabalhados no mês")}<div className="rounded-lg border p-3"><p className="text-sm">Investimento em anúncios (automático)</p><strong>{adInvestment.isLoading ? "Carregando..." : money(investment)}</strong><p className="text-xs text-muted-foreground">Anúncios + imposto do mês selecionado, importado da mesma fonte da Visão Geral.</p></div>{numericField("noShows", "Não comparecimento (quantidade)")}{numericField("rescheduled", "Reuniões reagendadas (quantidade)")}</div>
        <p className="text-xs text-muted-foreground">Informe 0 para confirmar que não houve faltas ou reagendamentos. Deixe vazio quando ainda não souber. Não conte reunião futura como falta.</p>
        <h4 className="font-semibold">Metas mensais</h4><div className="grid gap-4 sm:grid-cols-2">{numericField("scheduledGoal", "Meta de reuniões marcadas")}{numericField("heldGoal", "Meta de reuniões realizadas")}{numericField("schedulingTarget", "Taxa mínima de agendamento (%)", true)}{numericField("attendanceTarget", "Taxa mínima de comparecimento (%)", true)}{numericField("noShowTarget", "Taxa máxima de faltas (%)", true)}{numericField("cancellationTarget", "Taxa máxima de cancelamento (%)", true)}{numericField("reschedulingTarget", "Taxa máxima de reagendamento (%)", true)}</div>
        <Button className="w-full" disabled={save.isPending} onClick={persist}>{save.isPending ? "Salvando..." : "Salvar metas e lançamentos"}</Button>
      </div>
    </DialogContent></Dialog>
  </section>;
}
