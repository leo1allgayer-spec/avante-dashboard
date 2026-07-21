import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import MetricCard from "@/components/MetricCard";
import MetricsForm from "@/components/MetricsForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTodayMetrics, useMonthMetrics } from "@/hooks/useMetrics";
import { MetaAdsFilters, useMetaAds } from "@/hooks/useMetaAds";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  Eye,
  Loader2,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CampaignStatusFilter = "all" | "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";

const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const formatNumber = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const tooltipStyle = { backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px", color: "hsl(220, 15%, 92%)", fontSize: 12 };
const axisStyle = { fontSize: 11, fill: "hsl(220, 10%, 45%)" };
const grid = "hsl(220, 14%, 14%)";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "Ativa", variant: "default" },
  PAUSED: { label: "Pausada", variant: "secondary" },
  DELETED: { label: "Excluida", variant: "destructive" },
  ARCHIVED: { label: "Arquivada", variant: "outline" },
};

const presetLabels: Record<MetaAdsFilters["datePreset"], string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last_7d: "7 dias",
  last_30d: "30 dias",
  this_month: "Este mes",
  custom: "Personalizado",
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStart() {
  const date = new Date();
  date.setDate(1);
  return formatLocalDate(date);
}

function numberValue(value?: string) {
  return Number(value || 0);
}

function budgetFromCents(value?: string) {
  const budget = Number(value || 0);
  return budget > 0 ? budget / 100 : 0;
}

function getActionValue(actions: Array<{ action_type: string; value: string }> | undefined, matcher: (actionType: string) => boolean) {
  if (!actions) return 0;
  return actions.reduce((total, action) => {
    const actionType = action.action_type.toLowerCase();
    return matcher(actionType) ? total + numberValue(action.value) : total;
  }, 0);
}

function getLeadsFromActions(actions?: Array<{ action_type: string; value: string }>) {
  return getActionValue(actions, (actionType) =>
    actionType === "lead" ||
    actionType === "onsite_conversion.lead_grouped" ||
    actionType === "offsite_conversion.fb_pixel_lead"
  );
}

function getConversationsFromActions(actions?: Array<{ action_type: string; value: string }>) {
  return getActionValue(actions, (actionType) =>
    actionType.includes("messaging_conversation") ||
    actionType.includes("conversation_started") ||
    actionType.includes("whatsapp") ||
    (actionType.includes("messaging") && actionType.includes("conversation"))
  );
}

const CampanhasPage = () => {
  const { toast } = useToast();
  const { data: today } = useTodayMetrics();
  const { data: monthData } = useMonthMetrics();
  const [datePreset, setDatePreset] = useState<MetaAdsFilters["datePreset"]>("this_month");
  const [since, setSince] = useState(getMonthStart());
  const [until, setUntil] = useState(formatLocalDate(new Date()));
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>("all");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const metaFilters = useMemo<MetaAdsFilters>(() => ({
    datePreset,
    since,
    until,
  }), [datePreset, since, until]);

  const { data: metaData, isLoading: metaLoading, error: metaError, refetch, isFetching } = useMetaAds(metaFilters);

  const campaignDetailsById = useMemo(() => {
    const details = new Map<string, {
      status: string;
      dailyBudget: number;
      lifetimeBudget: number;
    }>();
    (metaData?.campaigns || []).forEach((campaign) => details.set(campaign.id, {
      status: campaign.status,
      dailyBudget: budgetFromCents(campaign.daily_budget),
      lifetimeBudget: budgetFromCents(campaign.lifetime_budget),
    }));
    return details;
  }, [metaData?.campaigns]);

  const normalizedSearch = campaignSearch.trim().toLowerCase();

  const campaignRows = useMemo(() => {
    return (metaData?.campaignInsights || [])
      .map((campaign) => {
        const details = campaignDetailsById.get(campaign.campaign_id);
        return {
          id: campaign.campaign_id,
          name: campaign.campaign_name,
          status: details?.status || "UNKNOWN",
          dailyBudget: details?.dailyBudget || 0,
          lifetimeBudget: details?.lifetimeBudget || 0,
          spend: numberValue(campaign.spend),
          impressions: numberValue(campaign.impressions),
          clicks: numberValue(campaign.clicks),
          ctr: numberValue(campaign.ctr),
          cpc: numberValue(campaign.cpc),
          leads: getLeadsFromActions(campaign.actions),
          conversations: getConversationsFromActions(campaign.actions),
          reach: numberValue(campaign.reach),
        };
      })
      .filter((campaign) => statusFilter === "all" || campaign.status === statusFilter)
      .filter((campaign) => !normalizedSearch || campaign.name.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => b.spend - a.spend);
  }, [campaignDetailsById, metaData?.campaignInsights, normalizedSearch, statusFilter]);

  const filteredCampaigns = useMemo(() => {
    return (metaData?.campaigns || [])
      .filter((campaign) => statusFilter === "all" || campaign.status === statusFilter)
      .filter((campaign) => !normalizedSearch || campaign.name.toLowerCase().includes(normalizedSearch));
  }, [metaData?.campaigns, normalizedSearch, statusFilter]);

  const displayedMetaTotals = useMemo(() => {
    if (statusFilter !== "all" || normalizedSearch) {
      const spend = campaignRows.reduce((total, campaign) => total + campaign.spend, 0);
      const impressions = campaignRows.reduce((total, campaign) => total + campaign.impressions, 0);
      const clicks = campaignRows.reduce((total, campaign) => total + campaign.clicks, 0);
      const reach = campaignRows.reduce((total, campaign) => total + campaign.reach, 0);
      const leads = campaignRows.reduce((total, campaign) => total + campaign.leads, 0);
      const conversations = campaignRows.reduce((total, campaign) => total + campaign.conversations, 0);

      return {
        spend,
        impressions,
        clicks,
        reach,
        leads,
        conversations,
        cpc: clicks > 0 ? spend / clicks : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      };
    }

    const insights = metaData?.accountInsights;
    return {
      spend: insights ? numberValue(insights.spend) : 0,
      impressions: insights ? numberValue(insights.impressions) : 0,
      clicks: insights ? numberValue(insights.clicks) : 0,
      reach: insights ? numberValue(insights.reach) : 0,
      leads: insights ? getLeadsFromActions(insights.actions) : 0,
      conversations: insights ? getConversationsFromActions(insights.actions) : 0,
      cpc: insights ? numberValue(insights.cpc) : 0,
      ctr: insights ? numberValue(insights.ctr) : 0,
    };
  }, [campaignRows, metaData?.accountInsights, normalizedSearch, statusFilter]);

  const costPerLead = displayedMetaTotals.leads > 0 ? displayedMetaTotals.spend / displayedMetaTotals.leads : 0;
  const costPerConversation = displayedMetaTotals.conversations > 0 ? displayedMetaTotals.spend / displayedMetaTotals.conversations : 0;

  const dailyChart = (metaData?.dailyInsights || []).map((day) => ({
    date: new Date(`${day.date_start}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    gasto: numberValue(day.spend),
    cliques: numberValue(day.clicks),
    impressoes: numberValue(day.impressions),
    ctr: numberValue(day.ctr),
    conversas: getConversationsFromActions(day.actions),
  }));

  const totalInvest = (monthData || []).reduce((s, d) => s + Number(d.custo_por_lead) * Number(d.leads), 0);
  const totalRevenue = (monthData || []).reduce((s, d) => s + Number(d.faturamento_dia), 0);
  const roi = totalInvest > 0 ? ((totalRevenue - totalInvest) / totalInvest * 100) : 0;

  const hasMetaData = !!metaData && !metaError;

  const setQuickPeriod = (preset: MetaAdsFilters["datePreset"]) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      setSince(getMonthStart());
      setUntil(formatLocalDate(new Date()));
    }
  };

  const runCampaignAction = async (
    loadingKey: string,
    payload: Record<string, string | number>,
    successTitle: string,
  ) => {
    setActionLoading(loadingKey);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-action", {
        body: payload,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: successTitle });
      await refetch();
    } catch (error) {
      toast({
        title: "Erro ao alterar campanha",
        description: error instanceof Error ? error.message : "A Meta recusou a alteracao.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const updateCampaignStatus = async (campaign: { id: string; name: string; status: string }) => {
    const nextStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const label = nextStatus === "ACTIVE" ? "ativar" : "pausar";
    const confirmed = window.confirm(`Deseja ${label} a campanha "${campaign.name}"?`);
    if (!confirmed) return;

    await runCampaignAction(
      `${campaign.id}:status`,
      {
        action: "set_campaign_status",
        campaignId: campaign.id,
        status: nextStatus,
      },
      nextStatus === "ACTIVE" ? "Campanha ativada" : "Campanha pausada",
    );
  };

  const updateCampaignBudget = async (campaign: { id: string; name: string; dailyBudget: number }) => {
    const value = window.prompt(
      `Novo orcamento diario para "${campaign.name}" em R$:`,
      campaign.dailyBudget > 0 ? campaign.dailyBudget.toFixed(2).replace(".", ",") : "",
    );
    if (!value) return;

    const dailyBudget = Number(value.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(dailyBudget) || dailyBudget <= 0) {
      toast({ title: "Orcamento invalido", description: "Informe um valor maior que zero.", variant: "destructive" });
      return;
    }

    const confirmed = window.confirm(`Confirmar orcamento diario de ${formatCurrency(dailyBudget)} para "${campaign.name}"?`);
    if (!confirmed) return;

    await runCampaignAction(
      `${campaign.id}:budget`,
      {
        action: "set_campaign_daily_budget",
        campaignId: campaign.id,
        dailyBudget,
      },
      "Orcamento atualizado",
    );
  };

  return (
    <PageTransition>
      <DashboardLayout title="Campanhas" subtitle="Gestao de midia paga e investimentos - Meta Ads" actions={<MetricsForm currentData={today} />}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-hover rounded-lg p-4"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                Filtros da Meta Ads
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Periodo: {presetLabels[datePreset]} {datePreset === "custom" ? `(${since} a ${until})` : ""}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[180px_150px_150px_180px_220px_auto] xl:flex xl:items-end">
              <Select value={datePreset} onValueChange={(value) => setQuickPeriod(value as MetaAdsFilters["datePreset"])}>
                <SelectTrigger className="h-10 min-w-[170px]">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="yesterday">Ontem</SelectItem>
                  <SelectItem value="last_7d">Ultimos 7 dias</SelectItem>
                  <SelectItem value="last_30d">Ultimos 30 dias</SelectItem>
                  <SelectItem value="this_month">Este mes</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={since}
                onChange={(event) => {
                  setSince(event.target.value);
                  setDatePreset("custom");
                }}
                className="h-10"
              />
              <Input
                type="date"
                value={until}
                onChange={(event) => {
                  setUntil(event.target.value);
                  setDatePreset("custom");
                }}
                className="h-10"
              />

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CampaignStatusFilter)}>
                <SelectTrigger className="h-10 min-w-[170px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas campanhas</SelectItem>
                  <SelectItem value="ACTIVE">Ativas</SelectItem>
                  <SelectItem value="PAUSED">Pausadas</SelectItem>
                  <SelectItem value="ARCHIVED">Arquivadas</SelectItem>
                  <SelectItem value="DELETED">Excluidas</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={campaignSearch}
                  onChange={(event) => setCampaignSearch(event.target.value)}
                  placeholder="Buscar campanha"
                  className="h-10 pl-9"
                />
              </div>

              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-10">
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Atualizar
              </Button>
            </div>
          </div>
        </motion.div>

        {metaLoading && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados da Meta Ads...
          </div>
        )}

        {metaError && (
          <div className="glass-card-hover rounded-lg border-destructive/30 p-4">
            <p className="text-sm text-destructive">Erro ao carregar dados da Meta: {(metaError as Error).message}</p>
          </div>
        )}

        {hasMetaData && (
          <>
            <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StaggerItem><MetricCard title="Gasto Total (Meta)" value={formatCurrency(displayedMetaTotals.spend)} icon={<DollarSign className="h-5 w-5" />} variant="warning" /></StaggerItem>
              <StaggerItem><MetricCard title="Impressoes" value={formatNumber(displayedMetaTotals.impressions)} icon={<Eye className="h-5 w-5" />} variant="primary" /></StaggerItem>
              <StaggerItem><MetricCard title="Cliques" value={formatNumber(displayedMetaTotals.clicks)} icon={<MousePointerClick className="h-5 w-5" />} variant="accent" /></StaggerItem>
              <StaggerItem><MetricCard title="CTR" value={`${displayedMetaTotals.ctr.toFixed(2)}%`} icon={<TrendingUp className="h-5 w-5" />} variant="success" /></StaggerItem>
            </StaggerContainer>

            <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StaggerItem><MetricCard title="CPC Medio" value={formatCurrency(displayedMetaTotals.cpc)} icon={<BarChart3 className="h-5 w-5" />} variant="primary" /></StaggerItem>
              <StaggerItem><MetricCard title="Alcance" value={formatNumber(displayedMetaTotals.reach)} icon={<Users className="h-5 w-5" />} variant="accent" /></StaggerItem>
              <StaggerItem><MetricCard title="Leads (Meta)" value={formatNumber(displayedMetaTotals.leads)} icon={<Target className="h-5 w-5" />} variant="success" /></StaggerItem>
              <StaggerItem><MetricCard title="Custo por Lead" value={formatCurrency(costPerLead)} icon={<DollarSign className="h-5 w-5" />} variant={costPerLead > 50 ? "warning" : "success"} /></StaggerItem>
            </StaggerContainer>

            <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StaggerItem><MetricCard title="Conversas" value={formatNumber(displayedMetaTotals.conversations)} icon={<MessageCircle className="h-5 w-5" />} variant="primary" /></StaggerItem>
              <StaggerItem><MetricCard title="Custo por Conversa" value={formatCurrency(costPerConversation)} icon={<MessageCircle className="h-5 w-5" />} variant={costPerConversation > 20 ? "warning" : "success"} /></StaggerItem>
              <StaggerItem><MetricCard title="Investimento (local)" value={formatCurrency(totalInvest)} icon={<Megaphone className="h-5 w-5" />} variant="primary" /></StaggerItem>
              <StaggerItem><MetricCard title="ROAS Hoje" value={`${(today?.roas || 0).toFixed(2)}x`} icon={<MousePointerClick className="h-5 w-5" />} variant="success" /></StaggerItem>
            </StaggerContainer>
          </>
        )}

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><MetricCard title="Retorno Total" value={formatCurrency(totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} variant="accent" /></StaggerItem>
          <StaggerItem><MetricCard title="ROI Local" value={`${roi.toFixed(1)}%`} icon={<BarChart3 className="h-5 w-5" />} variant={roi > 0 ? "success" : "warning"} /></StaggerItem>
        </StaggerContainer>

        <div className="grid gap-5 lg:grid-cols-2">
          {hasMetaData && dailyChart.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card-hover rounded-lg p-5">
              <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gasto Diario - Meta Ads</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: grid }} />
                  <YAxis tick={axisStyle} axisLine={{ stroke: grid }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => name === "gasto" ? formatCurrency(v) : formatNumber(v)} />
                  <Area type="monotone" dataKey="gasto" fill="hsl(4, 72%, 56%)" fillOpacity={0.15} stroke="hsl(4, 72%, 56%)" strokeWidth={2} name="Gasto" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {hasMetaData && dailyChart.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card-hover rounded-lg p-5">
              <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversas Diarias - Meta Ads</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: grid }} />
                  <YAxis tick={axisStyle} axisLine={{ stroke: grid }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                  <Area type="monotone" dataKey="conversas" fill="hsl(160, 70%, 45%)" fillOpacity={0.15} stroke="hsl(160, 70%, 45%)" strokeWidth={2} name="Conversas" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>

        {hasMetaData && campaignRows.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card-hover rounded-lg p-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Performance por Campanha</h3>
              <span className="text-xs text-muted-foreground">{campaignRows.length} campanhas encontradas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campanha</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gasto</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliques</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">CTR</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPC</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leads</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversas</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custo/Conversa</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Orcamento</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignRows.map((campaign) => {
                    const st = statusMap[campaign.status] || { label: campaign.status, variant: "outline" as const };
                    const campaignCostPerConversation = campaign.conversations > 0 ? campaign.spend / campaign.conversations : 0;
                    const canToggle = campaign.status === "ACTIVE" || campaign.status === "PAUSED";
                    const statusLoading = actionLoading === `${campaign.id}:status`;
                    const budgetLoading = actionLoading === `${campaign.id}:budget`;
                    return (
                      <tr key={campaign.id} className="border-b border-border/20 transition-colors hover:bg-secondary/30">
                        <td className="max-w-[240px] truncate py-3 pr-4 font-medium text-foreground">{campaign.name}</td>
                        <td className="py-3 pr-4"><Badge variant={st.variant}>{st.label}</Badge></td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(campaign.spend)}</td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">{formatNumber(campaign.clicks)}</td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">{campaign.ctr.toFixed(2)}%</td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(campaign.cpc)}</td>
                        <td className="py-3 pr-4 text-right font-medium text-foreground">{formatNumber(campaign.leads)}</td>
                        <td className="py-3 pr-4 text-right font-medium text-foreground">{formatNumber(campaign.conversations)}</td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(campaignCostPerConversation)}</td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">
                          {campaign.dailyBudget > 0 ? `${formatCurrency(campaign.dailyBudget)}/dia` : campaign.lifetimeBudget > 0 ? `${formatCurrency(campaign.lifetimeBudget)} total` : "-"}
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canToggle || !!actionLoading}
                              onClick={() => updateCampaignStatus(campaign)}
                              className="h-8 px-3"
                            >
                              {statusLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : campaign.status === "ACTIVE" ? (
                                <PauseCircle className="h-3.5 w-3.5" />
                              ) : (
                                <PlayCircle className="h-3.5 w-3.5" />
                              )}
                              {campaign.status === "ACTIVE" ? "Pausar" : "Ativar"}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={!!actionLoading}
                              onClick={() => updateCampaignBudget(campaign)}
                              className="h-8 px-3"
                            >
                              {budgetLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WalletCards className="h-3.5 w-3.5" />}
                              Orcamento
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {hasMetaData && campaignRows.length === 0 && (
          <div className="glass-card-hover rounded-lg p-5 text-sm text-muted-foreground">
            Nenhuma campanha encontrada com os filtros selecionados.
          </div>
        )}

        {hasMetaData && filteredCampaigns.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card-hover rounded-lg p-5">
            <h3 className="mb-4 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lista de Campanhas</h3>
            <div className="space-y-2">
              {filteredCampaigns.map((campaign) => {
                const st = statusMap[campaign.status] || { label: campaign.status, variant: "outline" as const };
                return (
                  <div key={campaign.id} className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-secondary/30">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{campaign.name}</p>
                      <p className="text-[11px] text-muted-foreground">{campaign.objective?.replace(/_/g, " ") || "-"}</p>
                    </div>
                    <Badge variant={st.variant} className="ml-3 shrink-0">{st.label}</Badge>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
};

export default CampanhasPage;
