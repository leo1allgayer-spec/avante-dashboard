import React, { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import DateFilterBar from "@/components/DateFilterBar";
import MetricCard from "@/components/MetricCard";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import type { FilterMode } from "@/hooks/useDateFilter";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Instagram, Users, Target, DollarSign, TrendingUp, CalendarPlus } from "lucide-react";
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
  0: "DOM", 1: "SEG", 2: "TER", 3: "QUA",
  4: "QUI", 5: "SEX", 6: "SÁB",
};

const formatNum = (v: number | null | undefined, decimals = 0) => {
  if (v === null || v === undefined || v === 0) return "";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatBRL = (v: number) => {
  if (!v) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(v);
};

const formatPct = (v: number) => {
  if (!v) return "";
  return `${(v * 100).toFixed(1)}%`;
};

const parseInputNum = (s: string): number => {
  if (!s.trim()) return 0;
  const clean = s.replace(/R\$\s*/g, "").replace(/%/g, "").replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

type ColKey = "seguidores_novos" | "custo_por_seguidor" | "seguidores_mql" | "taxa_seguidores_mql" | "abordagens_feitas" | "taxa_resposta_abordagem" | "fechamentos_social_seller" | "cac_social_seller";

interface ColDef {
  key: ColKey;
  label: string;
  shortLabel: string;
  format: "brl" | "int" | "pct" | "dec";
  decimals?: number;
  colorClass?: string;
  emoji?: string;
}

const COLUMNS: ColDef[] = [
  { key: "seguidores_novos", label: "Seguidores Novos", shortLabel: "Seg. Novos", format: "int", emoji: "👥" },
  { key: "custo_por_seguidor", label: "Custo/Seguidor", shortLabel: "Custo/Seg", format: "brl", emoji: "💰" },
  { key: "seguidores_mql", label: "Seguidores MQL", shortLabel: "Seg. MQL", format: "int", colorClass: "text-accent", emoji: "🎯" },
  { key: "taxa_seguidores_mql", label: "Taxa Seg. MQL", shortLabel: "Taxa MQL", format: "pct", emoji: "📊" },
  { key: "abordagens_feitas", label: "Abordagens Feitas", shortLabel: "Abordagens", format: "int", emoji: "💬" },
  { key: "taxa_resposta_abordagem", label: "Taxa Resposta", shortLabel: "Taxa Resp.", format: "pct", emoji: "📈" },
  { key: "fechamentos_social_seller", label: "Fechamentos SS", shortLabel: "Fech. SS", format: "int", colorClass: "font-semibold text-foreground", emoji: "🤝" },
  { key: "cac_social_seller", label: "CAC Social Seller", shortLabel: "CAC SS", format: "brl", emoji: "🏷️" },
];

interface InstaRow {
  id?: string;
  user_id?: string;
  date: string;
  seguidores_novos: number;
  custo_por_seguidor: number;
  seguidores_mql: number;
  taxa_seguidores_mql: number;
  abordagens_feitas: number;
  taxa_resposta_abordagem: number;
  fechamentos_social_seller: number;
  cac_social_seller: number;
}

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

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Editable cell
const EditableCell = ({
  value, format, decimals = 0, colorClass = "", onSave,
}: {
  value: number; format: "brl" | "int" | "pct" | "dec"; decimals?: number; colorClass?: string; onSave: (v: number) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const display = format === "brl" ? formatBRL(value) : format === "pct" ? formatPct(value) : formatNum(value, decimals);

  const startEdit = () => {
    setEditing(true);
    setText(format === "pct" ? (value ? String(value * 100).replace(".", ",") : "") : (value ? String(value).replace(".", ",") : ""));
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const commit = () => {
    setEditing(false);
    let parsed = parseInputNum(text);
    if (format === "pct") parsed = parsed / 100;
    if (parsed !== (value || 0)) onSave(parsed);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        autoFocus
        className="w-full bg-background border border-primary/30 rounded-md px-2 py-1 text-xs text-right text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 tabular-nums"
        style={{ minWidth: 70 }}
      />
    );
  }

  return (
    <div
      onClick={startEdit}
      className={`cursor-pointer hover:bg-primary/5 rounded-md px-2 py-1 text-xs text-right tabular-nums transition-all duration-150 ${colorClass}`}
      title="Clique para editar"
    >
      {display || <span className="text-muted-foreground/30">—</span>}
    </div>
  );
};

const PlanilhaInstaPage = () => {
  const [mode, setMode] = useState<FilterMode>("mes");
  const [anchor, setAnchor] = useState(new Date());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteWeekTarget, setDeleteWeekTarget] = useState<Date[] | null>(null);
  const { toast } = useToast();
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = session?.user?.id ?? null;

  const range = useMemo(() => {
    if (mode === "dia") return { start: fmtDate(anchor), end: fmtDate(anchor) };
    if (mode === "semana") {
      const { start, end } = getWeekRange(anchor);
      return { start: fmtDate(start), end: fmtDate(end) };
    }
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    return { start: fmtDate(new Date(y, m, 1)), end: fmtDate(new Date(y, m + 1, 0)) };
  }, [mode, anchor]);

  const label = useMemo(() => {
    if (mode === "dia") return anchor.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
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

  const { data: allData, isLoading } = useQuery({
    queryKey: ["instagram-metrics", range.start, range.end],
    enabled: !!currentUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instagram_metrics")
        .select("*")
        .gte("date", range.start)
        .lte("date", range.end)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data as unknown as InstaRow[]) || [];
    },
  });

  const dataMap = useMemo(() => {
    const map: Record<string, InstaRow> = {};
    (allData || []).forEach((row) => { map[row.date] = row; });
    return map;
  }, [allData]);

  const days = useMemo(() => {
    const result: Date[] = [];
    const start = new Date(range.start + "T12:00:00");
    const end = new Date(range.end + "T12:00:00");
    const d = new Date(start);
    while (d <= end) { result.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return result;
  }, [range]);

  const weeks = useMemo(() => {
    if (mode !== "mes") return null;
    const result: { weekNum: number; days: Date[] }[] = [];
    let currentWeek: Date[] = [];
    let currentWeekNum = 1;
    days.forEach((day, i) => {
      currentWeek.push(day);
      if (day.getDay() === 0 || i === days.length - 1) {
        result.push({ weekNum: currentWeekNum, days: [...currentWeek] });
        currentWeek = [];
        currentWeekNum++;
      }
    });
    return result;
  }, [days, mode]);

  const saveCell = useCallback(async (date: string, field: ColKey, value: number) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from("instagram_metrics")
        .upsert({ user_id: currentUserId, date, [field]: value } as any, { onConflict: "user_id,date" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["instagram-metrics"] });
    } catch (err) {
      toast({ title: "Erro ao salvar", description: (err as Error).message, variant: "destructive" });
    }
  }, [currentUserId, queryClient, toast]);

  const addDays = useCallback(async (daysToAdd: Date[]) => {
    if (!currentUserId) return;
    try {
      const rows = daysToAdd.filter(d => !dataMap[fmtDate(d)]).map(d => ({ user_id: currentUserId, date: fmtDate(d) }));
      if (!rows.length) { toast({ title: "Todos os dias já existem" }); return; }
      const { error } = await supabase.from("instagram_metrics").upsert(rows as any[], { onConflict: "user_id,date" });
      if (error) throw error;
      toast({ title: `${rows.length} dias adicionados` });
      queryClient.invalidateQueries({ queryKey: ["instagram-metrics"] });
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
    }
  }, [currentUserId, queryClient, toast, dataMap]);

  const createMonth = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const totalDays = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
      const rows = [];
      for (let d = 1; d <= totalDays; d++) {
        const date = fmtDate(new Date(anchor.getFullYear(), anchor.getMonth(), d));
        if (!dataMap[date]) rows.push({ user_id: currentUserId, date });
      }
      if (!rows.length) { toast({ title: "Mês já está completo" }); return; }
      const { error } = await supabase.from("instagram_metrics").upsert(rows as any[], { onConflict: "user_id,date" });
      if (error) throw error;
      toast({ title: `${rows.length} dias criados para ${MONTH_NAMES[anchor.getMonth()]}` });
      queryClient.invalidateQueries({ queryKey: ["instagram-metrics"] });
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
    }
  }, [currentUserId, queryClient, toast, anchor, dataMap]);

  const deleteDays = useCallback(async (daysToDelete: Date[]) => {
    if (!currentUserId) return;
    try {
      const dates = daysToDelete.map(d => fmtDate(d));
      const { error } = await supabase.from("instagram_metrics").delete().eq("user_id", currentUserId).in("date", dates);
      if (error) throw error;
      toast({ title: "Dados apagados" });
      queryClient.invalidateQueries({ queryKey: ["instagram-metrics"] });
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
    }
  }, [currentUserId, queryClient, toast]);

  const getCellValue = (r: InstaRow | undefined, col: ColDef): number => {
    if (!r) return 0;
    return Number((r as any)[col.key] || 0);
  };

  const weekLabels = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª"];

  // KPI totals
  const uniqueRows = Object.values(dataMap);
  const totals: Record<string, number> = {};
  const AVG_KEYS: ColKey[] = ["custo_por_seguidor"];
  COLUMNS.forEach((col) => {
    if (col.format === "pct" || AVG_KEYS.includes(col.key)) {
      const vals = uniqueRows.map(r => getCellValue(r, col)).filter(v => v > 0);
      totals[col.key] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    } else {
      totals[col.key] = uniqueRows.reduce((s, r) => s + getCellValue(r, col), 0);
    }
  });

  if (authLoading) {
    return (
      <PageTransition>
        <DashboardLayout title="Métricas Instagram" subtitle="Carregando...">
          <div className="py-12 text-center text-muted-foreground text-sm">Carregando...</div>
        </DashboardLayout>
      </PageTransition>
    );
  }

  const renderRow = (day: Date) => {
    const dateStr = fmtDate(day);
    const row = dataMap[dateStr];
    const hasData = !!row;
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    return (
      <TableRow key={dateStr} className={`transition-colors ${!hasData ? "opacity-40" : "hover:bg-primary/5"} ${isWeekend && hasData ? "bg-muted/30" : ""}`}>
        <TableCell className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap py-2 px-3 sticky left-0 bg-card z-10 border-r border-border/20">
          <span className={isWeekend ? "text-primary/60" : ""}>{DAY_NAMES[day.getDay()]}</span>
        </TableCell>
        <TableCell className="text-[11px] text-center py-2 px-3 font-mono border-r border-border/20">
          {day.getDate().toString().padStart(2, "0")}/{(day.getMonth() + 1).toString().padStart(2, "0")}
        </TableCell>
        {COLUMNS.map((col) => (
          <TableCell key={col.key} className="py-1 px-1">
            <EditableCell
              value={getCellValue(row, col)}
              format={col.format}
              decimals={col.decimals}
              colorClass={col.colorClass}
              onSave={(v) => saveCell(dateStr, col.key, v)}
            />
          </TableCell>
        ))}
      </TableRow>
    );
  };

  return (
    <PageTransition>
      <DashboardLayout
        title="📸 Métricas Instagram"
        subtitle="Planilha de acompanhamento diário — Social Seller"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={createMonth}>
              <CalendarPlus className="h-3.5 w-3.5" /> Criar Mês
            </Button>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar dados do período?</AlertDialogTitle>
                  <AlertDialogDescription>Todos os dados de {label} serão removidos permanentemente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { deleteDays(days); setDeleteDialogOpen(false); }}>Apagar tudo</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      >
        <DateFilterBar mode={mode} onModeChange={setMode} label={label} onBack={goBack} onForward={goForward} />

        {/* KPI Cards */}
        <StaggerContainer className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 mb-1">
          <StaggerItem>
            <MetricCard title="Seg. Novos" value={String(totals.seguidores_novos || 0)} icon={<Users className="h-4 w-4" />} variant="primary" countUp />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Custo/Seg" value={formatBRL(totals.custo_por_seguidor || 0)} icon={<DollarSign className="h-4 w-4" />} variant="warning" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Seg. MQL" value={String(totals.seguidores_mql || 0)} icon={<Target className="h-4 w-4" />} variant="accent" countUp />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Taxa MQL" value={formatPct(totals.taxa_seguidores_mql || 0)} icon={<TrendingUp className="h-4 w-4" />} />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Abordagens" value={String(totals.abordagens_feitas || 0)} icon={<Instagram className="h-4 w-4" />} variant="primary" countUp />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Taxa Resp." value={formatPct(totals.taxa_resposta_abordagem || 0)} icon={<TrendingUp className="h-4 w-4" />} variant="accent" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Fechamentos" value={String(totals.fechamentos_social_seller || 0)} icon={<Target className="h-4 w-4" />} variant="success" countUp />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="CAC SS" value={formatBRL(totals.cac_social_seller || 0)} icon={<DollarSign className="h-4 w-4" />} variant="warning" />
          </StaggerItem>
        </StaggerContainer>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border/40 bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 border-b-2 border-border/60">
                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold py-3 px-3 sticky left-0 bg-muted/40 z-10 border-r border-border/20">Dia</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold py-3 px-3 text-center border-r border-border/20">Data</TableHead>
                {COLUMNS.map((col) => (
                  <TableHead key={col.key} className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold py-3 px-1.5 text-right whitespace-nowrap">
                    <span className="mr-1">{col.emoji}</span>{col.shortLabel}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 2} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Carregando dados...
                    </div>
                  </TableCell>
                </TableRow>
              ) : mode === "mes" && weeks ? (
                weeks.map((week) => {
                  const weekHasData = week.days.some(d => !!dataMap[fmtDate(d)]);
                  return (
                    <React.Fragment key={week.weekNum}>
                      <TableRow className="bg-primary/5 border-y border-primary/10">
                        <TableCell colSpan={COLUMNS.length + 2} className="py-1.5 px-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                              {weekLabels[week.weekNum - 1] || `${week.weekNum}ª`} Semana
                            </span>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-primary/40 hover:text-primary hover:bg-primary/10 rounded-full" onClick={() => addDays(week.days)} title="Adicionar dias faltantes">
                                <Plus className="h-3 w-3" />
                              </Button>
                              {weekHasData && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-full"
                                  title="Apagar semana"
                                  onClick={() => { setDeleteWeekTarget(week.days); }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                      {weekHasData && week.days.map(renderRow)}
                    </React.Fragment>
                  );
                })
              ) : (
                <>
                  {mode !== "mes" && (
                    <TableRow className="bg-primary/5">
                      <TableCell colSpan={COLUMNS.length + 2} className="py-1.5 px-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-primary/70">Período</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary/40 hover:text-primary hover:bg-primary/10 rounded-full" onClick={() => addDays(days)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {days.map(renderRow)}
                </>
              )}

              {/* Totals */}
              {uniqueRows.length > 0 && (
                <TableRow className="bg-primary/10 border-t-2 border-primary/20 font-bold">
                  <TableCell className="text-[11px] py-2.5 px-3 sticky left-0 bg-primary/10 z-10 border-r border-border/20 uppercase tracking-wider">Total</TableCell>
                  <TableCell className="py-2.5 px-3 border-r border-border/20" />
                  {COLUMNS.map((col) => (
                    <TableCell key={col.key} className="text-xs text-right py-2.5 px-1.5 tabular-nums">
                      {col.format === "brl" ? formatBRL(totals[col.key]) : col.format === "pct" ? formatPct(totals[col.key]) : formatNum(totals[col.key], col.decimals)}
                    </TableCell>
                  ))}
                </TableRow>
              )}

              {/* Empty state */}
              {!isLoading && uniqueRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 2} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Instagram className="h-10 w-10 text-muted-foreground/20" />
                      <p className="text-muted-foreground text-sm">Nenhum dado neste período</p>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={createMonth}>
                        <CalendarPlus className="h-3.5 w-3.5" /> Criar planilha do mês
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Delete week dialog (controlled) */}
        <AlertDialog open={!!deleteWeekTarget} onOpenChange={(open) => { if (!open) setDeleteWeekTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar dados desta semana?</AlertDialogTitle>
              <AlertDialogDescription>Todos os dados desta semana serão removidos permanentemente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteWeekTarget) deleteDays(deleteWeekTarget); setDeleteWeekTarget(null); }}>Apagar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </PageTransition>
  );
};

export default PlanilhaInstaPage;
