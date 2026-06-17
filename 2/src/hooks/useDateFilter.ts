import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { DailyMetrics } from "./useMetrics";
import type { Venda } from "./useVendas";
import type { CursoDado } from "./useCursosDados";

export type FilterMode = "dia" | "semana" | "mes";

function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function useDateFilter() {
  const [mode, setMode] = useState<FilterMode>("mes");
  const [anchor, setAnchor] = useState(new Date());

  const range = useMemo(() => {
    if (mode === "dia") {
      return { start: fmt(anchor), end: fmt(anchor) };
    }
    if (mode === "semana") {
      const { start, end } = getWeekRange(anchor);
      return { start: fmt(start), end: fmt(end) };
    }
    // mes
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    return {
      start: fmt(new Date(y, m, 1)),
      end: fmt(new Date(y, m + 1, 0)),
    };
  }, [mode, anchor]);

  // Always compute the full month range for meta lookups
  const monthRange = useMemo(() => {
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    return {
      start: fmt(new Date(y, m, 1)),
      end: fmt(new Date(y, m + 1, 0)),
    };
  }, [anchor]);

  const label = useMemo(() => {
    if (mode === "dia") {
      return anchor.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
    }
    if (mode === "semana") {
      const { start, end } = getWeekRange(anchor);
      return `${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }, [mode, anchor]);

  const goBack = () => {
    const d = new Date(anchor);
    if (mode === "dia") d.setDate(d.getDate() - 1);
    else if (mode === "semana") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setAnchor(d);
  };

  const goForward = () => {
    const d = new Date(anchor);
    if (mode === "dia") d.setDate(d.getDate() + 1);
    else if (mode === "semana") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setAnchor(d);
  };

  // Fetch daily_metrics for range (filtered by current user)
  const metricsQuery = useQuery({
    queryKey: ["filtered-metrics", range.start, range.end],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("daily_metrics")
        .select("*")
        .gte("date", range.start)
        .lte("date", range.end)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data as DailyMetrics[]) || [];
    },
  });

  // Fetch vendas for range
  const vendasQuery = useQuery({
    queryKey: ["filtered-vendas", range.start, range.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .gte("data", range.start)
        .lte("data", range.end)
        .order("data", { ascending: false });
      if (error) throw error;
      return (data as Venda[]) || [];
    },
  });

  // Fetch cursos_dados for range
  const cursosQuery = useQuery({
    queryKey: ["filtered-cursos-dados", range.start, range.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos_dados")
        .select("*")
        .gte("data", range.start)
        .lte("data", range.end)
        .order("data", { ascending: false });
      if (error) throw error;
      return (data as CursoDado[]) || [];
    },
  });

  // Always fetch full month metrics (for meta lookups in dia/semana modes)
  const monthMetricsQuery = useQuery({
    queryKey: ["month-metrics", monthRange.start, monthRange.end],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("daily_metrics")
        .select("*")
        .gte("date", monthRange.start)
        .lte("date", monthRange.end)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data as DailyMetrics[]) || [];
    },
  });

  const monthVendasQuery = useQuery({
    queryKey: ["month-vendas", monthRange.start, monthRange.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .gte("data", monthRange.start)
        .lte("data", monthRange.end)
        .order("data", { ascending: false });
      if (error) throw error;
      return (data as Venda[]) || [];
    },
  });

  return {
    mode,
    setMode,
    label,
    range,
    anchor,
    setAnchor,
    goBack,
    goForward,
    metrics: metricsQuery.data || [],
    monthMetrics: monthMetricsQuery.data || [],
    vendas: vendasQuery.data || [],
    monthVendas: monthVendasQuery.data || [],
    cursosDados: cursosQuery.data || [],
    isLoading: metricsQuery.isLoading || vendasQuery.isLoading || monthVendasQuery.isLoading,
  };
}
