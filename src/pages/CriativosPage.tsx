import { useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import MetricCard from "@/components/MetricCard";
import DateFilterBar from "@/components/DateFilterBar";
import { useLocalDateFilter } from "@/hooks/useLocalDateFilter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  useCriativosVendas,
  useCriativosResumo,
  useCreateCriativoVenda,
  useDeleteCriativoVenda,
  useUpdateCriativoVenda,
  useUpsertCriativoResumo,
  useUpdateCriativoResumo,
  useDeleteCriativoResumo,
} from "@/hooks/useCriativos";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, TrendingUp, DollarSign, Users, Target, Palette, Filter, BookOpen, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const now = new Date();

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDisplayDate = (value: string) =>
  parseLocalDate(value).toLocaleDateString("pt-BR");

const CHART_COLORS = [
  "hsl(174, 75%, 48%)", "hsl(270, 70%, 55%)", "hsl(38, 92%, 50%)",
  "hsl(142, 70%, 45%)", "hsl(340, 75%, 55%)", "hsl(200, 80%, 50%)",
  "hsl(20, 85%, 55%)", "hsl(280, 60%, 65%)", "hsl(160, 60%, 40%)",
  "hsl(50, 90%, 50%)",
];

/* ---- Inline editable cell ---- */
const EditableCell = ({ value, onSave, type = "text", className = "" }: {
  value: string | number; onSave: (v: string) => void; type?: string; className?: string;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const commit = () => { setEditing(false); if (draft !== String(value)) onSave(draft); };
  if (!editing) return (
    <span className={`cursor-pointer hover:bg-secondary/30 px-1 py-0.5 rounded transition-colors ${className}`} onClick={() => { setDraft(String(value)); setEditing(true); }}>
      {type === "number" ? (Number(value) === 0 ? "0" : value) : value || "—"}
    </span>
  );
  return (
    <Input
      autoFocus type={type} value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      className="h-7 w-full min-w-[60px] text-xs bg-secondary/40 border-border/40"
    />
  );
};

const CriativosPage = () => {
  const filter = useLocalDateFilter();
  const [filtroCriativo, setFiltroCriativo] = useState<string>("todos");
  const [filtroAdsMin, setFiltroAdsMin] = useState<string>("");
  const [filtroAdsMax, setFiltroAdsMax] = useState<string>("");
  const [filtroRoasMin, setFiltroRoasMin] = useState<string>("");
  const [filtroRoasMax, setFiltroRoasMax] = useState<string>("");
  const { data: allVendas = [], isLoading: loadingVendas } = useCriativosVendas();
  const mesAnoFromFilter = useMemo(() => {
    const d = parseLocalDate(filter.range.start);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [filter.range.start]);
  const { data: resumos = [], isLoading: loadingResumos } = useCriativosResumo(mesAnoFromFilter);
  const createVenda = useCreateCriativoVenda();
  const deleteVenda = useDeleteCriativoVenda();
  const updateVenda = useUpdateCriativoVenda();
  const upsertResumo = useUpsertCriativoResumo();
  const deleteResumo = useDeleteCriativoResumo();
  const updateResumo = useUpdateCriativoResumo();
  const { session } = useAuth();
  const { toast } = useToast();

  const [vendaDialogOpen, setVendaDialogOpen] = useState(false);
  const [resumoDialogOpen, setResumoDialogOpen] = useState(false);

  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [vendaForm, setVendaForm] = useState({
    nome_aluno: "", data: formatLocalDate(new Date()),
    criativo: "", codigo: "", valor_curso: 0, valor_ads: 0, roas: 0, sinal: 0, status: "pendente", quantidade_cursos: 1,
  });

  const [resumoForm, setResumoForm] = useState({
    criativo: "", codigo: "", status: "ativo", leads_recebidos: 0, custo_por_lead: 0,
    quantidade_fechamentos: 0, valor_fechado: 0, valor_gasto: 0,
    roas: 0, cac: 0, taxa_conversao: 0, quantidade_cursos: 0,
  });

  const vendas = useMemo(() => filter.filterByDate(allVendas), [allVendas, filter]);

  const criativosUnicos = useMemo(() => {
    const set = new Set<string>();
    vendas.forEach((v) => set.add(v.criativo));
    resumos.forEach((r) => set.add(r.criativo));
    return Array.from(set).sort();
  }, [vendas, resumos]);

  const vendasFiltradas = useMemo(() => {
    let items = filtroCriativo === "todos" ? vendas : vendas.filter((v) => v.criativo === filtroCriativo);
    if (filtroAdsMin) items = items.filter((v) => Number(v.valor_ads) >= Number(filtroAdsMin));
    if (filtroAdsMax) items = items.filter((v) => Number(v.valor_ads) <= Number(filtroAdsMax));
    if (filtroRoasMin) items = items.filter((v) => Number(v.roas) >= Number(filtroRoasMin));
    if (filtroRoasMax) items = items.filter((v) => Number(v.roas) <= Number(filtroRoasMax));
    return items;
  }, [vendas, filtroCriativo, filtroAdsMin, filtroAdsMax, filtroRoasMin, filtroRoasMax]);

  const resumosFiltrados = useMemo(() => {
    let items = filtroCriativo === "todos" ? resumos : resumos.filter((r) => r.criativo === filtroCriativo);
    if (filtroAdsMin) items = items.filter((r) => Number(r.valor_gasto) >= Number(filtroAdsMin));
    if (filtroAdsMax) items = items.filter((r) => Number(r.valor_gasto) <= Number(filtroAdsMax));
    if (filtroRoasMin) items = items.filter((r) => Number(r.roas) >= Number(filtroRoasMin));
    if (filtroRoasMax) items = items.filter((r) => Number(r.roas) <= Number(filtroRoasMax));
    return items;
  }, [resumos, filtroCriativo, filtroAdsMin, filtroAdsMax, filtroRoasMin, filtroRoasMax]);

  // KPIs
  const totalVendas = vendasFiltradas.length;
  const totalValorCursoVendas = vendasFiltradas.reduce((s, v) => s + Number(v.valor_curso), 0);
  const totalValorAdsVendas = vendasFiltradas.reduce((s, v) => s + Number(v.valor_ads), 0);
  const totalSinal = vendasFiltradas.reduce((s, v) => s + Number(v.sinal || 0), 0);
  const totalRestante = totalValorCursoVendas - totalSinal;
  const roasVendas = totalValorAdsVendas > 0 ? totalValorCursoVendas / totalValorAdsVendas : 0;
  const alunosUnicosVendas = new Set(vendasFiltradas.map((v) => v.nome_aluno.trim().toLowerCase())).size;
  const criativosUnicosCount = new Set(vendasFiltradas.map((v) => v.criativo)).size;

  const totalFechamentos = resumosFiltrados.reduce((s, r) => s + Number(r.quantidade_fechamentos), 0) || totalVendas;
  const totalValorFechado = resumosFiltrados.reduce((s, r) => s + Number(r.valor_fechado), 0) || totalValorCursoVendas;
  const totalValorGasto = resumosFiltrados.reduce((s, r) => s + Number(r.valor_gasto), 0) || totalValorAdsVendas;
  const avgRoasResumo = resumosFiltrados.length > 0
    ? resumosFiltrados.filter(r => Number(r.roas) > 0).reduce((s, r) => s + Number(r.roas), 0) / (resumosFiltrados.filter(r => Number(r.roas) > 0).length || 1)
    : 0;
  const avgRoas = avgRoasResumo > 0 ? avgRoasResumo : roasVendas;
  const totalCursosComprados = resumosFiltrados.reduce((s, r) => s + Number(r.quantidade_cursos || 0), 0) || totalVendas;
  const cacMedio = totalFechamentos > 0 ? totalValorGasto / totalFechamentos : 0;

  const criativoAggregated = useMemo(() => {
    const map = new Map<string, { vendas: number; custoTotal: number; valorTotal: number }>();
    vendasFiltradas.forEach((v) => {
      const existing = map.get(v.criativo) || { vendas: 0, custoTotal: 0, valorTotal: 0 };
      existing.vendas += 1;
      existing.custoTotal += Number(v.valor_ads);
      existing.valorTotal += Number(v.valor_curso);
      map.set(v.criativo, existing);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].valorTotal - a[1].valorTotal)
      .map(([name, d]) => ({
        name,
        shortName: name.length > 20 ? name.substring(0, 20) + "…" : name,
        vendas: d.vendas,
        custo: d.custoTotal,
        valor: d.valorTotal,
        roas: d.custoTotal > 0 ? d.valorTotal / d.custoTotal : 0,
        cac: d.vendas > 0 ? d.custoTotal / d.vendas : 0,
      }));
  }, [vendasFiltradas]);

  const chartData = useMemo(() => criativoAggregated.slice(0, 10).map(d => ({ ...d, name: d.shortName })), [criativoAggregated]);

  const top5Criativos = useMemo(() => {
    if (resumosFiltrados.length > 0) {
      return resumosFiltrados
        .map((r) => ({
          name: r.criativo,
          shortName: r.criativo.length > 20 ? r.criativo.substring(0, 20) + "…" : r.criativo,
          vendas: Number(r.quantidade_fechamentos),
          custo: Number(r.valor_gasto),
          valor: Number(r.valor_fechado),
          roas: Number(r.roas),
          cac: Number(r.cac),
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);
    }
    return criativoAggregated.slice(0, 5);
  }, [resumosFiltrados, criativoAggregated]);

  /* ---- Inline update handler ---- */
  const handleInlineUpdate = useCallback((id: string, field: string, value: string) => {
    const numericFields = ["valor_curso", "valor_ads", "roas", "sinal", "quantidade_cursos"];
    const payload: any = { id, [field]: numericFields.includes(field) ? Number(value) : value };
    updateVenda.mutate(payload, {
      onError: (err: any) => toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" }),
    });
  }, [updateVenda, toast]);

  const toggleStatus = useCallback((id: string, currentStatus: string) => {
    const newStatus = currentStatus === "pago" ? "pendente" : "pago";
    updateVenda.mutate({ id, status: newStatus } as any);
  }, [updateVenda]);

  const handleInlineResumoUpdate = useCallback((id: string, field: string, value: string) => {
    const numericFields = ["leads_recebidos", "custo_por_lead", "quantidade_fechamentos", "valor_fechado", "valor_gasto", "roas", "cac", "taxa_conversao", "quantidade_cursos"];
    const payload: any = { id, [field]: numericFields.includes(field) ? Number(value) : value };
    updateResumo.mutate(payload, {
      onError: (err: any) => toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" }),
    });
  }, [updateResumo, toast]);

  const toggleResumoStatus = useCallback((id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ativo" ? "desativo" : "ativo";
    updateResumo.mutate({ id, status: newStatus } as any);
  }, [updateResumo]);

  const handleSubmitVenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    createVenda.mutate(
      { ...vendaForm, user_id: session.user.id },
      {
        onSuccess: () => {
          toast({ title: "Criativo registrado!" });
          setVendaDialogOpen(false);
          setVendaForm({ nome_aluno: "", data: formatLocalDate(new Date()), criativo: "", codigo: "", valor_curso: 0, valor_ads: 0, roas: 0, sinal: 0, status: "pendente", quantidade_cursos: 1 });
        },
        onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleSubmitResumo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    upsertResumo.mutate(
      { ...resumoForm, user_id: session.user.id, mes_ano: mesAnoFromFilter },
      {
        onSuccess: () => {
          toast({ title: "Resumo salvo!" });
          setResumoDialogOpen(false);
          setResumoForm({ criativo: "", codigo: "", status: "ativo", leads_recebidos: 0, custo_por_lead: 0, quantidade_fechamentos: 0, valor_fechado: 0, valor_gasto: 0, roas: 0, cac: 0, taxa_conversao: 0, quantidade_cursos: 0 });
        },
        onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
      }
    );
  };

  const MonthSelector = (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filtroCriativo} onValueChange={setFiltroCriativo}>
        <SelectTrigger className="w-[180px] bg-secondary/30 border-border/30">
          <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Filtrar criativo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os Criativos</SelectItem>
          {criativosUnicos.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1">
        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
        <Input type="number" placeholder="ADS mín" value={filtroAdsMin} onChange={(e) => setFiltroAdsMin(e.target.value)} className="w-[90px] h-9 bg-secondary/30 border-border/30 text-xs" />
        <span className="text-muted-foreground text-xs">—</span>
        <Input type="number" placeholder="ADS máx" value={filtroAdsMax} onChange={(e) => setFiltroAdsMax(e.target.value)} className="w-[90px] h-9 bg-secondary/30 border-border/30 text-xs" />
      </div>
      <div className="flex items-center gap-1">
        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        <Input type="number" step="0.1" placeholder="ROAS mín" value={filtroRoasMin} onChange={(e) => setFiltroRoasMin(e.target.value)} className="w-[90px] h-9 bg-secondary/30 border-border/30 text-xs" />
        <span className="text-muted-foreground text-xs">—</span>
        <Input type="number" step="0.1" placeholder="ROAS máx" value={filtroRoasMax} onChange={(e) => setFiltroRoasMax(e.target.value)} className="w-[90px] h-9 bg-secondary/30 border-border/30 text-xs" />
      </div>
    </div>
  );

  return (
    <PageTransition>
      <DashboardLayout title="Criativos" subtitle="Rastreamento de criativos e vendas" actions={MonthSelector}>
        <DateFilterBar mode={filter.mode} onModeChange={filter.setMode} label={filter.label} onBack={filter.goBack} onForward={filter.goForward} />
        {/* KPIs */}
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <StaggerItem><MetricCard title="Total Vendas" value={String(totalVendas)} icon={<Target className="h-5 w-5" />} variant="accent" countUp /></StaggerItem>
          <StaggerItem><MetricCard title="Alunos Únicos" value={String(alunosUnicosVendas)} icon={<Users className="h-5 w-5" />} variant="primary" countUp /></StaggerItem>
          <StaggerItem><MetricCard title="Valor Vendido" value={formatBRL(totalValorFechado)} icon={<DollarSign className="h-5 w-5" />} variant="success" /></StaggerItem>
          <StaggerItem><MetricCard title="Valor ADS" value={formatBRL(totalValorGasto)} icon={<DollarSign className="h-5 w-5" />} variant="warning" /></StaggerItem>
          <StaggerItem><MetricCard title="ROAS Médio" value={`${avgRoas.toFixed(2)}x`} icon={<TrendingUp className="h-5 w-5" />} /></StaggerItem>
          <StaggerItem><MetricCard title="Total Sinal" value={formatBRL(totalSinal)} icon={<DollarSign className="h-5 w-5" />} variant="primary" /></StaggerItem>
          <StaggerItem><MetricCard title="Valor Restante" value={formatBRL(totalRestante)} icon={<DollarSign className="h-5 w-5" />} variant="warning" /></StaggerItem>
          <StaggerItem><MetricCard title="Cursos (Resumo)" value={String(totalCursosComprados)} icon={<BookOpen className="h-5 w-5" />} countUp /></StaggerItem>
        </StaggerContainer>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {chartData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-6">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">💰 Valor de Vendas por Criativo</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 15%, 18%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} tickFormatter={(v) => formatBRL(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} width={150} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(260, 22%, 8%)", border: "1px solid hsl(260, 18%, 20%)", borderRadius: "12px", color: "hsl(240, 10%, 93%)", fontSize: 12 }}
                    formatter={(v: number, name: string) => [formatBRL(v), name === "custo" ? "Custo ADS" : "Valor Vendido"]}
                  />
                  <Bar dataKey="valor" name="valor" fill="hsl(142, 70%, 45%)" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="custo" name="custo" fill="hsl(340, 75%, 55%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {top5Criativos.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-xl p-6">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">🏆 Top 5 Criativos que Mais Vendem</h3>
              <div className="space-y-3">
                {top5Criativos.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/20">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                      i === 0 ? "bg-amber-500/20 text-amber-400" :
                      i === 1 ? "bg-slate-400/20 text-slate-300" :
                      i === 2 ? "bg-orange-600/20 text-orange-400" :
                      "bg-secondary/40 text-muted-foreground"
                    }`}>
                      {i + 1}º
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.vendas} venda{c.vendas !== 1 ? "s" : ""} · {formatBRL(c.valor)}</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ROAS</p>
                        <p className={`text-sm font-bold ${c.roas >= 3 ? "text-success" : c.roas >= 1 ? "text-amber-400" : "text-destructive"}`}>{c.roas.toFixed(2)}x</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">CAC</p>
                        <p className="text-sm font-bold text-foreground">{formatBRL(c.cac)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="vendas" className="space-y-4">
          <TabsList className="bg-secondary/30">
            <TabsTrigger value="vendas">Relação por Aluno</TabsTrigger>
            <TabsTrigger value="resumo">Resumo por Criativo</TabsTrigger>
          </TabsList>

          {/* Tab 1: Vendas por aluno - EDITABLE */}
          <TabsContent value="vendas">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Relação Criativos — {filter.label}
                </h3>
                <Dialog open={vendaDialogOpen} onOpenChange={setVendaDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Adicionar</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Novo Registro de Criativo</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmitVenda} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Nome do Aluno</Label>
                          <Input value={vendaForm.nome_aluno} onChange={(e) => setVendaForm((p) => ({ ...p, nome_aluno: e.target.value }))} required className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Data</Label>
                          <Input type="date" value={vendaForm.data} onChange={(e) => setVendaForm((p) => ({ ...p, data: e.target.value }))} required className="bg-secondary/30 border-border/30" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Criativo (Emoji/Nome)</Label>
                          <Input value={vendaForm.criativo} onChange={(e) => setVendaForm((p) => ({ ...p, criativo: e.target.value }))} required placeholder="Ex: promoxima turma 🔥" className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Código</Label>
                          <Input value={vendaForm.codigo} onChange={(e) => setVendaForm((p) => ({ ...p, codigo: e.target.value }))} placeholder="Ex: CR001" className="bg-secondary/30 border-border/30" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Valor Curso</Label>
                          <Input type="number" step="0.01" value={vendaForm.valor_curso} onChange={(e) => setVendaForm((p) => ({ ...p, valor_curso: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Sinal (Entrada)</Label>
                          <Input type="number" step="0.01" value={vendaForm.sinal} onChange={(e) => setVendaForm((p) => ({ ...p, sinal: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Qtd Cursos</Label>
                          <Input type="number" min="1" value={vendaForm.quantidade_cursos} onChange={(e) => setVendaForm((p) => ({ ...p, quantidade_cursos: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Valor ADS</Label>
                          <Input type="number" step="0.01" value={vendaForm.valor_ads} onChange={(e) => setVendaForm((p) => ({ ...p, valor_ads: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">ROAS</Label>
                          <Input type="number" step="0.01" value={vendaForm.roas} onChange={(e) => setVendaForm((p) => ({ ...p, roas: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Status</Label>
                          <Select value={vendaForm.status} onValueChange={(v) => setVendaForm((p) => ({ ...p, status: v }))}>
                            <SelectTrigger className="bg-secondary/30 border-border/30"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">⏳ Pendente</SelectItem>
                              <SelectItem value="pago">✅ Pago</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={createVenda.isPending}>
                        {createVenda.isPending ? "Salvando..." : "Registrar"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <p className="text-[11px] text-muted-foreground/60">💡 Clique em qualquer célula para editar diretamente</p>

              <div className="rounded-lg border border-border/30 overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                      <TableHead className="text-xs font-semibold">Nome do Aluno</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Data</TableHead>
                      <TableHead className="text-xs font-semibold">Criativo</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Código</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Valor Curso</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Qtd Cursos</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Sinal</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Restante</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Valor ADS</TableHead>
                      <TableHead className="text-xs font-semibold text-right">ROAS</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                      <TableHead className="text-xs w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasFiltradas.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhum registro neste período</TableCell></TableRow>
                    ) : (
                      vendasFiltradas.map((v) => {
                        const restante = Number(v.valor_curso) - Number(v.sinal || 0);
                        const isPago = v.status === "pago";
                        return (
                          <TableRow key={v.id} className="hover:bg-secondary/10">
                            <TableCell className="text-sm">
                              <EditableCell value={v.nome_aluno} onSave={(val) => handleInlineUpdate(v.id, "nome_aluno", val)} className="font-medium" />
                            </TableCell>
                            <TableCell className="text-sm text-center">
                              <EditableCell value={v.data} type="date" onSave={(val) => handleInlineUpdate(v.id, "data", val)} />
                            </TableCell>
                            <TableCell className="text-sm">
                              <EditableCell value={v.criativo} onSave={(val) => handleInlineUpdate(v.id, "criativo", val)} />
                            </TableCell>
                            <TableCell className="text-sm text-center">
                              <EditableCell value={(v as any).codigo || ""} onSave={(val) => handleInlineUpdate(v.id, "codigo", val)} />
                            </TableCell>
                            <TableCell className="text-sm text-right">
                              <EditableCell value={Number(v.valor_curso)} type="number" onSave={(val) => handleInlineUpdate(v.id, "valor_curso", val)} className="font-semibold" />
                            </TableCell>
                            <TableCell className="text-sm text-center">
                              <EditableCell value={Number((v as any).quantidade_cursos || 1)} type="number" onSave={(val) => handleInlineUpdate(v.id, "quantidade_cursos", val)} className="font-semibold" />
                            </TableCell>
                            <TableCell className="text-sm text-right">
                              <EditableCell value={Number(v.sinal || 0)} type="number" onSave={(val) => handleInlineUpdate(v.id, "sinal", val)} className="text-primary font-semibold" />
                            </TableCell>
                            <TableCell className="text-sm text-right font-semibold text-muted-foreground">
                              {formatBRL(restante)}
                            </TableCell>
                            <TableCell className="text-sm text-right">
                              <EditableCell value={Number(v.valor_ads)} type="number" onSave={(val) => handleInlineUpdate(v.id, "valor_ads", val)} />
                            </TableCell>
                            <TableCell className="text-sm text-right">
                              <EditableCell value={Number(v.roas)} type="number" onSave={(val) => handleInlineUpdate(v.id, "roas", val)} className="font-semibold" />
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2 text-xs font-semibold gap-1 ${isPago ? "text-success hover:text-success/80" : "text-amber-400 hover:text-amber-300"}`}
                                onClick={() => toggleStatus(v.id, v.status || "pendente")}
                              >
                                {isPago ? <><Check className="h-3 w-3" /> Pago</> : <><X className="h-3 w-3" /> Pendente</>}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteVenda.mutate(v.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                    {/* Totals */}
                    {vendasFiltradas.length > 0 && (
                      <TableRow className="bg-primary/5 font-semibold hover:bg-primary/5">
                        <TableCell className="text-sm">TOTAL</TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-sm text-right">{formatBRL(totalValorCursoVendas)}</TableCell>
                        <TableCell className="text-sm text-center font-semibold">{vendasFiltradas.reduce((s, v) => s + Number((v as any).quantidade_cursos || 1), 0)}</TableCell>
                        <TableCell className="text-sm text-right text-primary">{formatBRL(totalSinal)}</TableCell>
                        <TableCell className="text-sm text-right">{formatBRL(totalRestante)}</TableCell>
                        <TableCell className="text-sm text-right">{formatBRL(totalValorAdsVendas)}</TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          </TabsContent>

          {/* Tab 2: Resumo por criativo */}
          <TabsContent value="resumo">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Resumo Criativos — {filter.label}
                </h3>
                <Dialog open={resumoDialogOpen} onOpenChange={setResumoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Adicionar Criativo</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Novo/Editar Criativo</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmitResumo} className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Criativo (Nome)</Label>
                          <Input value={resumoForm.criativo} onChange={(e) => setResumoForm((p) => ({ ...p, criativo: e.target.value }))} required placeholder="Ex: promoxima turma 🔥" className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Código</Label>
                          <Input value={resumoForm.codigo} onChange={(e) => setResumoForm((p) => ({ ...p, codigo: e.target.value }))} placeholder="Ex: CR001" className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Status</Label>
                          <Select value={resumoForm.status} onValueChange={(v) => setResumoForm((p) => ({ ...p, status: v }))}>
                            <SelectTrigger className="bg-secondary/30 border-border/30"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ativo">🟢 Ativo</SelectItem>
                              <SelectItem value="desativo">🔴 Desativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Leads Recebidos</Label>
                          <Input type="number" value={resumoForm.leads_recebidos} onChange={(e) => setResumoForm((p) => ({ ...p, leads_recebidos: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Custo/Lead</Label>
                          <Input type="number" step="0.01" value={resumoForm.custo_por_lead} onChange={(e) => setResumoForm((p) => ({ ...p, custo_por_lead: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Fechamentos</Label>
                          <Input type="number" value={resumoForm.quantidade_fechamentos} onChange={(e) => setResumoForm((p) => ({ ...p, quantidade_fechamentos: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Valor Fechado</Label>
                          <Input type="number" step="0.01" value={resumoForm.valor_fechado} onChange={(e) => setResumoForm((p) => ({ ...p, valor_fechado: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Valor Gasto</Label>
                          <Input type="number" step="0.01" value={resumoForm.valor_gasto} onChange={(e) => setResumoForm((p) => ({ ...p, valor_gasto: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">ROAS</Label>
                          <Input type="number" step="0.01" value={resumoForm.roas} onChange={(e) => setResumoForm((p) => ({ ...p, roas: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">CAC</Label>
                          <Input type="number" step="0.01" value={resumoForm.cac} onChange={(e) => setResumoForm((p) => ({ ...p, cac: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Taxa de Conversão (%)</Label>
                          <Input type="number" step="0.01" value={resumoForm.taxa_conversao} onChange={(e) => setResumoForm((p) => ({ ...p, taxa_conversao: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Qtd. Cursos</Label>
                          <Input type="number" value={resumoForm.quantidade_cursos} onChange={(e) => setResumoForm((p) => ({ ...p, quantidade_cursos: +e.target.value }))} className="bg-secondary/30 border-border/30" />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={upsertResumo.isPending}>
                        {upsertResumo.isPending ? "Salvando..." : "Salvar Criativo"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <p className="text-[11px] text-muted-foreground/60">💡 Clique em qualquer célula para editar diretamente</p>

              <div className="rounded-lg border border-border/30 overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                      <TableHead className="text-xs font-semibold">Criativo</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Código</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Cursos</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Leads</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Custo/Lead</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Fechamentos</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Valor Fechado</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Valor Gasto</TableHead>
                      <TableHead className="text-xs font-semibold text-right">ROAS</TableHead>
                      <TableHead className="text-xs font-semibold text-right">CAC</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Conversão</TableHead>
                      <TableHead className="text-xs w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumosFiltrados.length === 0 ? (
                      <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">Nenhum criativo neste mês</TableCell></TableRow>
                    ) : (
                      resumosFiltrados.map((r) => (
                        <TableRow key={r.id} className="hover:bg-secondary/10">
                          <TableCell className="text-sm max-w-[200px]">
                            <EditableCell value={r.criativo} onSave={(val) => handleInlineResumoUpdate(r.id, "criativo", val)} className="font-medium" />
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            <EditableCell value={(r as any).codigo || ""} onSave={(val) => handleInlineResumoUpdate(r.id, "codigo", val)} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 text-xs font-semibold gap-1 ${r.status === "ativo" ? "text-success hover:text-success/80" : "text-destructive hover:text-destructive/80"}`}
                              onClick={() => toggleResumoStatus(r.id, r.status)}
                            >
                              {r.status === "ativo" ? "🟢 Ativo" : "🔴 Desativo"}
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            <EditableCell value={Number(r.quantidade_cursos || 0)} type="number" onSave={(val) => handleInlineResumoUpdate(r.id, "quantidade_cursos", val)} className="font-semibold text-primary" />
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            <EditableCell value={r.leads_recebidos} type="number" onSave={(val) => handleInlineResumoUpdate(r.id, "leads_recebidos", val)} />
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            <EditableCell value={Number(r.custo_por_lead)} type="number" onSave={(val) => handleInlineResumoUpdate(r.id, "custo_por_lead", val)} />
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            <EditableCell value={r.quantidade_fechamentos} type="number" onSave={(val) => handleInlineResumoUpdate(r.id, "quantidade_fechamentos", val)} className="font-semibold" />
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            <EditableCell value={Number(r.valor_fechado)} type="number" onSave={(val) => handleInlineResumoUpdate(r.id, "valor_fechado", val)} className="font-semibold" />
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            <EditableCell value={Number(r.valor_gasto)} type="number" onSave={(val) => handleInlineResumoUpdate(r.id, "valor_gasto", val)} />
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            <EditableCell value={Number(r.roas)} type="number" onSave={(val) => handleInlineResumoUpdate(r.id, "roas", val)} className="font-semibold" />
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            <EditableCell value={Number(r.cac)} type="number" onSave={(val) => handleInlineResumoUpdate(r.id, "cac", val)} />
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            <EditableCell value={Number(r.taxa_conversao)} type="number" onSave={(val) => handleInlineResumoUpdate(r.id, "taxa_conversao", val)} />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteResumo.mutate(r.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {resumosFiltrados.length > 0 && (
                      <TableRow className="bg-primary/5 font-semibold hover:bg-primary/5">
                        <TableCell className="text-sm">TOTAL</TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-sm text-center font-semibold">{totalCursosComprados}</TableCell>
                        <TableCell className="text-sm text-center">{resumosFiltrados.reduce((s, r) => s + Number(r.leads_recebidos), 0)}</TableCell>
                        <TableCell />
                        <TableCell className="text-sm text-center">{totalFechamentos}</TableCell>
                        <TableCell className="text-sm text-right">{formatBRL(totalValorFechado)}</TableCell>
                        <TableCell className="text-sm text-right">{formatBRL(totalValorGasto)}</TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </PageTransition>
  );
};

export default CriativosPage;
