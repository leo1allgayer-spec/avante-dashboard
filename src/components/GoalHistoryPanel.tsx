import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendas } from "@/hooks/useVendas";
import { useFechamentosDiarios } from "@/hooks/useFechamentosDiarios";
import { canonicalizeSaleCategory, isCourseCategory, SUPPORT_PRODUCTS } from "@/constants/serviceCategories";
import { dateKey, inRange, revenueSummary, validSales } from "@/lib/evolutionMetrics";
import { localTimestampDate } from "@/lib/analyticsPeriods";
import type { DailyMetrics } from "@/hooks/useMetrics";
import { Section, money } from "@/components/evolution/EvolutionPrimitives";
import { Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OperationalHistoryPanel, { operationalIndicators } from "@/components/OperationalHistoryPanel";

const groups = [
  { key: "cursos", label: "Cursos", match: isCourseCategory },
  { key: "servicos", label: "Negócio local", match: (c: string) => c.startsWith("Gestão de Tráfego Pago") },
  { key: "social_media", label: "Social Media", match: (c: string) => c === "Social Media" },
  { key: "suporte_extra", label: "Suporte extra", match: (c: string) => SUPPORT_PRODUCTS.includes(c) },
  { key: "captacao_edicao", label: "Captação/Edição", match: (c: string) => c === "Captacao/Edicao de Conteudo" },
  { key: "site", label: "Site", match: (c: string) => c === "Desenvolvimento de Site" },
  { key: "crm", label: "CRM", match: (c: string) => c === "CRM/Treinamento Comercial" },
  { key: "upsell", label: "Upsell", match: (_: string, origin?: string) => origin?.toLowerCase() === "upsell" },
];
const pct = (value: number, target: number) => target > 0 ? `${(value / target * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "Sem meta";

export default function GoalHistoryPanel({ month }: { month: string }) {
  const [category, setCategory] = useState("revenue");
  const [currency, setCurrency] = useState(true);
  const today = localTimestampDate(new Date().toISOString());
  const ongoing = month === today.slice(0, 7);
  const months = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(`${month}-01T12:00:00`);
    date.setMonth(date.getMonth() - index);
    const start = dateKey(date);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const day = last;
    return { start, end: `${start.slice(0, 7)}-${String(day).padStart(2, "0")}`, label: date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) };
  }), [month]);
  const metrics = useQuery({ queryKey: ["daily-metrics", "goal-history", month], queryFn: async () => {
    const end = new Date(`${month}-01T12:00:00`);
    end.setMonth(end.getMonth() + 1, 0);
    const { data, error } = await supabase.from("daily_metrics").select("*").gte("date", months[5].start).lte("date", dateKey(end));
    if (error) throw error;
    return data as DailyMetrics[];
  }});
  const sales = useVendas();
  const closings = useFechamentosDiarios();
  const rows = useMemo(() => {
    if (!metrics.data || !sales.data || !closings.data) return [];
    const snapshots = months.map(range => {
      const source = metrics.data.filter(r => r.date.slice(0, 7) === range.start.slice(0, 7)).sort((a, b) => b.date.localeCompare(a.date));
      const goal = (key: string) => Number(source.find(r => Number(r[key as keyof DailyMetrics]) > 0)?.[key as keyof DailyMetrics] || 0);
      const items = validSales(sales.data).filter(s => inRange(s.data, range));
      return { goal, items, collected: revenueSummary(sales.data, closings.data, range).total };
    });
    const result = [{ label: "Faturamento coletado", currency: true, cells: snapshots.map(s => ({ value: s.collected, target: s.goal("meta_mensal_prevista"), stretch: s.goal("super_meta_mensal") })) }];
    for (const group of groups) {
      for (const currency of [false, true]) {
        result.push({ label: `${group.label} · ${currency ? "valor vendido" : "quantidade"}`, currency, cells: snapshots.map(s => {
          const items = s.items.filter(item => group.match(canonicalizeSaleCategory(item.servico || item.produto), item.origem));
          return { value: currency ? items.reduce((sum, item) => sum + Number(item.valor || 0), 0) : items.length,
            target: s.goal(`${currency ? "valor" : "meta"}_${group.key}`), stretch: s.goal(`super_${currency ? "valor" : "meta"}_${group.key}`) };
        }) });
      }
    }
    return result;
  }, [months, metrics.data, sales.data, closings.data]);
  const groupIndex = groups.findIndex(g => g.key === category);
  const operational = operationalIndicators.some(i => i.key === category);
  const row = rows[category === "revenue" ? 0 : 1 + groupIndex * 2 + (currency ? 1 : 0)];
  const format = (n: number) => row?.currency ? money(n) : n.toLocaleString("pt-BR");
  const chart = row?.cells.map((cell, index) => ({ ...cell, target: cell.target || null, stretch: cell.stretch || null, name: months[index].label })).reverse() || [];
  const insights = row ? (() => {
    const current = row.cells[0];
    const previous = row.cells[1];
    const best = row.cells.reduce((winner, cell, index) => cell.value > winner.value ? { value: cell.value, index } : winner, { value: -Infinity, index: 0 });
    const change = previous?.value > 0 ? ((current.value - previous.value) / previous.value) * 100 : null;
    const progress = current.target > 0 ? (current.value / current.target) * 100 : null;
    return [
      change == null ? "Ainda não há uma base válida para comparar com o mês anterior." : `${change >= 0 ? "Aumentou" : "Diminuiu"} ${Math.abs(change).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em relação a ${months[1].label}.`,
      `Melhor resultado dos seis meses: ${months[best.index].label}, com ${format(best.value)}.`,
      progress == null ? "Não há meta cadastrada para o mês selecionado." : `${progress.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da meta do mês selecionado foi atingida.`,
    ];
  })() : [];
  return <Section title="Comparativo de metas e indicadores" description="Escolha uma categoria para comparar os últimos seis meses completos.">
    <div className="mb-5 flex flex-wrap items-end gap-4">
      <div className="w-full sm:w-72"><p className="mb-2 text-sm font-medium">Categoria</p><Select value={category} onValueChange={setCategory}><SelectTrigger aria-label="Categoria da meta"><SelectValue /></SelectTrigger><SelectContent className="max-h-80"><SelectItem value="revenue">Faturamento coletado</SelectItem>{operationalIndicators.map(i => <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>)}{groups.map(g => <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>)}</SelectContent></Select></div>
      {category !== "revenue" && !operational && <div className="flex gap-2"><Button variant={currency ? "default" : "outline"} onClick={() => setCurrency(true)}>Valor vendido</Button><Button variant={!currency ? "default" : "outline"} onClick={() => setCurrency(false)}>Quantidade</Button></div>}
    </div>
    {ongoing && <p className="mb-4 text-xs text-muted-foreground">Meses anteriores completos. O mês atual mostra o acumulado disponível e continua em andamento.</p>}
    {operational ? <OperationalHistoryPanel indicatorKey={category} months={months} ongoing={ongoing}/> : metrics.isError || sales.isError || closings.isError ? <p role="alert">Não foi possível carregar a comparação de metas.</p> : !row ? <p>Carregando metas...</p> : <>
    <h3 className="mb-4 text-lg font-semibold">{row.label}</h3>
    <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="mb-3 text-sm font-semibold">Insights de {row.label}</p><div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">{insights.map((insight, index) => <p key={index} className="flex gap-2"><span className="text-primary">→</span><span>{insight}</span></p>)}</div></div>
    <div className="mb-6 h-64 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis width={64} tick={{fontSize:11}} tickFormatter={n => new Intl.NumberFormat("pt-BR", {notation:"compact"}).format(n)}/><Tooltip contentStyle={{background:"hsl(var(--popover))",borderColor:"hsl(var(--border))",borderRadius:12}} formatter={(n:number) => format(n)}/><Legend/><Bar dataKey="value" name="Realizado" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={48}/><Line dataKey="target" name="Meta mensal" stroke="#10b981" strokeWidth={2} connectNulls={false}/><Line dataKey="stretch" name="Supermeta" stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={2} connectNulls={false}/></ComposedChart></ResponsiveContainer></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{row.cells.map((cell, index) => {
      const previous = row.cells[index + 1]?.value;
      const diff = previous && previous > 0 ? (cell.value / previous - 1) * 100 : null;
      return <article key={months[index].start} className={`rounded-xl border p-5 ${index === 0 ? "border-primary/50 bg-primary/5" : "border-border bg-secondary/10"}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold capitalize">{months[index].label}</h4>{index === 0 && <span className="text-xs text-primary">Mês selecionado</span>}</div>
        <p className="text-xs text-muted-foreground">{ongoing && index === 0 ? "Acumulado do mês em andamento" : "Realizado no mês"}</p><p className="mt-1 text-2xl font-bold tabular-nums">{format(cell.value)}</p>
        <div className="mt-4 flex justify-between gap-2 text-sm"><span>Meta: {cell.target > 0 ? format(cell.target) : "Não cadastrada"}</span><strong className={cell.value >= cell.target && cell.target > 0 ? "text-success" : "text-primary"}>{pct(cell.value, cell.target)}</strong></div>
        <div className="my-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${cell.target > 0 ? Math.min(100, cell.value / cell.target * 100) : 0}%`}}/></div>
        <p className="mt-3 text-sm text-muted-foreground">Supermeta: <span className="text-foreground">{cell.stretch > 0 ? format(cell.stretch) : "Não cadastrada"}</span>{cell.stretch > 0 && <span className="ml-2 text-amber-500">{pct(cell.value,cell.stretch)}</span>}</p>
        {index < 5 && <p className={`mt-4 border-t border-border pt-3 text-sm ${diff != null && diff > 0 ? "text-success" : diff != null && diff < 0 ? "text-amber-500" : "text-muted-foreground"}`}>{diff == null ? "Mês anterior sem base para comparação" : `${diff > 0 ? "+" : ""}${diff.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em relação ao mês anterior`}</p>}
      </article>;
    })}</div><p className="mt-4 text-xs text-muted-foreground">Faturamento usa recebimentos líquidos. Valores por serviço usam vendas contratadas. Upsell pode incluir vendas das outras categorias.</p></>}
  </Section>;
}
