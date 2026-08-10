import { useState, useMemo } from "react";
import { motion } from "framer-motion";

import { useDateFilter } from "@/hooks/useDateFilter";
import { useDeleteMetrics } from "@/hooks/useMetrics";
import { useBusinessSummary } from "@/hooks/useBusinessSummary";
import { useSyncSheets } from "@/hooks/useSyncSheets";
import { SERVICE_CATEGORIES, canonicalizeSaleCategory } from "@/constants/serviceCategories";
import DashboardLayout from "@/components/DashboardLayout";
import DateFilterBar from "@/components/DateFilterBar";

import MetricsForm from "@/components/MetricsForm";
import RevenueChart from "@/components/RevenueChart";
import LeadsPieChart from "@/components/charts/LeadsPieChart";
import CostBarChart from "@/components/charts/CostBarChart";
import LeadsFunnelChart from "@/components/charts/LeadsFunnelChart";
import PageTransition from "@/components/PageTransition";
import SurveyInsightsPanel from "@/components/SurveyInsightsPanel";
import CountUp from "react-countup";
import { TrendingUp, CalendarDays, Zap, Target, Users, UserCheck, DollarSign, Trash2, CalendarX2, RefreshCw, GraduationCap, ClipboardCheck, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import MonthlyMetricsTimeline from "@/components/MonthlyMetricsTimeline";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
const normalizeText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const getSaleCategory = (sale: { servico?: string | null; produto?: string | null }) => {
  const raw = sale.servico || sale.produto || "";
  const normalized = normalizeText(raw);
  if (["gestao de trafego", "tráfego", "trafego"].includes(normalized)) return "Tráfego";
  if (["captacao/edicao de conteudo", "captacao", "captação", "captação/edição de conteúdo"].includes(normalized)) return "Captação";
  if (["desenvolvimento de site", "site"].includes(normalized)) return "Site";
  if (["crm/treinamento comercial", "crm", "assessoria 360"].includes(normalized)) return "CRM";
  if (["upsell", "mentoria meta ads"].includes(normalized)) return "Upsell";
  return raw;
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const Dashboard = () => {
  const filter = useDateFilter();
  // Force month mode - no day/week switching on Visão Geral
  const summary = useBusinessSummary(filter);
  const {
    today,
    monthData,
    vendasData,
    approvedVendas,
    fechamentosMes,
    vendasTotal,
    monthRealized,
    totalFatMarcado,
    totalLeads,
    totalMql,
    totalAds,
    cursosFeitos,
    totalCursoMarcado,
    coletadoMes,
    aReceberMes,
    metaMensal,
    superMetaMensal,
    metaPct,
    superMetaPct,
    daysWithData,
    avgCac,
    avgCpl,
    convRate,
  } = summary;
  const [roasFilter, setRoasFilter] = useState<string[]>(["geral"]);
  const deleteMetrics = useDeleteMetrics();
  const syncSheets = useSyncSheets();
  const { toast } = useToast();
  const [historyOpen, setHistoryOpen] = useState(false);
  const latestDay = monthData.length > 0 ? monthData[monthData.length - 1] : null;
  const registeredVendas = useMemo(
    () => vendasData.filter((venda) => normalizeText(venda.status) !== "cancelada"),
    [vendasData],
  );
  const registeredVendasTotal = useMemo(
    () => registeredVendas.reduce((total, venda) => total + Number(venda.valor || 0), 0),
    [registeredVendas],
  );
  const registeredVendasComissao = useMemo(
    () => registeredVendas.reduce((total, venda) => total + Number(venda.comissao || 0), 0),
    [registeredVendas],
  );

  const SERVICOS = ["Tráfego", "Captação", "Site", "Upsell", "CRM"];
  const serviceStats = useMemo(() => {
    const stats: Record<string, { count: number; valor: number }> = {};
    for (const s of SERVICOS) stats[s] = { count: 0, valor: 0 };
    for (const v of approvedVendas) {
      const key = SERVICOS.find((service) => normalizeText(service) === normalizeText(canonicalizeSaleCategory(v.servico || v.produto)));
      if (key) {
        stats[key].count++;
        stats[key].valor += Number(v.valor);
      }
    }
    const servicosTotal = SERVICOS.reduce((s, k) => s + stats[k].valor, 0);
    return { byService: stats, total: servicosTotal };
  }, [approvedVendas]);

  const salesCategoryStats = useMemo(() => {
    const stats = new Map(SERVICE_CATEGORIES.map((category) => [category, { count: 0, valor: 0 }]));
    for (const venda of registeredVendas) {
      const category = canonicalizeSaleCategory(venda.servico || venda.produto);
      const current = stats.get(category);
      if (current) {
        current.count += 1;
        current.valor += Number(venda.valor || 0);
      }
    }
    return stats;
  }, [registeredVendas]);

  // ROAS por categoria
  const roasValues = useMemo(() => {
    const servicoByType: Record<string, number> = { "Tráfego": 0, "Captação": 0, "Site": 0, "Upsell": 0, "CRM": 0 };
    for (const v of approvedVendas) {
      const key = Object.keys(servicoByType).find((service) => normalizeText(service) === normalizeText(canonicalizeSaleCategory(v.servico || v.produto)));
      if (key) {
        servicoByType[key] += Number(v.valor);
      }
    }
    const faturamentoSemServicos = Math.max(monthRealized - serviceStats.total, 0) + totalFatMarcado;
    const fatTotal = faturamentoSemServicos + serviceStats.total;
    return {
      geral: totalAds > 0 ? fatTotal / totalAds : 0,
      faturamento: totalAds > 0 ? faturamentoSemServicos / totalAds : 0,
      servicos: totalAds > 0 ? serviceStats.total / totalAds : 0,
      trafego: totalAds > 0 ? servicoByType["Tráfego"] / totalAds : 0,
      captacao: totalAds > 0 ? servicoByType["Captação"] / totalAds : 0,
      site: totalAds > 0 ? servicoByType["Site"] / totalAds : 0,
      upsell: totalAds > 0 ? servicoByType["Upsell"] / totalAds : 0,
      crm: totalAds > 0 ? servicoByType["CRM"] / totalAds : 0,
    };
  }, [monthRealized, totalFatMarcado, serviceStats, totalAds, approvedVendas]);

  const roasLabels: Record<string, string> = {
    geral: "Geral",
    faturamento: "Faturamento",
    servicos: "Total Serviços",
    trafego: "Tráfego",
    captacao: "Captação",
    site: "Site",
    upsell: "Upsell",
    crm: "CRM",
  };

  const currentRoas = useMemo(() => {
    if (roasFilter.length === 0) return 0;
    if (roasFilter.includes("geral")) return roasValues.geral;
    const servicoByType: Record<string, number> = { "Tráfego": 0, "Captação": 0, "Site": 0, "Upsell": 0, "CRM": 0 };
    for (const v of approvedVendas) {
      const key = Object.keys(servicoByType).find((service) => normalizeText(service) === normalizeText(canonicalizeSaleCategory(v.servico || v.produto)));
      if (key) {
        servicoByType[key] += Number(v.valor);
      }
    }
    const faturamentoSemServicos = Math.max(monthRealized - serviceStats.total, 0) + totalFatMarcado;
    let numerator = 0;
    if (roasFilter.includes("faturamento")) numerator += faturamentoSemServicos;
    if (roasFilter.includes("servicos")) {
      numerator += serviceStats.total;
    } else {
      if (roasFilter.includes("trafego")) numerator += servicoByType["Tráfego"];
      if (roasFilter.includes("captacao")) numerator += servicoByType["Captação"];
      if (roasFilter.includes("site")) numerator += servicoByType["Site"];
      if (roasFilter.includes("upsell")) numerator += servicoByType["Upsell"];
      if (roasFilter.includes("crm")) numerator += servicoByType["CRM"];
    }
    return totalAds > 0 ? numerator / totalAds : 0;
  }, [roasFilter, roasValues, approvedVendas, monthRealized, totalFatMarcado, serviceStats, totalAds]);

  const handleSync = () => {
    syncSheets.mutate(undefined, {
      onSuccess: (data) => toast({ title: `Planilha sincronizada!`, description: `${data.imported} dias importados.` }),
      onError: (err) => toast({ title: "Erro na sincronização", description: (err as Error).message, variant: "destructive" }),
    });
  };

  const dateStr = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <PageTransition>
      <DashboardLayout
        title="Visão Geral"
        subtitle={dateStr}
        actions={
          <div className="flex items-center gap-2">
            <MetricsForm currentData={today} />
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" title="Sincronizar planilha Google" onClick={handleSync} disabled={syncSheets.isPending}>
              {syncSheets.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" title="Gerenciar métricas por dia">
                  <CalendarX2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                <div className="bg-gradient-to-br from-destructive/10 via-accent/5 to-transparent px-6 pt-6 pb-4">
                  <DialogHeader>
                    <DialogTitle className="font-display text-lg flex items-center gap-2">
                      <CalendarX2 className="h-4 w-4 text-destructive" /> Apagar Métricas por Dia
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">Selecione o dia que deseja apagar</p>
                  </DialogHeader>
                </div>
                <div className="px-6 pb-6 max-h-[50vh] overflow-y-auto space-y-1">
                  {monthData.slice().reverse().map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {new Date(m.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fat: {formatCurrency(Number(m.faturamento_dia))} · Leads: {m.leads} · ROAS: {Number(m.roas).toFixed(1)}x
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 ml-2">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar métricas deste dia?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Dados de {new Date(m.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} serão removidos permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMetrics.mutate(m.id, {
                              onSuccess: () => toast({ title: `Métricas apagadas!` }),
                              onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
                            })}>Apagar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10" title="Apagar métricas de hoje">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar métricas do dia?</AlertDialogTitle>
                  <AlertDialogDescription>Todos os dados de métricas de hoje serão removidos.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction disabled={!today?.id} onClick={() => today?.id && deleteMetrics.mutate(today.id, {
                    onSuccess: () => toast({ title: "Métricas do dia apagadas!" }),
                    onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
                  })}>Apagar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      >
        <DateFilterBar
          mode={filter.mode}
          onModeChange={filter.setMode}
          label={filter.label}
          onBack={filter.goBack}
          onForward={filter.goForward}
        />

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

          {/* Month label (no day/week filter) */}
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-muted-foreground">{filter.label}</p>
          </div>

          <MonthlyMetricsTimeline />

          {/* ROW 1: Hero + side cards */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-12 md:auto-rows-auto">
            {/* Hero: Faturamento */}
            <motion.div
              variants={item}
              className="col-span-2 md:col-span-7 md:row-span-2 rounded-2xl relative overflow-hidden min-h-[180px] dashboard-card"
            >
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-[0.07] blur-[80px] pointer-events-none bg-accent" />
              <div className="relative z-10 h-full flex flex-col justify-between p-4 sm:p-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-accent/60" />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-medium">Faturamento (mês)</p>
                  </div>
                  <p className="font-display text-[2rem] sm:text-[2.8rem] md:text-[3.4rem] font-extrabold text-foreground leading-none tracking-tight">
                    <CountUp end={monthRealized} duration={2.2} prefix="R$" separator="." decimal="," decimals={0} />
                  </p>
                  {metaMensal > 0 && (
                    <p className="text-sm text-muted-foreground/50 mt-2">
                      Meta: {formatCurrency(metaMensal)} · <span className={metaPct >= 80 ? "text-success" : "text-warning"}>{metaPct.toFixed(0)}%</span>
                      {Number(superMetaMensal) > 0 && (
                        <span className="ml-2 text-amber-400/70">
                          Super: {formatCurrency(Number(superMetaMensal))} · {superMetaPct.toFixed(0)}%
                        </span>
                      )}
                    </p>
                  )}
                </div>
                {metaMensal > 0 && (
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full rounded-full overflow-hidden bg-secondary/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${metaPct}%` }}
                        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                        className="h-full rounded-full bg-accent"
                      />
                    </div>
                    {Number(superMetaMensal) > 0 && (
                      <div className="h-1.5 w-full rounded-full overflow-hidden bg-secondary/60">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${superMetaPct}%` }}
                          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
                          className="h-full rounded-full bg-amber-400/80"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Faturamento Feito */}
            <motion.div variants={item}
              className="col-span-1 md:col-span-5 rounded-2xl p-4 sm:p-5 relative overflow-hidden min-h-[110px] dashboard-card"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Fat. Marcado</p>
              </div>
              <p className="font-display text-xl sm:text-3xl font-bold text-foreground mt-2 tabular-nums">
                <CountUp end={totalFatMarcado} duration={2} prefix="R$" separator="." decimal="," decimals={0} />
              </p>
            </motion.div>

            {/* ROAS with filter */}
            <motion.div variants={item}
              className="col-span-2 md:col-span-5 rounded-2xl p-4 sm:p-5 relative overflow-hidden min-h-[180px] dashboard-card"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">ROAS</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${
                  currentRoas >= 3 ? "bg-success/10 text-success" : currentRoas >= 1 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                }`}>
                  {currentRoas >= 3 ? "Excelente" : currentRoas >= 1 ? "Positivo" : "Baixo"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(roasLabels).map(([key, label]) => {
                  const isActive = roasFilter.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === "geral") {
                          setRoasFilter(["geral"]);
                        } else {
                          const next = isActive
                            ? roasFilter.filter(f => f !== key)
                            : [...roasFilter.filter(f => f !== "geral"), key];
                          setRoasFilter(next.length === 0 ? ["geral"] : next);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                        isActive
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "bg-secondary/30 text-muted-foreground/60 border border-border/20 hover:bg-secondary/50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="font-display text-xl sm:text-3xl font-bold text-foreground tabular-nums">
                <CountUp end={currentRoas} duration={2} suffix="x" decimals={2} />
              </p>
            </motion.div>
          </div>

          {/* ROW 1.5: Faturamento Feito, Marcado, Vendas */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-3.5 w-3.5 text-accent/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Fat. Feito</p>
              </div>
              <p className="font-display text-xl sm:text-2xl font-bold text-foreground leading-none tabular-nums">
                <CountUp end={monthRealized} duration={2} prefix="R$" separator="." decimal="," decimals={0} />
              </p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Fat. Marcado</p>
              </div>
              <p className="font-display text-xl sm:text-2xl font-bold text-foreground leading-none tabular-nums">
                <CountUp end={totalFatMarcado} duration={2} prefix="R$" separator="." decimal="," decimals={0} />
              </p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Vendas ({registeredVendas.length})</p>
              </div>
              <p className="font-display text-xl sm:text-2xl font-bold text-foreground leading-none tabular-nums">
                <CountUp end={registeredVendasTotal} duration={2} prefix="R$" separator="." decimal="," decimals={0} />
              </p>
              <p className="text-xs text-muted-foreground/40 mt-1">{registeredVendas.length} registradas · Com. {formatCurrency(registeredVendasComissao)}</p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-3.5 w-3.5 text-accent/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Investido (ADS)</p>
              </div>
              <p className="font-display text-xl sm:text-2xl font-bold text-foreground leading-none tabular-nums">
                <CountUp end={daysWithData.reduce((s, d) => s + Number(d.ads || 0), 0)} duration={2} prefix="R$" separator="." decimal="," decimals={0} />
              </p>
            </motion.div>
          </div>

          {/* ROW 1.6: Todas as categorias de vendas */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card dashboard-card-accent">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-3.5 w-3.5 text-accent/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Total vendido</p>
              </div>
              <p className="font-display text-xl sm:text-2xl font-bold text-accent leading-none tabular-nums">
                <CountUp end={registeredVendasTotal} duration={2} prefix="R$" separator="." decimal="," decimals={0} />
              </p>
              <p className="text-xs text-muted-foreground/40 mt-1">{registeredVendas.length} vendas</p>
            </motion.div>
            {SERVICE_CATEGORIES.map((category) => {
              const st = salesCategoryStats.get(category) || { count: 0, valor: 0 };
              return (
                <motion.div key={category} variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">{category}</p>
                  </div>
                  <p className="font-display text-xl sm:text-2xl font-bold text-foreground leading-none tabular-nums">
                    <CountUp end={st.valor} duration={2} prefix="R$" separator="." decimal="," decimals={0} />
                  </p>
                  <p className="text-xs text-muted-foreground/40 mt-1">{st.count} vendas</p>
                </motion.div>
              );
            })}
          </div>


          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-6">
            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 relative dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-3.5 w-3.5 text-accent/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Dias ativos</p>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-none tabular-nums">
                <CountUp end={daysWithData.length} duration={2} />
              </p>
              <p className="text-xs text-muted-foreground/40 mt-1.5">de {monthData.length} dias</p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Leads</p>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-none tabular-nums">
                <CountUp end={totalLeads} duration={2} />
              </p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="h-3.5 w-3.5 text-accent/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">MQL</p>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-accent leading-none tabular-nums">
                <CountUp end={totalMql} duration={2} />
              </p>
              {convRate > 0 && <p className="text-xs text-muted-foreground/40 mt-1.5">conversão: {convRate.toFixed(1)}%</p>}
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">CAC Médio</p>
              </div>
              <p className="font-display text-2xl font-bold text-foreground leading-none tabular-nums">{formatCurrency(avgCac)}</p>
              <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground/40"><span>CPL {formatCurrency(avgCpl)}</span></div>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardCheck className="h-3.5 w-3.5 text-accent/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Cursos Marcados</p>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-none tabular-nums">
                <CountUp end={totalCursoMarcado} duration={2} />
              </p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-3.5 w-3.5 text-success/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Cursos Feitos</p>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-success leading-none tabular-nums">
                <CountUp end={cursosFeitos} duration={2} />
              </p>
            </motion.div>
          </div>

          {/* ROW 3: Charts */}
          <div className="grid gap-3 sm:gap-5 grid-cols-1 lg:grid-cols-2">
            <motion.div variants={item}><RevenueChart monthData={monthData} /></motion.div>
            <motion.div variants={item}>
              <LeadsPieChart leads={totalLeads} leadsMql={totalMql} monthData={monthData} />
            </motion.div>
          </div>

          <div className="grid gap-3 sm:gap-5 grid-cols-1 lg:grid-cols-2">
            <motion.div variants={item}>
              <CostBarChart custoLead={avgCpl} custoMql={latestDay?.custo_por_lead_mql || 0} cac={avgCac} monthData={monthData} />
            </motion.div>
            <motion.div variants={item}>
              <LeadsFunnelChart monthData={monthData} />
            </motion.div>
          </div>

          <motion.div variants={item}>
            <SurveyInsightsPanel />
          </motion.div>

        </motion.div>
      </DashboardLayout>
    </PageTransition>
  );
};

export default Dashboard;






