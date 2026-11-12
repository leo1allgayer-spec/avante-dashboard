import { dateKey, type DateRange } from "./evolutionMetrics";
export type AnalyticsPeriod = "all" | "day" | "week" | "month" | "year";
export function analyticsRange(mode: AnalyticsPeriod, anchor: string): DateRange | null {
  if (mode === "all") return null;
  const d = new Date(`${anchor}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return null;
  if (mode === "day") return { start: anchor, end: anchor };
  if (mode === "week") {
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const end = new Date(d); end.setDate(end.getDate() + 6);
    return { start: dateKey(d), end: dateKey(end) };
  }
  return { start: dateKey(new Date(d.getFullYear(), mode === "year" ? 0 : d.getMonth(), 1)), end: dateKey(new Date(d.getFullYear(), mode === "year" ? 12 : d.getMonth() + 1, 0)) };
}
export function localTimestampDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat("sv-SE", {timeZone:"America/Sao_Paulo"}).format(d) : "";
}
