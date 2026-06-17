import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface DailyMetrics {
  id: string;
  user_id: string;
  date: string;
  ads: number;
  meta_mensal_prevista: number;
  meta_mensal_realizada: number;
  meta_diaria_prevista: number;
  meta_diaria_realizada: number;
  faturamento_dia: number;
  faturamento_marcado: number;
  leads: number;
  custo_por_lead: number;
  lead_mql: number;
  custo_por_lead_mql: number;
  cac: number;
  roas: number;
  curso_marcado: number;
  curso_feito: number;
  meta_cursos: number;
  meta_site: number;
  meta_negocio_local: number;
  meta_crm: number;
  meta_upsell: number;
  valor_cursos: number;
  valor_site: number;
  valor_negocio_local: number;
  valor_crm: number;
  valor_upsell: number;
  super_meta_mensal: number;
  super_meta_diaria: number;
  avaliacao_google: number;
}

export function useTodayMetrics() {
  return useQuery({
    queryKey: ["daily-metrics", "today"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_metrics")
        .select("*")
        .eq("date", today)
        .maybeSingle();
      if (error) throw error;
      return data as DailyMetrics | null;
    },
  });
}

export function useMonthMetrics(year?: number, month?: number) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth(); // 0-indexed

  return useQuery({
    queryKey: ["daily-metrics", "month", y, m],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const startOfMonth = new Date(y, m, 1).toISOString().split("T")[0];
      const endOfMonth = new Date(y, m + 1, 0).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_metrics")
        .select("*")
        .gte("date", startOfMonth)
        .lte("date", endOfMonth)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data as DailyMetrics[]) || [];
    },
  });
}

export function useAvailableMonths() {
  return useQuery({
    queryKey: ["daily-metrics", "available-months"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("daily_metrics")
        .select("date")
        .order("date", { ascending: false });
      if (error) throw error;
      const months = new Set<string>();
      (data || []).forEach((d: { date: string }) => {
        const [y, m] = d.date.split("-");
        months.add(`${y}-${m}`);
      });
      return Array.from(months).sort().reverse();
    },
  });
}

export function useUpsertMetrics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (metrics: Partial<DailyMetrics> & { date: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("daily_metrics")
        .upsert(
          { ...metrics, user_id: user.id },
          { onConflict: "user_id,date" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
    },
  });
}

export function useDeleteMetrics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_metrics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
    },
  });
}
