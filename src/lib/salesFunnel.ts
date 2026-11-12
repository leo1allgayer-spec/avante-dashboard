export function funnelIndicators(count: number | null, previous: number | null, leads: number | null, investment: number | null) {
  return {
    cost: count != null && count > 0 && investment != null ? investment / count : null,
    conversion: count != null && previous != null && previous > 0 ? count / previous * 100 : null,
    share: count != null && leads != null && leads > 0 ? count / leads * 100 : null,
  };
}
