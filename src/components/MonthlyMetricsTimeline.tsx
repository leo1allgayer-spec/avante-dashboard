import { useCursosDados } from "@/hooks/useCursosDados";
import { contributionMargin } from "@/lib/contributionMargin";
import MonthYearSelect from "@/components/MonthYearSelect";
import { useMemo, useState } from "react";
import { collectionCalculator } from "@/lib/collectionCalculator";
import { receivablesCalculator } from "@/lib/receivablesCalculator";
import { useVendas } from "@/hooks/useVendas";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarRange, CircleDollarSign, ShoppingCart, Target, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { MetaAdsData } from "@/hooks/useMetaAds";
import { useFechamentosDiarios } from "@/hooks/useFechamentosDiarios";
import { useCrmMql } from "@/hooks/useCrmMql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isCourseCategory } from "@/constants/serviceCategories";
import { chartRanges, type DateRange } from "@/lib/evolutionMetrics";
import type { CrmMqlData } from "@/hooks/useCrmMql";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Period = "dia" | "semana" | "mes";
type TimelineRow = { key: string; label: string; start: string; end: string; faturamento: number; valorVendido: number; aReceber: number; aReceberAnterior: number; vendas: number; cursosVendidos: number; servicosVendidos: number; cursosFeitos: number; leads: number; mql: number; ads: number; metaPrevista: number };
type PaymentEntry = { id?: string; date?: string; amount?: number; netAmount?: number };

const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat("pt-BR", { notation: "compact", style: "currency", currency: "BRL", maximumFractionDigits: 1 });
const META_TAX_MULTIPLIER = 1.1225;
const isCourseSale = (produto?: string | null, servico?: string | null) => isCourseCategory(produto) || isCourseCategory(servico);
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const mondayKey = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return localDateKey(date);
};
const weekdaysInMonth = (year: number, month: number) => {
  let total = 0;
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    const weekday = new Date(year, month, day).getDay();
    if (weekday >= 1 && weekday <= 5) total++;
  }
  return total;
};
const getFirstAction = (actions: Array<{ action_type: string; value: string }> | undefined, types: string[]) => {
  for (const type of types) {
    const action = actions?.find((item) => item.action_type.toLowerCase() === type);
    if (action) return Number(action.value || 0);
  }
  return 0;
};
const getMetaLeads = (actions?: Array<{ action_type: string; value: string }>) => getFirstAction(actions, ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "offsite_complete_registration_add_meta_leads", "offsite_content_view_add_meta_leads"]);
const getMetaConversations = (actions?: Array<{ action_type: string; value: string }>) =>
  getFirstAction(actions, ["onsite_conversion.messaging_conversation_started_7d"]);
const getMetaContacts = (actions?: Array<{ action_type: string; value: string }>) => {
  const conversations = getMetaConversations(actions);
  return conversations > 0 ? conversations : getMetaLeads(actions);
};
const getPaymentHistory = (observation?: string | null): PaymentEntry[] => {
  if (!observation) return [];
  const marker = "__PAYMENT_HISTORY__";
  const markerIndex = observation.indexOf(marker);
  if (markerIndex < 0) return [];
  try {
    const parsed = JSON.parse(observation.slice(markerIndex + marker.length).trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export type TimelineSource = {
  metrics: Array<{ date: string; leads: number; ads: number; curso_feito: number; faturamento_marcado: number; meta_mensal_prevista: number; super_meta_mensal: number }>;
  vendas: Array<{ data: string; cliente: string; vendedor: string; valor: number; status: string; produto: string; servico: string }>;
  meta: MetaAdsData | null;
};
interface MonthlyMetricsTimelineProps {
  cardsOnly?: boolean;
  monthlyOnly?: boolean;
  historyMonths?: number;
  range?: DateRange;
  source?: TimelineSource;
  mql?: CrmMqlData;
}

export default function MonthlyMetricsTimeline({ cardsOnly = false, monthlyOnly = false, historyMonths = 6, range, source, mql }: MonthlyMetricsTimelineProps) {
  const [selectedPeriod, setPeriod] = useState<Period>("mes");
  const [selectedMonth, setSelectedMonth] = useState("");
  const filteredMonth = monthlyOnly && /^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth) ? selectedMonth : "";
  const period = range ? range.start.slice(0, 7) === range.end.slice(0, 7) ? "dia" : "mes" : filteredMonth ? "dia" : selectedPeriod;
  const endDate = range?.end || (filteredMonth
    ? localDateKey(new Date(Number(filteredMonth.slice(0, 4)), Number(filteredMonth.slice(5, 7)), 0))
    : localDateKey(new Date()));
  const startDate = useMemo(() => {
    if (range) return range.start;
    if (filteredMonth) return `${filteredMonth}-01`;
    const date = new Date();
    if (period === "dia") date.setDate(date.getDate() - 6);
    else if (period === "semana") {
      const day = date.getDay() || 7;
      date.setDate(date.getDate() - day + 1 - 35);
    } else date.setMonth(date.getMonth() - (historyMonths - 1), 1);
    return localDateKey(date);
  }, [period, historyMonths, filteredMonth, range]);
  const { data: fechamentos = [] } = useFechamentosDiarios();
  const { data: collectionSales = [] } = useVendas();
  const courseCosts = useCursosDados();
  const mqlQuery = useCrmMql(startDate, endDate, !source);
  const crmMql = source ? mql : mqlQuery.data;
  const isMqlLoading = !source && mqlQuery.isLoading;
  const timelineQuery = useQuery({
    enabled: !source,
    queryKey: ["metrics-timeline", period, startDate, endDate],
    queryFn: async () => {
      const [metricsResult, vendasResult, metaResult] = await Promise.all([
        supabase.from("daily_metrics").select("date, leads, ads, curso_feito, faturamento_marcado, meta_mensal_prevista, super_meta_mensal").gte("date", `${startDate.slice(0, 7)}-01`).lte("date", endDate),
        supabase.from("vendas").select("data, cliente, vendedor, valor, status, produto, servico").gte("data", startDate).lte("data", endDate),
        supabase.functions.invoke("meta-ads", { body: { datePreset: "custom", since: startDate, until: endDate } }),
      ]);
      if (metricsResult.error) throw metricsResult.error;
      if (vendasResult.error) throw vendasResult.error;
      return { metrics: metricsResult.data || [], vendas: vendasResult.data || [], meta: metaResult.error || metaResult.data?.error ? null : metaResult.data as MetaAdsData };
    },
  });

  const data = source || timelineQuery.data;
  const isLoading = !source && timelineQuery.isLoading;
  const periods = useMemo<TimelineRow[]>(() => {
    const rows = new Map<string, TimelineRow>();
    const createRow = (key: string, label: string, start: string, end: string) => rows.set(key, { key, label, start, end, faturamento: 0, valorVendido: 0, aReceber: 0, aReceberAnterior: 0, vendas: 0, cursosVendidos: 0, servicosVendidos: 0, cursosFeitos: 0, leads: 0, mql: 0, ads: 0, metaPrevista: 0 });
    const now = new Date();
    if (range) {
      chartRanges(range).forEach(r => createRow(period === "dia" ? r.start : r.start.slice(0, 7), new Date(`${r.start}T12:00:00`).toLocaleDateString("pt-BR", period === "dia" ? {day:"2-digit",month:"2-digit"} : {month:"short",year:"2-digit"}), r.start, r.end));
    } else if (filteredMonth) {
      const lastDay = Number(endDate.slice(8, 10));
      for (let day = 1; day <= lastDay; day++) {
        const key = `${filteredMonth}-${String(day).padStart(2, "0")}`;
        createRow(key, `${String(day).padStart(2, "0")}/${filteredMonth.slice(5, 7)}`, key, key);
      }
    } else if (period === "dia") {
      for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
        const key = localDateKey(date);
        createRow(key, new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit" }).format(date), key, key);
      }
    } else if (period === "semana") {
      const monday = new Date(now);
      monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1);
      for (let offset = historyMonths - 1; offset >= 0; offset--) {
        const start = new Date(monday); start.setDate(start.getDate() - offset * 7);
        const end = new Date(start); end.setDate(end.getDate() + 6);
        createRow(localDateKey(start), `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}–${String(end.getDate()).padStart(2, "0")}/${String(end.getMonth() + 1).padStart(2, "0")}`, localDateKey(start), localDateKey(end));
      }
    } else {
      for (let offset = historyMonths - 1; offset >= 0; offset--) {
        const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const monthKey = localDateKey(date).slice(0, 7);
        createRow(monthKey, monthLabel.format(date).replace(" de ", "/"), `${monthKey}-01`, localDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)));
      }
    }
    const rowKey = (date: string) => period === "dia" ? date : period === "semana" ? mondayKey(date) : date.slice(0, 7);
    const metaDates = new Set((data?.meta?.dailyInsights || []).map((item) => item.date_start));
    data?.metrics.forEach((item) => {
      if (item.date < startDate || item.date > endDate) return;
      if (Number(item.meta_mensal_prevista || 0) > 0 || Number(item.super_meta_mensal || 0) > 0) return;
      const row = rows.get(rowKey(item.date));
      if (!row) return;
      if (!metaDates.has(item.date)) { row.leads += Number(item.leads || 0); row.ads += Number(item.ads || 0) * META_TAX_MULTIPLIER; }
      row.cursosFeitos += Number(item.curso_feito || 0);
    });
    data?.meta?.dailyInsights?.forEach((item) => {
      if (item.date_start < startDate || item.date_start > endDate) return;
      const row = rows.get(rowKey(item.date_start));
      if (row) { row.leads += getMetaContacts(item.actions); row.ads += Number(item.spend || 0) * META_TAX_MULTIPLIER; }
    });
    const uniqueClientsByPeriod = new Map<string, Set<string>>();
    const uniqueCoursesByPeriod = new Map<string, Set<string>>();
    const uniqueServicesByPeriod = new Map<string, Set<string>>();
    data?.vendas.forEach((item) => {
      if (item.status === "recusada" || item.status === "cancelada") return;
      const row = rows.get(rowKey(item.data));
      if (row) {
        const clientKey = (item.cliente || "").trim().toLocaleLowerCase("pt-BR") || `sale:${item.data}:${item.valor}`;
        const clients = uniqueClientsByPeriod.get(row.key) || new Set<string>();
        clients.add(clientKey);
        uniqueClientsByPeriod.set(row.key, clients);
        const categoryClients = isCourseSale(item.produto, item.servico) ? uniqueCoursesByPeriod : uniqueServicesByPeriod;
        const categorySet = categoryClients.get(row.key) || new Set<string>();
        categorySet.add(clientKey); categoryClients.set(row.key, categorySet);
      }
    });
    uniqueClientsByPeriod.forEach((clients, key) => { const row = rows.get(key); if (row) row.vendas = clients.size; });
    uniqueCoursesByPeriod.forEach((clients, key) => { const row = rows.get(key); if (row) row.cursosVendidos = clients.size; });
    uniqueServicesByPeriod.forEach((clients, key) => { const row = rows.get(key); if (row) row.servicosVendidos = clients.size; });
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
      const row = rows.get(group.period);
      if (row) row.valorVendido += group.total;
    });

    // The chart shows scheduled amounts; prior balances are shown separately
    // in each card and are counted only once in the interval overview.
    rows.forEach((row) => {
      const collected = collectionCalculator(collectionSales, row.start, row.end);
      const pending = receivablesCalculator(collectionSales, fechamentos, row.start, row.end);
      row.faturamento = fechamentos.filter(item => item.status !== "cancelado")
        .reduce((sum, item) => sum + collected.getCollectedNetInPeriod(item), 0);
      row.aReceber = pending.scheduled;
      row.aReceberAnterior = pending.overdue;
    });
    Object.entries(crmMql?.daily || {}).forEach(([date, total]) => { const row = rows.get(rowKey(date)); if (row) row.mql += Number(total || 0); });
    const monthlyTargets = new Map<string, number>();
    data?.metrics.forEach((item) => {
      const target = Number(item.meta_mensal_prevista || 0);
      if (target > 0) monthlyTargets.set(item.date.slice(0, 7), Math.max(monthlyTargets.get(item.date.slice(0, 7)) || 0, target));
    });
    rows.forEach((row) => {
      const cursor = new Date(`${row.start}T12:00:00`);
      const limit = new Date(`${row.end}T12:00:00`);
      while (cursor <= limit) {
        const weekday = cursor.getDay();
        if (weekday >= 1 && weekday <= 5) {
          const monthKey = localDateKey(cursor).slice(0, 7);
          const target = monthlyTargets.get(monthKey) || 0;
          row.metaPrevista += target / weekdaysInMonth(cursor.getFullYear(), cursor.getMonth());
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return Array.from(rows.values());
  }, [data, fechamentos, collectionSales, crmMql, period, historyMonths, filteredMonth, endDate, startDate, range]);

  const peakSalesDays = useMemo(() => {
    const days = new Map<string, { date: string; vendas: number; valor: number }>();
    const clientsByDay = new Map<string, Set<string>>();
    data?.vendas.forEach((sale) => {
      if (sale.status === "recusada" || sale.status === "cancelada") return;
      const current = days.get(sale.data) || { date: sale.data, vendas: 0, valor: 0 };
      const clients = clientsByDay.get(sale.data) || new Set<string>();
      clients.add((sale.cliente || "").trim().toLocaleLowerCase("pt-BR") || `sale:${sale.data}:${sale.valor}`);
      clientsByDay.set(sale.data, clients);
      current.valor += Number(sale.valor || 0);
      days.set(sale.data, current);
    });
    clientsByDay.forEach((clients, date) => { const day = days.get(date); if (day) day.vendas = clients.size; });
    if (days.size === 0) {
      fechamentos
        .filter((item) => item.data >= startDate && item.data <= endDate && (item.status || "").toLowerCase() !== "cancelado")
        .forEach((item) => {
          const current = days.get(item.data) || { date: item.data, vendas: 0, valor: 0 };
          current.vendas += 1;
          current.valor += Number(item.valor_sinal || 0) + Number(item.valor_a_entrar || 0);
          days.set(item.data, current);
        });
    }
    return Array.from(days.values())
      .sort((a, b) => b.vendas - a.vendas || b.valor - a.valor)
      .slice(0, 5)
      .map((item) => ({ ...item, label: new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) }));
  }, [data, fechamentos, startDate, endDate]);

  const receivables = useMemo(() => receivablesCalculator(collectionSales, fechamentos, startDate, endDate), [collectionSales, fechamentos, startDate, endDate]);

  const overview = useMemo(() => {
    const totals = periods.reduce((result, row) => ({
      vendido: result.vendido + row.valorVendido,
      coletado: result.coletado + row.faturamento,
      receber: result.receber + row.aReceber,
      vendas: result.vendas + row.vendas,
      leads: result.leads + row.leads,
    }), { vendido: 0, coletado: 0, receber: 0, vendas: 0, leads: 0 });
    const best = periods.reduce<TimelineRow | null>((current, row) => !current || row.faturamento > current.faturamento ? row : current, null);
    const current = periods.at(-1);
    const previous = periods.at(-2);
    const variation = previous && previous.faturamento > 0 && current
      ? ((current.faturamento - previous.faturamento) / previous.faturamento) * 100
      : null;
    return {
      ...totals,
      ticket: totals.vendas ? totals.vendido / totals.vendas : 0,
      conversion: totals.leads ? (totals.vendas / totals.leads) * 100 : 0,
      best,
      variation,
    };
  }, [periods]);

  const tooltipStyle = {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 10,
    color: "hsl(var(--popover-foreground))",
    fontSize: 12,
  };
  const axisStyle = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };
  const comparisonData = useMemo(() => periods.map((row) => ({
    ...row,
    roas: row.ads ? row.faturamento / row.ads : 0,
    ticket: row.vendas ? row.valorVendido / row.vendas : 0,
    conversaoGeral: row.leads ? (row.vendas / row.leads) * 100 : 0,
    taxaMql: row.leads ? (row.mql / row.leads) * 100 : 0,
    conversaoMql: row.mql ? (row.vendas / row.mql) * 100 : 0,
  })), [periods]);

  return <section className="space-y-5">
    <div className="glass-card-hover rounded-lg p-5">
    {!cardsOnly && <><div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><CalendarRange className="h-4 w-4 text-primary" /><div><h3 className="font-display text-sm font-semibold text-foreground">Evolução por período</h3><p className="text-xs text-muted-foreground">Faturamento, vendas, leads, MQL e anúncios</p></div></div>
      {monthlyOnly && !range && <div className="flex flex-wrap items-center gap-2"><label htmlFor="evolution-month" className="text-xs text-muted-foreground">Filtrar por mês</label><MonthYearSelect id="evolution-month" label="Evolução" value={selectedMonth} onChange={setSelectedMonth} /><Button type="button" size="sm" variant={filteredMonth ? "outline" : "default"} onClick={() => setSelectedMonth("")}>Últimos {historyMonths} meses</Button></div>}
      {!monthlyOnly && !range && <div className="flex rounded-lg border border-border/50 bg-secondary/20 p-1">{(["dia", "semana", "mes"] as const).map((option) => <Button key={option} type="button" size="sm" variant={period === option ? "default" : "ghost"} className="h-7 px-3 text-xs capitalize" onClick={() => setPeriod(option)}>{option === "mes" ? "Mês" : option}</Button>)}</div>}
    </div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {[
        { label: "Total vendido", value: money.format(overview.vendido), detail: `${overview.vendas} vendas`, icon: ShoppingCart, color: "text-violet-400" },
        { label: "Coletado", value: money.format(overview.coletado), detail: overview.variation === null ? "Sem comparação anterior" : `${overview.variation >= 0 ? "+" : ""}${overview.variation.toFixed(1).replace(".", ",")}% no último período`, icon: CircleDollarSign, color: "text-emerald-400" },
        { label: "A receber", value: money.format(receivables.total), detail: `Do período: ${money.format(receivables.scheduled)} · Anteriores: ${money.format(receivables.overdue)}`, icon: Target, color: "text-amber-400" },
        { label: "Ticket médio", value: money.format(overview.ticket), detail: "Valor médio por venda", icon: TrendingUp, color: "text-cyan-400" },
        { label: "Conversão geral", value: `${overview.conversion.toFixed(1).replace(".", ",")}%`, detail: `${overview.leads} leads no intervalo`, icon: Users, color: "text-blue-400" },
        { label: "Melhor período", value: overview.best?.label || "—", detail: overview.best ? money.format(overview.best.faturamento) : "Sem dados", icon: CalendarRange, color: "text-primary" },
      ].map((card) => <div key={card.label} className="rounded-xl border border-border/40 bg-secondary/10 p-4">
        <div className="mb-3 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{card.label}</span><card.icon className={`h-4 w-4 ${card.color}`} /></div>
        <strong className="block truncate text-lg text-foreground">{card.value}</strong>
        <span className="mt-1 block text-[11px] text-muted-foreground">{card.detail}</span>
      </div>)}
    </div>
    <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
      <div className="min-w-0 rounded-xl border border-border/40 bg-secondary/10 p-3 sm:p-4">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-foreground">Linha do tempo financeira</h4>
          <p className="text-xs text-muted-foreground">Compare vendido, coletado e previsto no mesmo período</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={periods} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="timelineCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.55} />
            <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => compactMoney.format(Number(value))} width={62} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [money.format(Number(value)), name]} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="faturamento" name="Coletado" stroke="hsl(var(--primary))" fill="url(#timelineCollected)" strokeWidth={3} />
            <Line type="monotone" dataKey="valorVendido" name="Vendido" stroke="hsl(263 70% 62%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="aReceber" name="Previsto no período (sem anteriores)" stroke="hsl(38 92% 55%)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="min-w-0 rounded-xl border border-border/40 bg-secondary/10 p-3 sm:p-4">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-foreground">Picos de vendas</h4>
          <p className="text-xs text-muted-foreground">Dias com mais vendas dentro do intervalo exibido</p>
        </div>
        {peakSalesDays.length ? <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={peakSalesDays} layout="vertical" margin={{ top: 8, right: 16, left: 2, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.55} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={58} tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string, item) => name === "Vendas" ? [value, name] : [money.format(Number(item.payload.valor)), "Valor vendido"]} />
            <Bar dataKey="vendas" name="Vendas" fill="hsl(168 65% 48%)" radius={[0, 6, 6, 0]} barSize={18} />
          </ComposedChart>
        </ResponsiveContainer> : <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Sem vendas no intervalo.</div>}
      </div>
    </div>

    <div className="mb-5 min-w-0 rounded-xl border border-border/40 bg-secondary/10 p-3 sm:p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-foreground">Aquisição e conversão</h4>
        <p className="text-xs text-muted-foreground">Leads, MQL e vendas lado a lado para identificar evolução</p>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={periods} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.55} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="leads" name="Leads" fill="hsl(215 85% 58%)" opacity={0.55} radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="mql" name="MQL" stroke="hsl(263 70% 62%)" strokeWidth={3} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="vendas" name="Vendas" stroke="hsl(168 65% 48%)" strokeWidth={3} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>

    <div className="mb-5 grid gap-4 xl:grid-cols-2">
      <div className="min-w-0 rounded-xl border border-border/40 bg-secondary/10 p-3 sm:p-4">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-foreground">Faturamento, investimento e ROAS</h4>
          <p className="text-xs text-muted-foreground">Quanto entrou, quanto foi investido em anúncios e o retorno de cada mês</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={comparisonData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.55} />
            <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis yAxisId="money" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => compactMoney.format(Number(value))} width={62} />
            <YAxis yAxisId="roas" orientation="right" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value).toFixed(1)}x`} width={42} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => name === "ROAS" ? [`${Number(value).toFixed(2).replace(".", ",")}x`, name] : [money.format(Number(value)), name]} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="money" dataKey="faturamento" name="Faturamento" fill="hsl(168 65% 48%)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="money" dataKey="ads" name="Anúncios + imposto" fill="hsl(38 92% 55%)" opacity={0.75} radius={[4, 4, 0, 0]} />
            <Line yAxisId="roas" type="monotone" dataKey="roas" name="ROAS" stroke="hsl(263 70% 62%)" strokeWidth={3} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="min-w-0 rounded-xl border border-border/40 bg-secondary/10 p-3 sm:p-4">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-foreground">Eficiência comercial</h4>
          <p className="text-xs text-muted-foreground">Taxa de MQL e conversões comparadas mês a mês</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={comparisonData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.55} />
            <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value).toFixed(0)}%`} width={42} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [`${Number(value).toFixed(1).replace(".", ",")}%`, name]} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="taxaMql" name="Taxa de MQL" stroke="hsl(263 70% 62%)" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="conversaoMql" name="Conversão de MQL" stroke="hsl(168 65% 48%)" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="conversaoGeral" name="Conversão geral" stroke="hsl(215 85% 58%)" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="mb-5 min-w-0 rounded-xl border border-border/40 bg-secondary/10 p-3 sm:p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-foreground">Vendas e ticket médio</h4>
        <p className="text-xs text-muted-foreground">Quantidade de vendas e valor médio por venda em cada mês</p>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={comparisonData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.55} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis yAxisId="sales" allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} width={38} />
          <YAxis yAxisId="ticket" orientation="right" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => compactMoney.format(Number(value))} width={62} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => name === "Ticket médio" ? [money.format(Number(value)), name] : [value, name]} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="sales" dataKey="vendas" name="Vendas" fill="hsl(215 85% 58%)" radius={[4, 4, 0, 0]} />
          <Line yAxisId="ticket" type="monotone" dataKey="ticket" name="Ticket médio" stroke="hsl(38 92% 55%)" strokeWidth={3} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>

    </>}
    {cardsOnly && <div className="mb-4 flex items-center gap-2">
      <CalendarRange className="h-4 w-4 text-primary" />
      <div><h3 className="font-display text-sm font-semibold text-foreground">Comparativo mensal</h3><p className="text-xs text-muted-foreground">Indicadores detalhados dos últimos seis meses</p></div>
    </div>}
    <details open={range ? undefined : true}><summary className={range ? "mb-4 cursor-pointer text-sm font-medium" : "hidden"}>Detalhamento por período ({periods.length})</summary>
    <div className="overflow-x-auto pb-2"><div className={range ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "flex min-w-max items-stretch gap-2 lg:grid lg:min-w-0 lg:grid-cols-6 lg:gap-3"}>
      {periods.map((row, index) => { const contribution = contributionMargin(row.faturamento, courseCosts.data || [], row.start, row.end); return <div key={row.key} className="flex min-w-0 items-center"><div className={`${range ? "w-full" : "w-56 lg:w-full"} min-w-0 rounded-xl border border-border/40 bg-secondary/20 p-3`}><p className="mb-3 text-xs font-semibold capitalize text-primary">{row.label}</p><div className="space-y-2 text-xs">
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Faturamento</span><strong>{money.format(row.faturamento)}</strong></div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2" title="Faturamento líquido da taxa da máquina, menos 9% de imposto, 15% de comissão de venda e os valores registrados em Cursos Dados no período.">
          <p className="text-[10px] leading-tight text-muted-foreground">Margem de contribuição</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1"><strong className="break-words text-sm text-emerald-400">{courseCosts.isSuccess ? money.format(contribution.margin) : "—"}</strong><span className="text-xs font-semibold text-emerald-400" title="Percentual da margem sobre o faturamento exibido, já líquido da taxa da máquina">{courseCosts.isSuccess && contribution.percentage !== null ? contribution.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%" : "—"}</span></div>
          <p className="mt-1 text-[9px] leading-tight text-muted-foreground">Após taxa da máquina · imposto 9% · comissão 15% · cursos dados</p>
        </div>
        <div className="flex flex-wrap justify-between gap-2" title="Soma da Comissão Extra registrada em Cursos Dados, pela data de realização."><span className="text-muted-foreground">Custo dos cursos dados</span><strong className="text-amber-400">{courseCosts.isSuccess ? money.format(contribution.courseCosts) : "—"}</strong></div>
        {courseCosts.isError && <p className="text-[10px] text-amber-400">Custo dos cursos indisponível. Margem não calculada.</p>}
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Vendas</span><strong className="text-accent">{row.vendas}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Leads</span><strong>{row.leads}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">MQL</span><strong className="text-accent">{isMqlLoading ? "..." : row.mql} <span className="ml-1 text-[10px] font-medium text-violet-400">{isMqlLoading ? "" : "(" + (row.leads ? ((row.mql / row.leads) * 100).toFixed(1).replace(".", ",") + "%" : "—") + ")"}</span></strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground" title="Gasto da Meta acrescido de 12,25% de imposto">Anúncios + imposto</span><strong className="text-amber-400">{money.format(row.ads)}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Custo por lead</span><strong className="text-cyan-400">{row.leads ? money.format(row.ads / row.leads) : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Custo por lead MQL</span><strong className="text-violet-400">{isMqlLoading ? "..." : row.mql ? money.format(row.ads / row.mql) : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground" title="Percentual de leads que foram qualificados como MQL">Taxa de MQL</span><strong className="text-violet-400">{isMqlLoading ? "..." : row.leads ? ((row.mql / row.leads) * 100).toFixed(1).replace(".", ",") + "%" : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground" title="Quantidade de vendas dividida pela quantidade de MQL do período">Conversão de MQL</span><strong className="text-emerald-400">{isMqlLoading ? "..." : row.mql ? ((row.vendas / row.mql) * 100).toFixed(1).replace(".", ",") + "%" : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground" title="Percentual de leads que virou venda">Conversão geral</span><strong className="text-emerald-400">{row.leads ? ((row.vendas / row.leads) * 100).toFixed(1).replace(".", ",") + "%" : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground" title="Clientes de cursos divididos pelos leads">Conversão de cursos</span><strong className="text-emerald-400">{row.leads ? ((row.cursosVendidos / row.leads) * 100).toFixed(1).replace(".", ",") + "%" : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground" title="Clientes de serviços divididos pelos leads">Conversão de serviços</span><strong className="text-emerald-400">{row.leads ? ((row.servicosVendidos / row.leads) * 100).toFixed(1).replace(".", ",") + "%" : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">CAC total</span><strong>{row.vendas ? money.format(row.ads / row.vendas) : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">CAC cursos</span><strong className="text-primary">{row.cursosVendidos ? money.format(row.ads / row.cursosVendidos) : "—"}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">ROAS</span><strong className="text-emerald-400">{row.ads ? `${(row.faturamento / row.ads).toFixed(2).replace(".", ",")}x` : "—"}</strong></div>
        <div className="mt-2 border-t border-border/40 pt-2 flex justify-between gap-3"><span className="text-muted-foreground">Meta prevista</span><strong className="text-blue-400">{money.format(row.metaPrevista)}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Meta realizada</span><strong className="text-emerald-400">{money.format(row.faturamento)}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">% da meta</span><strong className="text-violet-400">{row.metaPrevista > 0 ? `${((row.faturamento / row.metaPrevista) * 100).toFixed(1).replace(".", ",")}%` : "—"}</strong></div>
        <div className="mt-2 border-t border-border/40 pt-2 flex justify-between gap-3"><span className="text-muted-foreground">Total vendido</span><strong className="text-primary">{money.format(row.valorVendido)}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Coletado</span><strong className="text-emerald-400">{money.format(row.faturamento)}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">A receber</span><strong className="text-amber-400">{money.format(row.aReceber + row.aReceberAnterior)}</strong></div>
        <p className="text-[10px] text-muted-foreground">Anteriores: {money.format(row.aReceberAnterior)} · saldos atuais</p>
      </div></div>{index < periods.length - 1 && <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/40 lg:hidden" />}</div>; })}
    </div></div></details>
    {isLoading && <p className="mt-2 text-xs text-muted-foreground">Carregando histórico...</p>}
    </div>
  </section>;
}



