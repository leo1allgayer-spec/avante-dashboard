import { collectionCalculator } from "@/lib/collectionCalculator";
import { canonicalizeSaleCategory, isCourseCategory } from "@/constants/serviceCategories";
import type { Venda } from "@/hooks/useVendas";
import type { FechamentoDiario } from "@/hooks/useFechamentosDiarios";

export type DateRange = { start: string; end: string };
export type EvolutionPreset = "month" | "previous" | "3" | "6" | "12" | "year" | "custom";
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const inRange = (date: string | null | undefined, range: DateRange) => Boolean(date && date.slice(0, 10) >= range.start && date.slice(0, 10) <= range.end);
export function evolutionRange(preset: EvolutionPreset, now = new Date(), custom?: DateRange) {
  if (preset === "custom" && custom) return custom;
  const endMonth = now.getMonth() - (preset === "previous" ? 1 : 0);
  const months = ["3", "6", "12"].includes(preset) ? Number(preset) : 1;
  return { start: dateKey(new Date(now.getFullYear(), preset === "year" ? 0 : endMonth - months + 1, 1)), end: dateKey(new Date(now.getFullYear(), endMonth + 1, 0)) };
}
export function previousRange(range: DateRange): DateRange {
  const start = new Date(`${range.start}T12:00:00`), end = new Date(`${range.end}T12:00:00`);
  if (start.getDate() === 1 && end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()) {
    const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
    return { start: dateKey(new Date(start.getFullYear(), start.getMonth() - months, 1)), end: dateKey(new Date(start.getFullYear(), start.getMonth(), 0)) };
  }
  const days = Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000) + 1;
  end.setTime(start.getTime()); end.setDate(end.getDate() - 1);
  start.setDate(start.getDate() - days);
  return { start: dateKey(start), end: dateKey(end) };
}
export function monthRanges(range: DateRange) {
  const cursor = new Date(`${range.start.slice(0, 7)}-01T12:00:00`);
  const rows: DateRange[] = [];
  while (dateKey(cursor) <= range.end) {
    rows.push({ start: [dateKey(cursor), range.start].sort().at(-1)!, end: [dateKey(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)), range.end].sort()[0] });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return rows;
}
export function chartRanges(range: DateRange) {
  if (range.start.slice(0, 7) !== range.end.slice(0, 7)) return monthRanges(range);
  const cursor = new Date(`${range.start}T12:00:00`), rows: DateRange[] = [];
  while (dateKey(cursor) <= range.end) {
    rows.push({ start: dateKey(cursor), end: dateKey(cursor) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
}
export const ratio = (value: number | null, base: number | null) => value != null && base != null && base > 0 ? value / base : null;
export const change = (value: number | null, previous: number | null) => value != null && previous != null && previous > 0 ? (value - previous) / previous * 100 : null;
const normalize = (s: string) => s.trim().toLocaleLowerCase("pt-BR");
export const validSales = (sales: Venda[]) => sales.filter(s => !["cancelada", "recusada"].includes(s.status));
export function salesSummary(sales: Venda[], range: DateRange) {
  const rows = validSales(sales).filter(s => inRange(s.data, range));
  // Reuse the sale grouping already used by Vendas (one purchase may contain several items).
  const count = new Set(rows.map(s => [s.data, normalize(s.cliente) || s.id, normalize(s.vendedor)].join("|"))).size;
  const value = rows.reduce((sum, row) => sum + Number(row.valor || 0), 0);
  return { count, value, ticket: ratio(value, count), students: new Set(rows.map(s => normalize(s.cliente) || s.id)).size };
}
export function revenueSummary(sales: Venda[], closings: FechamentoDiario[], range: DateRange) {
  const calc = collectionCalculator(sales, range.start, range.end);
  const categories: Record<string, number> = {};
  let total = 0;
  closings.filter(c => !["cancelado", "cancelada"].includes(c.status.toLowerCase())).forEach(c => {
    const amount = calc.getCollectedNetInPeriod(c);
    const category = canonicalizeSaleCategory(c.categoria || c.produto_servico);
    total += amount;
    if (amount) categories[category] = (categories[category] || 0) + amount;
  });
  return { total, categories, courses: Object.entries(categories).filter(([name]) => isCourseCategory(name)).reduce((sum, [,value]) => sum + value, 0) };
}
export type EvolutionClient = { id: string; status: string; start_date: string | null; contract_value: number | null; payment_status: string | null; notes: unknown };
export function clientSnapshot(clients: EvolutionClient[], range: DateRange) {
  const active = clients.filter(c => c.status === "Ativo");
  let mrr = 0, missingContracts = 0;
  active.filter(c => c.payment_status !== "permuta").forEach(c => {
    const config = Array.isArray(c.notes) ? c.notes.find(n => n.id === "__contract_config__") : null;
    try {
      if (config && JSON.parse(config.text).type === "TCV") return;
      if (c.contract_value == null || Number(c.contract_value) <= 0) { missingContracts++; return; }
      mrr += Number(c.contract_value);
    } catch { missingContracts++; }
  });
  return { active: active.length, mrr: missingContracts ? null : mrr, knownMrr: mrr, missingContracts,
    joined: clients.some(c => !c.start_date) ? null : clients.filter(c => inRange(c.start_date, range)).length,
    recordedJoined: clients.filter(c => inRange(c.start_date, range)).length };
}
export const courseSales = (sales: Venda[]) => sales.filter(s => isCourseCategory(s.servico || s.produto));
