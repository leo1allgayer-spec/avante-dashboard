import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw, Loader2, Trash2, Plus } from "lucide-react";
import { useSyncSheets } from "@/hooks/useSyncSheets";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DAY_NAMES: Record<number, string> = {
  0: "DOMINGO", 1: "SEGUNDA", 2: "TERÇA", 3: "QUARTA",
  4: "QUINTA", 5: "SEXTA", 6: "SÁBADO",
};

const formatBRL = (v: number) => {
  if (!v) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(v);
};

const formatNum = (v: number | null | undefined, decimals = 0) => {
  if (v === null || v === undefined || v === 0) return "";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const parseInputNum = (s: string): number => {
  if (!s.trim()) return 0;
  const clean = s.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

// Column definitions for editable fields
type ColKey = "ads" | "leads" | "custo_por_lead" | "lead_mql" | "custo_por_lead_mql" | "curso_marcado" | "curso_feito" | "faturamento_marcado" | "faturamento_dia" | "roas" | "cac";

interface ColDef {
  key: ColKey;
  label: string;
  format: "brl" | "int" | "dec";
  decimals?: number;
  colorClass?: string;
}

const COLUMNS: ColDef[] = [
  { key: "ads", label: "ADS", format: "brl" },
  { key: "leads", label: "Leads", format: "int" },
  { key: "custo_por_lead", label: "CPL", format: "brl" },
  { key: "lead_mql", label: "MQL", format: "int", colorClass: "text-accent" },
  { key: "custo_por_lead_mql", label: "CPL MQL", format: "brl" },
  { key: "curso_marcado", label: "Curso Marcado", format: "int" },
  { key: "curso_feito", label: "Curso Feito", format: "int" },
  { key: "faturamento_marcado", label: "Fat. Marcado", format: "brl", colorClass: "font-semibold text-foreground" },
  { key: "faturamento_dia", label: "Fat. Feito", format: "brl", colorClass: "font-semibold text-foreground" },
  { key: "roas", label: "ROAS", format: "dec", decimals: 2 },
  { key: "cac", label: "CAC", format: "dec", decimals: 2 },
];

interface MetricRow {
  id?: string;
  user_id?: string;
  updated_at?: string;
  ads?: number;
  date: string;
  leads: number;
  lead_mql: number;
  custo_por_lead: number;
  custo_por_lead_mql: number;
  faturamento_marcado: number;
  faturamento_dia: number;
  roas: number;
  cac: number;
  curso_marcado: number;
  curso_feito: number;
}

// Editable cell component
const EditableCell = ({
  value,
  format,
  decimals = 0,
  colorClass = "",
  onSave,
}: {
  value: number;
  format: "brl" | "int" | "dec";
  decimals?: number;
  colorClass?: string;
  onSave: (v: number) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const display = format === "brl" ? formatBRL(value) : format === "int" ? formatNum(value) : formatNum(value, decimals);

  const startEdit = () => {
    setEditing(true);
    setText(value ? String(value).replace(".", ",") : "");
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const commit = () => {
    setEditing(false);
    const parsed = parseInputNum(text);
    if (parsed !== (value || 0)) {
      onSave(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
    if (e.key === "Tab") {
      commit();
      // Let the default tab behavior work
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full bg-secondary/80 border border-accent/30 rounded px-1.5 py-0.5 text-xs text-right text-foreground outline-none focus:border-accent tabular-nums"
        style={{ minWidth: 60 }}
      />
    );
  }

  return (
    <div
      onClick={startEdit}
      className={`cursor-pointer hover:bg-secondary/50 rounded px-1 py-0.5 -mx-1 text-xs text-right tabular-nums transition-colors ${colorClass}`}
      title="Clique para editar"
    >
      {display || <span className="text-muted-foreground/20">—</span>}
    </div>
  );
};

const PlanilhaPage = () => {
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const syncSheets = useSyncSheets();
  const { toast } = useToast();
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = session?.user?.id ?? null;

  // Auto-detect latest month with data
   const { data: availableMonths } = useQuery({
    queryKey: ["daily-metrics", "available-months"],
    enabled: !!currentUserId,
    queryFn: async () => {
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

  // Set initial month to latest with data
  useEffect(() => {
    if (availableMonths && availableMonths.length > 0 && year === null) {
      const [y, m] = availableMonths[0].split("-");
      setYear(parseInt(y));
      setMonth(parseInt(m) - 1);
    }
  }, [availableMonths, year]);

  const activeYear = year ?? new Date().getFullYear();
  const activeMonth = month ?? new Date().getMonth();

  const { data: allData } = useQuery({
    queryKey: ["planilha-metrics", activeYear, activeMonth],
    enabled: !!currentUserId,
    queryFn: async () => {
      const start = new Date(activeYear, activeMonth, 1).toISOString().split("T")[0];
      const end = new Date(activeYear, activeMonth + 1, 0).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_metrics")
        .select("id, user_id, updated_at, ads, date, leads, lead_mql, custo_por_lead, custo_por_lead_mql, faturamento_marcado, faturamento_dia, roas, cac, curso_marcado, curso_feito")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as MetricRow[]) || [];
    },
  });

  const dataMap = useMemo(() => {
    const map: Record<string, MetricRow> = {};

    (allData || []).forEach((row) => {
      const current = map[row.date];
      if (!current) {
        map[row.date] = row;
        return;
      }

      const currentUpdatedAt = current.updated_at ? new Date(current.updated_at).getTime() : 0;
      const rowUpdatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;

      if (rowUpdatedAt >= currentUpdatedAt) {
        map[row.date] = row;
      }
    });

    return map;
  }, [allData]);

  const daysInMonth = useMemo(() => {
    const days: Date[] = [];
    const total = new Date(activeYear, activeMonth + 1, 0).getDate();
    for (let d = 1; d <= total; d++) {
      days.push(new Date(activeYear, activeMonth, d));
    }
    return days;
  }, [activeYear, activeMonth]);

  const weeks = useMemo(() => {
    const result: { weekNum: number; days: Date[] }[] = [];
    let currentWeek: Date[] = [];
    let currentWeekNum = 1;
    daysInMonth.forEach((day, i) => {
      currentWeek.push(day);
      if (day.getDay() === 0 || i === daysInMonth.length - 1) {
        result.push({ weekNum: currentWeekNum, days: [...currentWeek] });
        currentWeek = [];
        currentWeekNum++;
      }
    });
    return result;
  }, [daysInMonth]);

  // Save a single cell value
  const saveCell = useCallback(async (date: string, field: ColKey, value: number) => {
    try {
      if (!currentUserId) {
        toast({ title: "Erro", description: "Sessão não carregada", variant: "destructive" });
        return;
      }

      const updated_at = new Date().toISOString();
      const payload: TablesInsert<"daily_metrics"> = {
        user_id: currentUserId,
        date,
        updated_at,
      };

      switch (field) {
        case "ads":
          payload.ads = value;
          break;
        case "leads":
          payload.leads = value;
          break;
        case "custo_por_lead":
          payload.custo_por_lead = value;
          break;
        case "lead_mql":
          payload.lead_mql = value;
          break;
        case "custo_por_lead_mql":
          payload.custo_por_lead_mql = value;
          break;
        case "curso_marcado":
          payload.curso_marcado = value;
          break;
        case "curso_feito":
          payload.curso_feito = value;
          break;
        case "faturamento_marcado":
          payload.faturamento_marcado = value;
          break;
        case "faturamento_dia":
          payload.faturamento_dia = value;
          break;
        case "roas":
          payload.roas = value;
          break;
        case "cac":
          payload.cac = value;
          break;
      }

      const { error } = await supabase
        .from("daily_metrics")
        .upsert(payload, { onConflict: "user_id,date" });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["planilha-metrics", activeYear, activeMonth] });
      queryClient.invalidateQueries({ queryKey: ["daily-metrics", "available-months"] });
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
    } catch (err) {
      toast({ title: "Erro ao salvar", description: (err as Error).message, variant: "destructive" });
    }
  }, [currentUserId, queryClient, toast, activeYear, activeMonth]);

  const getAds = (r: MetricRow) => Number(r.ads) || 0;

  // Delete all metrics for a given week
  const deleteWeek = useCallback(async (days: Date[]) => {
    if (!currentUserId) return;
    try {
      const dates = days.map(d => d.toISOString().split("T")[0]);
      const { error } = await supabase
        .from("daily_metrics")
        .delete()
        .in("date", dates);
      if (error) throw error;
      toast({ title: "Semana apagada com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["planilha-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
    } catch (err) {
      toast({ title: "Erro ao apagar", description: (err as Error).message, variant: "destructive" });
    }
  }, [currentUserId, queryClient, toast]);

  // Delete all metrics for the entire month
  const deleteMonth = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const start = new Date(activeYear, activeMonth, 1).toISOString().split("T")[0];
      const end = new Date(activeYear, activeMonth + 1, 0).toISOString().split("T")[0];
      const { error } = await supabase
        .from("daily_metrics")
        .delete()
        .gte("date", start)
        .lte("date", end);
      if (error) throw error;
      toast({ title: `${MONTH_NAMES[activeMonth]} apagado com sucesso` });
      queryClient.invalidateQueries({ queryKey: ["planilha-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
    } catch (err) {
      toast({ title: "Erro ao apagar", description: (err as Error).message, variant: "destructive" });
    }
  }, [currentUserId, activeYear, activeMonth, queryClient, toast]);

  // Add empty rows for all days in a week
  const addWeek = useCallback(async (days: Date[]) => {
    if (!currentUserId) return;
    try {
      const rows = days
        .filter(d => !dataMap[d.toISOString().split("T")[0]])
        .map(d => ({
          user_id: currentUserId,
          date: d.toISOString().split("T")[0],
          ads: 0,
        }));
      if (rows.length === 0) {
        toast({ title: "Todos os dias já existem nesta semana" });
        return;
      }
      const { error } = await supabase
        .from("daily_metrics")
        .upsert(rows, { onConflict: "user_id,date" });
      if (error) throw error;
      toast({ title: `${rows.length} dias adicionados` });
      queryClient.invalidateQueries({ queryKey: ["planilha-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
    } catch (err) {
      toast({ title: "Erro ao adicionar", description: (err as Error).message, variant: "destructive" });
    }
  }, [currentUserId, queryClient, toast, dataMap]);

  const getCellValue = (r: MetricRow | undefined, col: ColDef): number => {
    if (!r) return 0;
    if (col.key === "ads") return getAds(r);
    return Number((r as any)[col.key] || 0);
  };

  const goToPrevMonth = () => {
    if (activeMonth === 0) { setMonth(11); setYear((activeYear) - 1); }
    else setMonth(activeMonth - 1);
  };
  const goToNextMonth = () => {
    if (activeMonth === 11) { setMonth(0); setYear((activeYear) + 1); }
    else setMonth(activeMonth + 1);
  };

  const handleSync = () => {
    syncSheets.mutate(undefined, {
      onSuccess: (data) => toast({ title: "Sincronizado!", description: `${data.imported} dias importados.` }),
      onError: (err) => toast({ title: "Erro", description: (err as Error).message, variant: "destructive" }),
    });
  };

  const weekLabels = ["PRIMEIRA", "SEGUNDA", "TERCEIRA", "QUARTA", "QUINTA", "SEXTA"];

  const getRoasColor = (v: number) => v >= 3 ? "text-success font-semibold" : v >= 1 ? "text-accent font-semibold" : "text-muted-foreground";

  if (authLoading) {
    return (
      <PageTransition>
        <DashboardLayout title="Planilha" subtitle="Carregando sessão...">
          <div className="py-12 text-center text-muted-foreground text-sm">Carregando autenticação...</div>
        </DashboardLayout>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <DashboardLayout
        title="Planilha"
        subtitle={`${MONTH_NAMES[activeMonth]} ${activeYear}`}
        actions={
          <div className="flex items-center gap-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" title="Apagar mês inteiro">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar {MONTH_NAMES[activeMonth]} inteiro?</AlertDialogTitle>
                  <AlertDialogDescription>Todos os dados de {MONTH_NAMES[activeMonth]} {activeYear} serão removidos permanentemente. Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteMonth}>Apagar tudo</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={handleSync} disabled={syncSheets.isPending}>
              {syncSheets.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        }
      >
        {/* Year + Month selector */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(activeYear - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="font-display text-sm font-bold text-foreground min-w-[50px] text-center">{activeYear}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(activeYear + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <span className="text-muted-foreground/30">|</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="font-display text-sm font-semibold text-foreground min-w-[120px] text-center uppercase tracking-wider">
              {MONTH_NAMES[activeMonth]}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Weeks */}
        <div className="space-y-6">
          {weeks.map((week, wi) => {
            const weekRows = week.days.map((d) => dataMap[d.toISOString().split("T")[0]]).filter(Boolean) as MetricRow[];

            const hasData = weekRows.length > 0;

            const totals: Record<string, number> = {};
            COLUMNS.forEach((col) => {
              totals[col.key] = weekRows.reduce((s, r) => s + getCellValue(r, col), 0);
            });
            const totalCpl = totals.leads > 0 ? totals.ads / totals.leads : 0;
            const totalRoas = totals.ads > 0 ? (Number(totals.faturamento_marcado || 0) + Number(totals.faturamento_dia || 0)) / totals.ads : 0;
            const totalCac = totals.curso_feito > 0 ? totals.ads / totals.curso_feito : 0;

            return (
              <div key={wi} className="rounded-lg overflow-hidden" style={{ border: "1px solid hsl(260, 18%, 14%)" }}>
                <div className="px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-accent flex items-center justify-between" style={{ background: "hsl(260, 22%, 11%)" }}>
                  <span>{weekLabels[wi] || `SEMANA ${wi + 1}`} SEMANA — {MONTH_NAMES[activeMonth].toUpperCase()} — REALIZADO</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-accent" onClick={() => addWeek(week.days)} title="Adicionar dias da semana">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    {weekRows.length > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar semana inteira?</AlertDialogTitle>
                            <AlertDialogDescription>Todos os dados de {week.days.length} dias desta semana serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteWeek(week.days)}>Apagar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                {hasData && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30" style={{ background: "hsl(260, 22%, 9%)" }}>
                        <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold w-[100px]">Dia</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold w-[60px]">Data</TableHead>
                        {COLUMNS.map((col) => (
                          <TableHead key={col.key} className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold text-right">{col.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {week.days.map((day) => {
                        const key = day.toISOString().split("T")[0];
                        const r = dataMap[key];
                        const dayName = DAY_NAMES[day.getDay()];
                        const dateLabel = `${String(day.getDate()).padStart(2, "0")}/${String(day.getMonth() + 1).padStart(2, "0")}`;

                        return (
                          <TableRow key={key} className="border-border/20" style={{ background: "hsl(260, 22%, 7%)" }}>
                            <TableCell className="text-xs font-medium text-foreground py-1.5">{dayName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground py-1.5">{dateLabel}</TableCell>
                            {COLUMNS.map((col) => {
                              const val = getCellValue(r, col);
                              const extraColor = col.key === "roas" ? getRoasColor(val) : (col.colorClass || "");
                              return (
                                <TableCell key={col.key} className="py-1.5">
                                  <EditableCell
                                    value={val}
                                    format={col.format}
                                    decimals={col.decimals}
                                    colorClass={extraColor}
                                    onSave={(v) => saveCell(key, col.key, v)}
                                  />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}

                      {/* TOTAL row */}
                      <TableRow className="border-t border-border/40" style={{ background: "hsl(260, 22%, 11%)" }}>
                        <TableCell className="text-xs font-bold text-accent py-2">TOTAL</TableCell>
                        <TableCell className="py-2"></TableCell>
                        <TableCell className="text-xs text-right tabular-nums py-2 font-bold">{formatBRL(totals.ads)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums py-2 font-bold">{formatNum(totals.leads)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums py-2 font-bold">{formatBRL(totalCpl)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums py-2 font-bold text-accent">{formatNum(totals.lead_mql)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums py-2 font-bold">{totals.lead_mql > 0 ? formatBRL(totals.ads / totals.lead_mql) : ""}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums py-2 font-bold">{formatNum(totals.curso_marcado)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums py-2 font-bold">{formatNum(totals.curso_feito)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums py-2 font-bold text-foreground">{formatBRL(totals.faturamento_marcado)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums py-2 font-bold text-foreground">{formatBRL(totals.faturamento_dia)}</TableCell>
                        <TableCell className={`text-xs text-right tabular-nums py-2 font-bold ${getRoasColor(totalRoas)}`}>{totalRoas ? totalRoas.toFixed(2) : ""}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums py-2 font-bold">{formatNum(totalCac, 2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                )}
              </div>
            );
          })}

          {/* Monthly grand total */}
          {allData && allData.length > 0 && (() => {
            const uniqueRows = Object.values(dataMap);
            const t: Record<string, number> = {};
            COLUMNS.forEach((col) => {
              t[col.key] = uniqueRows.reduce((s, r) => s + getCellValue(r, col), 0);
            });
            const cpl = t.leads > 0 ? t.ads / t.leads : 0;
            const roas = t.ads > 0 ? (Number(t.faturamento_marcado || 0) + Number(t.faturamento_dia || 0)) / t.ads : 0;
            const cac = t.curso_feito > 0 ? t.ads / t.curso_feito : 0;

            return (
              <div className="rounded-lg overflow-hidden" style={{ border: "2px solid hsl(var(--accent) / 0.3)" }}>
                <div className="overflow-x-auto">
                  <Table>
                    <TableBody>
                      <TableRow style={{ background: "hsl(260, 22%, 13%)" }}>
                        <TableCell className="text-sm font-bold text-accent py-3 w-[100px]">TOTAL MÊS</TableCell>
                        <TableCell className="py-3 w-[60px]"></TableCell>
                        <TableCell className="text-sm text-right tabular-nums py-3 font-bold">{formatBRL(t.ads)}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums py-3 font-bold">{formatNum(t.leads)}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums py-3 font-bold">{formatBRL(cpl)}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums py-3 font-bold text-accent">{formatNum(t.lead_mql)}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums py-3 font-bold">{t.lead_mql > 0 ? formatBRL(t.ads / t.lead_mql) : ""}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums py-3 font-bold">{formatNum(t.curso_marcado)}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums py-3 font-bold">{formatNum(t.curso_feito)}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums py-3 font-bold text-foreground">{formatBRL(t.faturamento_marcado)}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums py-3 font-bold text-foreground">{formatBRL(t.faturamento_dia)}</TableCell>
                        <TableCell className={`text-sm text-right tabular-nums py-3 font-bold ${getRoasColor(roas)}`}>{roas ? roas.toFixed(2) : ""}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums py-3 font-bold">{formatNum(cac, 2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}

          {(!allData || allData.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Nenhum dado para {MONTH_NAMES[activeMonth]} {activeYear}</p>
              <p className="text-xs mt-1 mb-4">Crie a planilha para começar a inserir dados</p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  if (!currentUserId) return;
                  try {
                    const total = new Date(activeYear, activeMonth + 1, 0).getDate();
                    const rows = [];
                    for (let d = 1; d <= total; d++) {
                      const date = new Date(activeYear, activeMonth, d);
                      rows.push({
                        user_id: currentUserId,
                        date: date.toISOString().split("T")[0],
                        ads: 0,
                      });
                    }
                    const { error } = await supabase
                      .from("daily_metrics")
                      .upsert(rows, { onConflict: "user_id,date" });
                    if (error) throw error;
                    toast({ title: `Planilha de ${MONTH_NAMES[activeMonth]} criada`, description: `${total} dias adicionados.` });
                    queryClient.invalidateQueries({ queryKey: ["planilha-metrics"] });
                    queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
                  } catch (err) {
                    toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
                  }
                }}
              >
                <Plus className="h-4 w-4" />
                Criar planilha para {MONTH_NAMES[activeMonth]} {activeYear}
              </Button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </PageTransition>
  );
};

export default PlanilhaPage;
