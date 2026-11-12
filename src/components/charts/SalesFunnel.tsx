import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { funnelIndicators } from "@/lib/salesFunnel";
import type { Meeting } from "@/types/clients/task";
import { useVendas } from "@/hooks/useVendas";
import { saleMethodAnalytics } from "@/lib/saleMethodAnalytics";
import { Filter, Users, UserCheck, CalendarDays, CalendarCheck, Trophy, ArrowDownRight } from "lucide-react";

type Props = { since: string; until: string; leads: number | null; mql: number | null; investment: number | null };
const amount = (value: number | null) => value == null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value: number | null) => value == null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default function SalesFunnel({ since, until, leads, mql, investment }: Props) {
  const sales = useVendas();
  const saleResults = saleMethodAnalytics(sales.data || [], since, until);
  const agenda = useQuery({
    queryKey: ["sales-funnel-meetings", since, until],
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const [local, crm, deleted] = await Promise.all([
        supabase.from("meetings" as never).select("*").gte("date", since).lte("date", until),
        supabase.functions.invoke("crm-agenda", { body: { since, until } }),
        supabase.from("deleted_crm_meetings" as never).select("external_id"),
      ]);
      if (local.error || crm.error || crm.data?.error || deleted.error) throw new Error("Não foi possível atualizar a agenda do funil.");
      const locals = (local.data || []) as unknown as Array<{ id: string; external_id?: string; agenda_category: string; meeting_type: string; date: string; status: string; has_closing: boolean; closing_status: string }>;
      const hidden = new Set((deleted.data || []).map((row: { external_id: string }) => row.external_id));
      const linked = new Set(locals.map((row) => row.external_id).filter(Boolean));
      const remote = ((crm.data?.appointments || []) as Array<Meeting & { closingDataAvailable?: boolean }>).filter((row) => !hidden.has(row.externalId || "") && !linked.has(row.externalId));
      const rows = [
        ...locals.map((row) => ({ id: row.external_id || row.id, date: row.date, category: row.agenda_category, type: row.meeting_type, status: row.status, closed: row.has_closing || ["closed", "closed_later"].includes(row.closing_status), known: true })),
        ...remote.map((row) => ({ id: row.externalId || row.id, date: row.date, category: row.agendaCategory, type: row.meetingType, status: row.status, closed: row.hasClosed, known: row.closingDataAvailable === true })),
      ].filter((row) => row.date >= since && row.date <= until && row.category === "reunioes" && ["reuniao", "reuniao_vendas", "reunião", "call", "comercial"].includes(row.type || "reuniao"));
      const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
      return { scheduled: unique.length, held: unique.filter((row) => row.status === "completed").length, closed: unique.some((row) => !row.known) ? null : unique.filter((row) => row.closed && row.status === "completed").length };
    },
  });
  const values = [leads, mql, agenda.data?.scheduled ?? null, agenda.data?.held ?? null, sales.isPending || sales.isError ? null : saleResults.closedMeetings];
  const labels = ["Leads recebidos", "Leads MQL", "Reuniões marcadas", "Reuniões feitas", "Fechamentos"];
  const colors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#14b8a6", "#10b981"];
  const icons = [Users, UserCheck, CalendarDays, CalendarCheck, Trophy];
  const largest = Math.max(1, ...values.map((value) => value ?? 0));
  return <section className="relative overflow-hidden rounded-2xl border bg-card p-4 sm:p-6 space-y-6" aria-label="Funil comercial">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/5" aria-hidden="true" />
    <div className="relative flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"><Filter className="h-3.5 w-3.5" /> Jornada comercial</div><h2 className="mt-2 text-xl font-semibold tracking-tight">Do primeiro contato ao fechamento</h2><p className="text-xs text-muted-foreground mt-1">Funil comercial · período selecionado em Métricas de Reuniões</p></div><div className="rounded-xl border bg-background/60 px-4 py-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Investimento em anúncios</p><strong className="mt-1 block text-lg tabular-nums">{amount(investment)}</strong></div></div>
    {agenda.isPending && <p className="text-xs text-muted-foreground">Carregando reuniões...</p>}
    {agenda.isError && <p role="alert" className="text-sm text-amber-500">Não foi possível atualizar as reuniões. <button className="underline" onClick={() => agenda.refetch()}>Tentar novamente</button></p>}
    <div className="relative space-y-2">
      <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_110px_110px_100px] gap-4 px-4 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground"><span>Etapa / volume</span><span className="text-right">Custo unitário</span><span className="text-right">Conversão¹</span><span className="text-right">% dos leads</span></div>
      {labels.map((label, index) => {
      const value = values[index];
      const stats = funnelIndicators(value, index === 0 ? leads : values[index - 1], leads, investment);
      const Icon = icons[index];
      return <div key={label} className="group rounded-xl border border-transparent bg-background/30 p-3 sm:p-4 transition-colors hover:border-border hover:bg-background/60">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_110px_110px_100px] items-center">
          <div className="min-w-0"><div className="mb-3 flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border" style={{ color: colors[index], backgroundColor: `${colors[index]}15`, borderColor: `${colors[index]}30` }}><Icon className="h-4 w-4" /></span><span className="text-sm font-medium">{label}</span><strong className="ml-auto text-2xl font-semibold tabular-nums">{value == null ? "—" : value.toLocaleString("pt-BR")}</strong></div>
            <div className={`h-5 overflow-hidden rounded-md bg-muted/40 ${value == null ? "border border-dashed border-muted-foreground/30" : ""}`} aria-hidden="true"><div className="h-full rounded-md transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${Math.max(0, value ?? 0) / largest * 100}%`, background: `linear-gradient(90deg, ${colors[index]}88, ${colors[index]})`, boxShadow: `0 0 18px ${colors[index]}25` }} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:contents">
            <div className="lg:text-right"><p className="text-[10px] text-muted-foreground lg:hidden">Custo unitário</p><p className="text-sm font-semibold tabular-nums">{amount(stats.cost)}</p></div>
            <div className="text-center lg:text-right" title={index === 0 ? "Base do funil" : `${label} ÷ ${labels[index - 1]}`}><p className="text-[10px] text-muted-foreground lg:hidden">Conversão¹</p><span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold tabular-nums" style={{ color: colors[index], backgroundColor: `${colors[index]}15` }}>{index > 0 && <ArrowDownRight className="h-3 w-3" />}{percent(stats.conversion)}</span></div>
            <div className="text-right"><p className="text-[10px] text-muted-foreground lg:hidden">% dos leads</p><p className="text-sm tabular-nums text-muted-foreground">{percent(stats.share)}</p></div>
          </div>
        </div>
      </div>;
    })}</div>
    <details className="border-t pt-4 text-xs text-muted-foreground"><summary className="cursor-pointer hover:text-foreground">Como ler este funil</summary><p className="mt-2 leading-relaxed">As barras representam os volumes na mesma escala. Custo = investimento em anúncios ÷ quantidade da etapa. ¹ Conversão = etapa atual ÷ etapa anterior. Leads e MQL usam as mesmas fontes da Visão Geral; reuniões vêm da Agenda Closer e do CRM, sem repetir registros vinculados. Os volumes são do período, não necessariamente dos mesmos leads. “—” indica dado indisponível ou ausência de base para cálculo.</p></details>
    <div className="border-t pt-4 space-y-4" aria-label="Fechamentos por forma de venda">
      <div><h3 className="font-semibold">Onde as vendas estão fechando</h3><p className="mt-1 text-xs text-muted-foreground">Forma de venda da planilha de Vendas, pela data da venda no período selecionado. Cada grupo de cliente, dia e vendedor conta uma vez. A etapa Fechamentos soma os resultados na reunião e depois dela.</p></div>
      {sales.isError ? <p role="alert" className="text-amber-500 text-sm">Não foi possível carregar a planilha de vendas. <button className="underline" onClick={() => sales.refetch()}>Tentar novamente</button></p> : sales.isPending ? <p className="text-sm text-muted-foreground">Carregando vendas...</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{saleResults.buckets.map(bucket => <div key={bucket.key} className="rounded-xl border bg-background/40 p-4"><p className="text-sm">{bucket.label}</p><div className="my-2 flex justify-between items-baseline"><strong className="text-2xl">{bucket.count}</strong><span className="text-sm text-muted-foreground">{percent(saleResults.total ? bucket.count/saleResults.total*100 : null)}</span></div><div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-emerald-500" style={{width:`${saleResults.total ? bucket.count/saleResults.total*100 : 0}%`}} /></div><p className="mt-2 text-xs text-muted-foreground">{amount(bucket.revenue)} em vendas</p></div>)}</div>}
    </div>
  </section>;
}
