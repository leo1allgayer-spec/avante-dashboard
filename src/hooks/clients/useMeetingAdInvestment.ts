import { useQuery } from "@tanstack/react-query";
import { format, lastDayOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { monthlyAdInvestment } from "@/lib/monthlyAdInvestment";
import type { MetaAdsData } from "@/hooks/useMetaAds";

export function useMeetingAdInvestment(month: string, range?: { since: string; until: string }) {
  const since = range?.since || `${month}-01`;
  const until = range?.until || [format(lastDayOfMonth(new Date(`${since}T12:00:00`)), "yyyy-MM-dd"), format(new Date(), "yyyy-MM-dd")].sort()[0];
  return useQuery({
    queryKey: ["meeting-ad-investment", since, until],
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      if (since > until) return { investment: null, fallback: false };
      const [metrics, meta] = await Promise.all([
        supabase.from("daily_metrics").select("date, ads, meta_mensal_prevista, super_meta_mensal").gte("date", since).lte("date", until),
        supabase.functions.invoke("meta-ads", { body: { datePreset: "custom", since, until } }),
      ]);
      if (metrics.error) throw metrics.error;
      const unavailable = Boolean(meta.error || meta.data?.error);
      const insights = unavailable ? [] : (meta.data as MetaAdsData | null)?.dailyInsights || [];
      const registered = (metrics.data || []).filter((day) => !Number(day.meta_mensal_prevista || 0) && !Number(day.super_meta_mensal || 0));
      if (unavailable && !registered.length) throw new Error("Não foi possível obter o investimento em anúncios deste mês.");
      const hasData = insights.length > 0 || registered.length > 0;
      return { investment: hasData ? monthlyAdInvestment(registered, insights) : null, fallback: unavailable };
    },
  });
}
