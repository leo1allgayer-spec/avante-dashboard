import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CalendarRange } from "lucide-react";

const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type TimelineRow = {
  key: string;
  label: string;
  faturamento: number;
  vendas: number;
  leads: number;
  ads: number;
};

export default function MonthlyMetricsTimeline() {
  const startDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 5, 1);
    return date.toISOString().slice(0, 10);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["monthly-metrics-timeline", startDate],
    queryFn: async () => {
      const [metricsResult, vendasResult] = await Promise.all([
        supabase.from("daily_metrics").select("date, leads, ads").gte("date", startDate),
        supabase.from("vendas").select("data, valor, status").gte("data", startDate),
      ]);
      if (metricsResult.error) throw metricsResult.error;
      if (vendasResult.error) throw vendasResult.error;
      return { metrics: metricsResult.data || [], vendas: vendasResult.data || [] };
    },
  });

  const months = useMemo<TimelineRow[]>(() => {
    const rows = new Map<string, TimelineRow>();
    const now = new Date();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      rows.set(key, { key, label: monthLabel.format(date).replace(" de ", "/"), faturamento: 0, vendas: 0, leads: 0, ads: 0 });
    }
    data?.metrics.forEach((item) => {
      const row = rows.get(item.date.slice(0, 7));
      if (row) {
        row.leads += Number(item.leads || 0);
        row.ads += Number(item.ads || 0);
      }
    });
    data?.vendas.forEach((item) => {
      if (item.status !== "aprovada") return;
      const row = rows.get(item.data.slice(0, 7));
      if (row) {
        row.faturamento += Number(item.valor || 0);
        row.vendas += 1;
      }
    });
    return Array.from(rows.values());
  }, [data]);

  return (
    <section className="glass-card-hover rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarRange className="h-4 w-4 text-primary" />
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Evolução mês a mês</h3>
          <p className="text-xs text-muted-foreground">Últimos 6 meses de faturamento, vendas, leads e anúncios</p>
        </div>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch">
          {months.map((month, index) => (
            <div key={month.key} className="flex items-center">
              <div className="w-44 rounded-xl border border-border/40 bg-secondary/20 p-3">
                <p className="mb-2 text-xs font-semibold capitalize text-primary">{month.label}</p>
                <p className="font-display text-base font-bold text-foreground">{money.format(month.faturamento)}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div><strong className="block text-sm text-accent">{month.vendas}</strong><span className="text-[9px] text-muted-foreground">vendas</span></div>
                  <div><strong className="block text-sm text-foreground">{month.leads}</strong><span className="text-[9px] text-muted-foreground">leads</span></div>
                  <div><strong className="block text-sm text-amber-400">{money.format(month.ads)}</strong><span className="text-[9px] text-muted-foreground">ads</span></div>
                </div>
              </div>
              {index < months.length - 1 && <ArrowRight className="mx-2 h-4 w-4 shrink-0 text-muted-foreground/40" />}
            </div>
          ))}
        </div>
      </div>
      {isLoading && <p className="mt-2 text-xs text-muted-foreground">Carregando histórico...</p>}
    </section>
  );
}
