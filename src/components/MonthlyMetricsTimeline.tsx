import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarRange } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { MetaAdsData } from "@/hooks/useMetaAds";
import { useFechamentosDiarios } from "@/hooks/useFechamentosDiarios";
import { useCrmMql } from "@/hooks/useCrmMql";
import { Button } from "@/components/ui/button";

type Period = "dia" | "semana" | "mes";
type TimelineRow = { key: string; label: string; faturamento: number; vendas: number; cursosFeitos: number; leads: number; mql: number; ads: number };

const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const mondayKey = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return localDateKey(date);
};
const getFirstAction = (actions: Array<{ action_type: string; value: string }> | undefined, types: string[]) => {
  for (const type of types) {
    const action = actions?.find((item) => item.action_type.toLowerCase() === type);
    if (action) return Number(action.value || 0);
  }
  return 0;
};
const getMetaLeads = (actions?: Array<{ action_type: string; value: string }>) => getFirstAction(actions, ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "offsite_complete_registration_add_meta_leads", "offsite_content_view_add_meta_leads"]);
const getMetaConversations = (actions?: Array<{ action_type: string; value: string }>) => {
  const preferred = getFirstAction(actions, ["onsite_conversion.messaging_conversation_started_7d", "onsite_conversion.total_messaging_connection", "onsite_conversion.messaging_first_reply"]);
  if (preferred > 0) return preferred;
  return (actions || []).reduce((total, item) => {
    const type = item.action_type.toLowerCase();
    return type.includes("conversation_started") || type.includes("whatsapp") ? total + Number(item.value || 0) : total;
  }, 0);
};

export default function MonthlyMetricsTimeline() {
  const [period, setPeriod] = useState<Period>("mes");
  const endDate = localDateKey(new Date());
  const startDate = useMemo(() => {
    const date = new Date();
    if (period === "dia") date.setDate(date.getDate() - 6);
    else if (period === "semana") {
      const day = date.getDay() || 7;
      date.setDate(date.getDate() - day + 1 - 35);
    } else date.setMonth(date.getMonth() - 5, 1);
    return localDateKey(date);
  }, [period]);
  const { data: fechamentos = [] } = useFechamentosDiarios();
  const { data: crmMql } = useCrmMql(startDate, endDate);
  const { data, isLoading } = useQuery({
    queryKey: ["metrics-timeline", period, startDate],
    queryFn: async () => {
      const [metricsResult, vendasResult, metaResult] = await Promise.all([
        supabase.from("daily_metrics").select("date, leads, ads, curso_feito, faturamento_marcado, meta_mensal_prevista, super_meta_mensal").gte("date", startDate),
        supabase.from("vendas").select("data, cliente, vendedor, valor, status").gte("data", startDate),
        supabase.functions.invoke("meta-ads", { body: { datePreset: "custom", since: startDate, until: endDate } }),
      ]);
      if (metricsResult.error) throw metricsResult.error;
      if (vendasResult.error) throw vendasResult.error;
      return { metrics: metricsResult.data || [], vendas: vendasResult.data || [], meta: metaResult.error || metaResult.data?.error ? null : metaResult.data as MetaAdsData };
    },
  });

  const periods = useMemo<TimelineRow[]>(() => {
    const rows = new Map<string, TimelineRow>();
    const createRow = (key: string, label: string) => rows.set(key, { key, label, faturamento: 0, vendas: 0, cursosFeitos: 0, leads: 0, mql: 0, ads: 0 });
    const now = new Date();
    if (period === "dia") {
      for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
        createRow(localDateKey(date), new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit" }).format(date));
      }
    } else if (period === "semana") {
      const monday = new Date(now);
      monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1);
      for (let offset = 5; offset >= 0; offset--) {
        const start = new Date(monday); start.setDate(start.getDate() - offset * 7);
        const end = new Date(start); end.setDate(end.getDate() + 6);
        createRow(localDateKey(start), `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}–${String(end.getDate()).padStart(2, "0")}/${String(end.getMonth() + 1).padStart(2, "0")}`);
      }
    } else {
      for (let offset = 5; offset >= 0; offset--) {
        const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        createRow(localDateKey(date).slice(0, 7), monthLabel.format(date).replace(" de ", "/"));
      }
    }
    const rowKey = (date: string) => period === "dia" ? date : period === "semana" ? mondayKey(date) : date.slice(0, 7);
    const metaDates = new Set((data?.meta?.dailyInsights || []).map((item) => item.date_start));
    data?.metrics.forEach((item) => {
      if (Number(item.meta_mensal_prevista || 0) > 0 || Number(item.super_meta_mensal || 0) > 0) return;
      const row = rows.get(rowKey(item.date));
      if (!row) return;
      if (!metaDates.has(item.date)) { row.leads += Number(item.leads || 0); row.ads += Number(item.ads || 0); }
      row.cursosFeitos += Number(item.curso_feito || 0);
    });
    data?.meta?.dailyInsights?.forEach((item) => {
      const row = rows.get(rowKey(item.date_start));
      if (row) { row.leads += getMetaLeads(item.actions) + getMetaConversations(item.actions); row.ads += Number(item.spend || 0); }
    });
    data?.vendas.forEach((item) => {
      if (item.status === "recusada" || item.status === "cancelada") return;
      const row = rows.get(rowKey(item.data));
      if (row) row.vendas += 1;
    });
    const saleGroups = new Map<string, { period: string; total: number; cliente: string; vendedor: string; data: string }>();
    data?.vendas.forEach((item) => {
      if (item.status === "recusada" || item.status === "cancelada") return;
      const cliente = (item.cliente || "").trim().toLocaleLowerCase("pt-BR");
      const vendedor = (item.vendedor || "").trim().toLocaleLowerCase("pt-BR");
      const key = [item.data, cliente, vendedor].join("|");
      const group = saleGroups.get(key) || { period: rowKey(item.data), total: 0, cliente, vendedor, data: item.data };
      group.total += Number(item.valor || 0); saleGroups.set(key, group);
    });
    saleGroups.forEach((group) => {
      const received = fechamentos.filter((item) => (item.status || "").toLowerCase() !== "cancelado" && item.data === group.data && item.cliente.trim().toLocaleLowerCase("pt-BR") === group.cliente && item.vendedor.trim().toLocaleLowerCase("pt-BR") === group.vendedor).reduce((sum, item) => sum + Number(item.valor_sinal || 0), 0);
      const row = rows.get(group.period); if (row) row.faturamento += Math.min(group.total, received);
    });
    Object.entries(crmMql?.daily || {}).forEach(([date, total]) => { const row = rows.get(rowKey(date)); if (row) row.mql += Number(total || 0); });
    return Array.from(rows.values());
  }, [data, fechamentos, crmMql, period]);

  return <section className="glass-card-hover rounded-lg p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><CalendarRange className="h-4 w-4 text-primary" /><div><h3 className="font-display text-sm font-semibold text-foreground">Evolução por período</h3><p className="text-xs text-muted-foreground">Faturamento, vendas, leads, MQL e anúncios</p></div></div>
      <div className="flex rounded-lg border border-border/50 bg-secondary/20 p-1">{(["dia", "semana", "mes"] as const).map((option) => <Button key={option} type="button" size="sm" variant={period === option ? "default" : "ghost"} className="h-7 px-3 text-xs capitalize" onClick={() => setPeriod(option)}>{option === "mes" ? "Mês" : option}</Button>)}</div>
    </div>
    <div className="overflow-x-auto pb-2"><div className="flex min-w-max items-stretch gap-2 lg:grid lg:min-w-0 lg:grid-cols-6 lg:gap-3">
      {periods.map((row, index) => <div key={row.key} className="flex min-w-0 items-center"><div className="w-56 min-w-0 rounded-xl border border-border/40 bg-secondary/20 p-3 lg:w-full"><p className="mb-3 text-xs font-semibold capitalize text-primary">{row.label}</p><div className="space-y-2 text-xs">
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Faturamento</span><strong>{money.format(row.faturamento)}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Vendas</span><strong className="text-accent">{row.vendas}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Leads</span><strong>{row.leads}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">MQL</span><strong className="text-accent">{row.mql}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Anúncios</span><strong className="text-amber-400">{money.format(row.ads)}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Custo por lead</span><strong className="text-cyan-400">{row.leads ? money.format(row.ads / row.leads) : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Custo por lead MQL</span><strong className="text-violet-400">{row.mql ? money.format(row.ads / row.mql) : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Taxa de conversão</span><strong className="text-emerald-400">{row.leads ? `${((row.mql / row.leads) * 100).toFixed(1).replace(".", ",")}%` : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">CAC total</span><strong>{row.vendas ? money.format(row.ads / row.vendas) : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">CAC cursos</span><strong className="text-primary">{row.cursosFeitos ? money.format(row.ads / row.cursosFeitos) : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">ROAS</span><strong className="text-emerald-400">{row.ads ? `${(row.faturamento / row.ads).toFixed(2).replace(".", ",")}x` : "—"}</strong></div>
      </div></div>{index < periods.length - 1 && <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/40 lg:hidden" />}</div>)}
    </div></div>
    {isLoading && <p className="mt-2 text-xs text-muted-foreground">Carregando histórico...</p>}
  </section>;
}
