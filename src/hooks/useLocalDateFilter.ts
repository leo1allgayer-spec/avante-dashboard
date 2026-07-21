import { useState, useMemo } from "react";

import { formatLocalDate } from "./useMetrics";

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
  return formatLocalDate(d);
}

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function useLocalDateFilter() {
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
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    return {
      start: fmt(new Date(y, m, 1)),
      end: fmt(new Date(y, m + 1, 0)),
    };
  }, [mode, anchor]);

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

  function filterByDate<T extends { data: string }>(items: T[]): T[] {
    return items.filter((item) => item.data >= range.start && item.data <= range.end);
  }

  return { mode, setMode, label, range, goBack, goForward, filterByDate };
}
