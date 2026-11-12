type DailyMetric = { date: string; ads: number | null; meta_mensal_prevista?: number | null; super_meta_mensal?: number | null };
type AdDay = { date_start: string; spend: string };

// Same basis as the monthly overview cards: advertising plus 12.25% tax.
export function monthlyAdInvestment(metrics: DailyMetric[], insights: AdDay[]): number {
  const metaByDay = new Map(insights.map((day) => [day.date_start, Number(day.spend || 0)]));
  const registered = metrics.reduce((total, day) => {
    if (Number(day.meta_mensal_prevista || 0) > 0 || Number(day.super_meta_mensal || 0) > 0 || metaByDay.has(day.date)) return total;
    return total + Number(day.ads || 0);
  }, 0);
  return (registered + [...metaByDay.values()].reduce((sum, spend) => sum + spend, 0)) * 1.1225;
}
