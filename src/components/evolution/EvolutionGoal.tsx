import { dateKey, ratio, revenueSummary, type DateRange } from "@/lib/evolutionMetrics";
import type { DailyMetrics } from "@/hooks/useMetrics";
import type { Venda } from "@/hooks/useVendas";
import type { FechamentoDiario } from "@/hooks/useFechamentosDiarios";
import MetricsForm from "@/components/MetricsForm";
import { Section, money, percent } from "./EvolutionPrimitives";

export default function EvolutionGoal({ range, metrics, sales, closings }: { range: DateRange; metrics?: DailyMetrics[]; sales?: Venda[]; closings?: FechamentoDiario[] }) {
  const month = range.end.slice(0, 7);
  const lastDay = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0);
  const today = new Date();
  const monthRange = { start: `${month}-01`, end: dateKey(lastDay) };
  const monthMetrics = metrics?.filter(row => row.date.startsWith(month));
  const targetRow = monthMetrics?.reduce<DailyMetrics | undefined>((best, row) => !best || row.meta_mensal_prevista > best.meta_mensal_prevista ? row : best, undefined);
  const target = targetRow?.meta_mensal_prevista || null;
  const collected = sales && closings ? revenueSummary(sales, closings, monthRange).total : null;
  const achieved = ratio(collected, target);
  const left = target != null && collected != null ? Math.max(0, target - collected) : null;
  const remainingDays = month < dateKey(today).slice(0,7) ? 0 : month > dateKey(today).slice(0,7) ? lastDay.getDate() : lastDay.getDate() - today.getDate() + 1;
  return <Section title={`Meta mensal · ${new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`} description="Meta do último mês do intervalo, considerando o mês completo. Edite as metas por categoria no formulário existente." action={<MetricsForm key={month} initialDate={targetRow?.date || `${month}-01`} triggerLabel="Editar meta mensal" />}>
    <div className="flex flex-wrap justify-between gap-3"><p className="text-xl font-semibold">{money(collected)} <span className="text-sm font-normal text-muted-foreground">/ {money(target)}</span></p><strong className="text-primary">{percent(achieved == null ? null : achieved * 100)}{achieved != null && " atingido"}</strong></div>
    <div className="my-4 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progresso da meta mensal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={achieved == null ? undefined : Math.min(100, achieved * 100)}><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, (achieved || 0) * 100))}%` }}/></div>
    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm"><span>Faltam <strong>{money(left)}</strong></span><span><strong>{remainingDays}</strong> dias restantes{month === dateKey(today).slice(0,7) && " (incluindo hoje)"}</span><span>Necessário por dia: <strong>{money(left === 0 ? 0 : ratio(left, remainingDays))}</strong></span></div>
    {!target && <p className="mt-3 text-xs text-muted-foreground">Cadastre os valores das metas por categoria para acompanhar o progresso.</p>}
  </Section>;
}
