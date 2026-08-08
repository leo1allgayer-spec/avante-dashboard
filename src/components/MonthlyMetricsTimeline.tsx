import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CalendarRange } from "lucide-react";
import type { MetaAdsData } from "@/hooks/useMetaAds";
import { useFechamentosDiarios } from "@/hooks/useFechamentosDiarios";

const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getMetaLeads = (actions?: Array<{ action_type: string; value: string }>) => {
  const types = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "offsite_complete_registration_add_meta_leads", "offsite_content_view_add_meta_leads"];
  for (const type of types) {
    const action = actions?.find((item) => item.action_type.toLowerCase() === type);
    if (action) return Number(action.value || 0);
  }
  return 0;
};

const getMetaConversations = (actions?: Array<{ action_type: string; value: string }>) => {
  const preferredTypes = [
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.total_messaging_connection",
    "onsite_conversion.messaging_first_reply",
  ];
  for (const type of preferredTypes) {
    const action = actions?.find((item) => item.action_type.toLowerCase() === type);
    if (action) return Number(action.value || 0);
  }
  return (actions || []).reduce((total, item) => {
    const type = item.action_type.toLowerCase();
    return type.includes("conversation_started") || type.includes("whatsapp") ? total + Number(item.value || 0) : total;
  }, 0);
};

type TimelineRow = {
  key: string;
  label: string;
  faturamento: number;
  vendas: number;
  cursosFeitos: number;
  leads: number;
  ads: number;
};

export default function MonthlyMetricsTimeline() {
  const startDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 5, 1);
    return localDateKey(date);
  }, []);
  const { data: fechamentos = [] } = useFechamentosDiarios();

  const { data, isLoading } = useQuery({
    queryKey: ["monthly-metrics-timeline", startDate],
    queryFn: async () => {
      const [metricsResult, vendasResult, metaResult] = await Promise.all([
        supabase.from("daily_metrics").select("date, leads, ads, curso_feito, faturamento_marcado, meta_mensal_prevista, super_meta_mensal").gte("date", startDate),
        supabase.from("vendas").select("data, valor, status").gte("data", startDate),
        supabase.functions.invoke("meta-ads", { body: { datePreset: "custom", since: startDate, until: localDateKey(new Date()) } }),
      ]);
      if (metricsResult.error) throw metricsResult.error;
      if (vendasResult.error) throw vendasResult.error;
      return {
        metrics: metricsResult.data || [],
        vendas: vendasResult.data || [],
        meta: metaResult.error || metaResult.data?.error ? null : metaResult.data as MetaAdsData,
      };
    },
  });

  const months = useMemo<TimelineRow[]>(() => {
    const rows = new Map<string, TimelineRow>();
    const now = new Date();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      rows.set(key, { key, label: monthLabel.format(date).replace(" de ", "/"), faturamento: 0, vendas: 0, cursosFeitos: 0, leads: 0, ads: 0 });
    }
    const metaMonths = new Set((data?.meta?.dailyInsights || []).map((item) => item.date_start.slice(0, 7)));
    data?.metrics.forEach((item) => {
      const isMetaRow = Number(item.meta_mensal_prevista || 0) > 0 || Number(item.super_meta_mensal || 0) > 0;
      if (isMetaRow) return;
      const row = rows.get(item.date.slice(0, 7));
      if (row) {
        if (!metaMonths.has(item.date.slice(0, 7))) {
          row.leads += Number(item.leads || 0);
          row.ads += Number(item.ads || 0);
        }
        row.cursosFeitos += Number(item.curso_feito || 0);
      }
    });
    data?.meta?.dailyInsights?.forEach((item) => {
      const row = rows.get(item.date_start.slice(0, 7));
      if (row) {
        row.leads += getMetaLeads(item.actions) + getMetaConversations(item.actions);
        row.ads += Number(item.spend || 0);
      }
    });
    data?.vendas.forEach((item) => {
      if (item.status === "recusada" || item.status === "cancelada") return;
      const row = rows.get(item.data.slice(0, 7));
      if (row) {
        row.vendas += 1;
      }
    });
    fechamentos.forEach((item) => {
      if ((item.status || "").toLowerCase() === "cancelado") return;
      const row = rows.get(item.data.slice(0, 7));
      if (row) {
        row.faturamento += Number(item.valor_sinal || 0);
      }
    });
    return Array.from(rows.values());
  }, [data, fechamentos]);

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
        <div className="flex min-w-max items-stretch gap-2 lg:grid lg:min-w-0 lg:grid-cols-6 lg:gap-3">
          {months.map((month, index) => (
            <div key={month.key} className="flex min-w-0 items-center">
              <div className="w-56 min-w-0 rounded-xl border border-border/40 bg-secondary/20 p-3 lg:w-full">
                <p className="mb-3 text-xs font-semibold capitalize text-primary">{month.label}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Faturamento</span><strong className="text-right font-semibold text-foreground">{money.format(month.faturamento)}</strong></div>
                  <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Vendas</span><strong className="text-right font-semibold text-accent">{month.vendas}</strong></div>
                  <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Leads</span><strong className="text-right font-semibold text-foreground">{month.leads}</strong></div>
                  <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">Anúncios</span><strong className="text-right font-semibold text-amber-400">{money.format(month.ads)}</strong></div>
                  <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">CAC total</span><strong className="text-right font-semibold text-foreground">{month.vendas > 0 ? money.format(month.ads / month.vendas) : "—"}</strong></div>
                  <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">CAC cursos</span><strong className="text-right font-semibold text-primary">{month.cursosFeitos > 0 ? money.format(month.ads / month.cursosFeitos) : "—"}</strong></div>
                  <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">ROAS</span><strong className="text-right font-semibold text-emerald-400">{month.ads > 0 ? `${(month.faturamento / month.ads).toFixed(2).replace(".", ",")}x` : "—"}</strong></div>
                </div>
              </div>
              {index < months.length - 1 && <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/40 lg:hidden" />}
            </div>
          ))}
        </div>
      </div>
      {isLoading && <p className="mt-2 text-xs text-muted-foreground">Carregando histórico...</p>}
    </section>
  );
}
