import { useState, useMemo } from "react";
import { motion } from "framer-motion";

import { useDateFilter } from "@/hooks/useDateFilter";
import { useDeleteMetrics } from "@/hooks/useMetrics";
import { useBusinessSummary } from "@/hooks/useBusinessSummary";
import { useSyncSheets } from "@/hooks/useSyncSheets";
import { useMetaAds } from "@/hooks/useMetaAds";
import { useCourseBookings } from "@/hooks/clients/useCourseBookings";
import { useSurveyResponses } from "@/hooks/useSurveyInsights";
import { COURSE_PRODUCTS, SERVICE_CATEGORIES, SERVICE_OPTIONS, canonicalizeSaleCategory } from "@/constants/serviceCategories";
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

const getFirstMetaAction = (actions: Array<{ action_type: string; value: string }> | undefined, types: string[]) => {
  for (const type of types) {
    const action = actions?.find((item) => item.action_type.toLowerCase() === type);
    if (action) return Number(action.value || 0);
  }
  return 0;
};

const getCampaignLeads = (actions?: Array<{ action_type: string; value: string }>) => getFirstMetaAction(actions, [
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "offsite_complete_registration_add_meta_leads",
  "offsite_content_view_add_meta_leads",
]);

const getCampaignMql = (actions?: Array<{ action_type: string; value: string }>) => {
  const preferred = getFirstMetaAction(actions, [
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.total_messaging_connection",
    "onsite_conversion.messaging_first_reply",
  ]);
  if (preferred > 0) return preferred;
  return (actions || []).reduce((total, action) => {
    const type = action.action_type.toLowerCase();
    return type.includes("conversation_started") || type.includes("whatsapp") ? total + Number(action.value || 0) : total;
  }, 0);
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
    fechamentosMes,
    vendasTotal,
    totalLeads,
    totalMql,
    totalAds,
    cursosFeitos,
    totalCursoMarcado,
    coletadoMes,
    aReceberMes,
    metaMensal,
    superMetaMensal,
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
  const metaAdsFilters = useMemo(() => ({
    datePreset: "custom" as const,
    since: filter.range.start,
    until: filter.range.end,
  }), [filter.range.start, filter.range.end]);
  const { data: metaAdsMonth } = useMetaAds(metaAdsFilters);
  const { bookings } = useCourseBookings();
  const { data: surveyResponses = [] } = useSurveyResponses();
  const selectedMonthAds = useMemo(() => {
    const dailyInsights = metaAdsMonth?.dailyInsights || [];
    if (dailyInsights.length > 0) {
      return dailyInsights.reduce((total, day) => total + Number(day.spend || 0), 0);
    }
    return totalAds;
  }, [metaAdsMonth, totalAds]);
  const campaignActionRows = useMemo(() => {
    if ((metaAdsMonth?.campaignInsights || []).length > 0) return metaAdsMonth!.campaignInsights;
    return metaAdsMonth?.dailyInsights || [];
  }, [metaAdsMonth]);
  const campaignMetaLeads = useMemo(
    () => campaignActionRows.reduce((total, row) => total + getCampaignLeads(row.actions), 0),
    [campaignActionRows],
  );
  const campaignMql = useMemo(
    () => campaignActionRows.reduce((total, row) => total + getCampaignMql(row.actions), 0),
    [campaignActionRows],
  );
  const campaignLeads = campaignMetaLeads + campaignMql;
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

  const collectedCategoryStats = useMemo(() => {
    const stats = new Map(SERVICE_CATEGORIES.map((category) => [category, 0]));
    const usedFechamentos = new Set<string>();
    for (const venda of registeredVendas) {
      const category = canonicalizeSaleCategory(venda.servico || venda.produto);
      const fechamento = fechamentosMes.find((item) =>
        !usedFechamentos.has(item.id) &&
        normalizeText(item.status) !== "cancelado" &&
        item.data === venda.data &&
        normalizeText(item.cliente) === normalizeText(venda.cliente) &&
        normalizeText(item.vendedor) === normalizeText(venda.vendedor) &&
        normalizeText(canonicalizeSaleCategory(item.categoria || item.produto_servico)) === normalizeText(category)
      );
      if (fechamento) {
        usedFechamentos.add(fechamento.id);
        const collected = Math.min(Number(venda.valor || 0), Number(fechamento.valor_sinal || 0));
        stats.set(category, (stats.get(category) || 0) + collected);
      }
    }
    return stats;
  }, [fechamentosMes, registeredVendas]);
  const collectedTotal = useMemo(() => {
    const groups = new Map<string, { total: number; data: string; cliente: string; vendedor: string }>();
    for (const venda of registeredVendas) {
      const key = [venda.data, normalizeText(venda.cliente), normalizeText(venda.vendedor)].join("|");
      const current = groups.get(key) || { total: 0, data: venda.data, cliente: venda.cliente, vendedor: venda.vendedor };
      current.total += Number(venda.valor || 0);
      groups.set(key, current);
    }
    return Array.from(groups.values()).reduce((total, group) => {
      const received = fechamentosMes
        .filter((item) =>
          normalizeText(item.status) !== "cancelado" &&
          item.data === group.data &&
          normalizeText(item.cliente) === normalizeText(group.cliente) &&
          normalizeText(item.vendedor) === normalizeText(group.vendedor)
        )
        .reduce((sum, item) => sum + Number(item.valor_sinal || 0), 0);
      return total + Math.min(group.total, received);
    }, 0);
  }, [fechamentosMes, registeredVendas]);
  const receivableTotal = Math.max(registeredVendasTotal - collectedTotal, 0);
  const realizedMetaPct = metaMensal > 0 ? Math.min((collectedTotal / metaMensal) * 100, 100) : 0;
  const realizedSuperMetaPct = Number(superMetaMensal) > 0 ? Math.min((collectedTotal / Number(superMetaMensal)) * 100, 100) : 0;
  const businessDays = useMemo(() => {
    const start = new Date(`${filter.range.start}T12:00:00`);
    const end = new Date(`${filter.range.end}T12:00:00`);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    let total = 0;
    let remaining = 0;
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const weekday = date.getDay();
      if (weekday >= 1 && weekday <= 5) {
        total += 1;
        if (date > today) remaining += 1;
      }
    }
    if (today < start) remaining = total;
    if (today > end) remaining = 0;
    return { total, remaining };
  }, [filter.range.start, filter.range.end]);
  const scheduledCourses = useMemo(() => bookings.filter((booking) =>
    booking.date >= filter.range.start &&
    booking.date <= filter.range.end &&
    normalizeText(booking.status) === "confirmed" &&
    normalizeText(booking.courseStatus) !== "cancelado"
  ).length, [bookings, filter.range.start, filter.range.end]);
  const completedCourses = useMemo(() => surveyResponses.filter((response) => {
    if (!response.created_at) return false;
    const date = response.created_at.slice(0, 10);
    return date >= filter.range.start && date <= filter.range.end;
  }).length, [surveyResponses, filter.range.start, filter.range.end]);
  const cacTotal = registeredVendas.length > 0 ? selectedMonthAds / registeredVendas.length : 0;
  const cacCourses = completedCourses > 0 ? selectedMonthAds / completedCourses : 0;

  const roasLabels = useMemo<Record<string, string>>(() => ({
    geral: "Geral",
    cursos: "Todos os cursos",
    servicos: "Todos os serviços",
    ...Object.fromEntries(SERVICE_CATEGORIES.map((category) => [`categoria:${category}`, category])),
  }), []);

  const currentRoas = useMemo(() => {
    if (selectedMonthAds <= 0 || roasFilter.length === 0) return 0;
    if (roasFilter.includes("geral")) return collectedTotal / selectedMonthAds;

    const selectedCategories = new Set<string>();
    if (roasFilter.includes("cursos")) COURSE_PRODUCTS.forEach((category) => selectedCategories.add(category));
    if (roasFilter.includes("servicos")) SERVICE_OPTIONS.forEach((category) => selectedCategories.add(category));
    roasFilter.forEach((filterKey) => {
      if (filterKey.startsWith("categoria:")) selectedCategories.add(filterKey.slice("categoria:".length));
    });

    const collected = Array.from(selectedCategories).reduce(
      (total, category) => total + (collectedCategoryStats.get(category) || 0),
      0,
    );
    return collected / selectedMonthAds;
  }, [roasFilter, selectedMonthAds, collectedTotal, collectedCategoryStats]);

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
                    <CountUp end={collectedTotal} duration={2.2} prefix="R$" separator="." decimal="," decimals={0} />
                  </p>
                  {metaMensal > 0 && (
                    <p className="text-sm text-muted-foreground/50 mt-2">
                      Meta: {formatCurrency(metaMensal)} · <span className={realizedMetaPct >= 80 ? "text-success" : "text-warning"}>{realizedMetaPct.toFixed(0)}%</span>
                      {Number(superMetaMensal) > 0 && (
                        <span className="ml-2 text-amber-400/70">
                          Super: {formatCurrency(Number(superMetaMensal))} · {realizedSuperMetaPct.toFixed(0)}%
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
                        animate={{ width: `${realizedMetaPct}%` }}
                        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                        className="h-full rounded-full bg-accent"
                      />
                    </div>
                    {Number(superMetaMensal) > 0 && (
                      <div className="h-1.5 w-full rounded-full overflow-hidden bg-secondary/60">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${realizedSuperMetaPct}%` }}
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
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">A receber</p>
              </div>
              <p className="font-display text-xl sm:text-3xl font-bold text-foreground mt-2 tabular-nums">
                <CountUp end={receivableTotal} duration={2} prefix="R$" separator="." decimal="," decimals={0} />
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
              <div className="flex max-h-24 flex-wrap gap-1.5 mb-3 overflow-y-auto pr-1">
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
                <CountUp end={collectedTotal} duration={2} prefix="R$" separator="." decimal="," decimals={0} />
              </p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">A receber</p>
              </div>
              <p className="font-display text-xl sm:text-2xl font-bold text-foreground leading-none tabular-nums">
                <CountUp end={receivableTotal} duration={2} prefix="R$" separator="." decimal="," decimals={0} />
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
                <CountUp end={selectedMonthAds} duration={2} prefix="R$" separator="." decimal="," decimals={0} />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-1">Vendido</p>
                  <p className="font-display text-lg sm:text-xl font-bold text-accent leading-none tabular-nums"><CountUp end={registeredVendasTotal} duration={2} prefix="R$" separator="." decimal="," decimals={0} /></p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-1">Coletado</p>
                  <p className="font-display text-lg sm:text-xl font-bold text-success leading-none tabular-nums"><CountUp end={collectedTotal} duration={2} prefix="R$" separator="." decimal="," decimals={0} /></p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/40 mt-1">{registeredVendas.length} vendas</p>
            </motion.div>
            {SERVICE_CATEGORIES.map((category) => {
              const st = salesCategoryStats.get(category) || { count: 0, valor: 0 };
              const collected = collectedCategoryStats.get(category) || 0;
              return (
                <motion.div key={category} variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">{category}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-1">Vendido</p>
                      <p className="font-display text-lg sm:text-xl font-bold text-foreground leading-none tabular-nums"><CountUp end={st.valor} duration={2} prefix="R$" separator="." decimal="," decimals={0} /></p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-1">Coletado</p>
                      <p className="font-display text-lg sm:text-xl font-bold text-success leading-none tabular-nums"><CountUp end={collected} duration={2} prefix="R$" separator="." decimal="," decimals={0} /></p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/40 mt-1">{st.count} vendas</p>
                </motion.div>
              );
            })}
          </div>


          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 relative dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-3.5 w-3.5 text-accent/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Dias úteis restantes</p>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-none tabular-nums">
                <CountUp end={businessDays.remaining} duration={2} />
              </p>
              <p className="text-xs text-muted-foreground/40 mt-1.5">de {businessDays.total} dias úteis no mês</p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Leads</p>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-none tabular-nums">
                <CountUp end={campaignLeads} duration={2} />
              </p>
              <p className="text-xs text-muted-foreground/40 mt-1.5">{campaignMetaLeads} leads + {campaignMql} conversas</p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="h-3.5 w-3.5 text-accent/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">MQL</p>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-accent leading-none tabular-nums">
                <CountUp end={campaignMql} duration={2} />
              </p>
              {campaignLeads > 0 && <p className="text-xs text-muted-foreground/40 mt-1.5">conversas por mensagem · {((campaignMql / campaignLeads) * 100).toFixed(1)}%</p>}
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">CAC Total</p>
              </div>
              <p className="font-display text-2xl font-bold text-foreground leading-none tabular-nums">{formatCurrency(cacTotal)}</p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-3.5 w-3.5 text-primary/70" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">CAC Cursos</p>
              </div>
              <p className="font-display text-2xl font-bold text-primary leading-none tabular-nums">{formatCurrency(cacCourses)}</p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardCheck className="h-3.5 w-3.5 text-accent/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Cursos Marcados</p>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-none tabular-nums">
                <CountUp end={scheduledCourses} duration={2} />
              </p>
            </motion.div>

            <motion.div variants={item} className="rounded-2xl p-4 sm:p-5 dashboard-card">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-3.5 w-3.5 text-success/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Cursos Feitos</p>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold text-success leading-none tabular-nums">
                <CountUp end={completedCourses} duration={2} />
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






