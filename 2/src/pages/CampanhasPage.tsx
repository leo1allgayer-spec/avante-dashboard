import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import MetricCard from "@/components/MetricCard";
import MetricsForm from "@/components/MetricsForm";
import { useTodayMetrics, useMonthMetrics } from "@/hooks/useMetrics";
import { useMetaAds } from "@/hooks/useMetaAds";
import { motion } from "framer-motion";
import { Megaphone, MousePointerClick, BarChart3, TrendingUp, Eye, DollarSign, Target, Users, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Area, AreaChart } from "recharts";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const formatNumber = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const tooltipStyle = { backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px", color: "hsl(220, 15%, 92%)", fontSize: 12 };
const axisStyle = { fontSize: 11, fill: "hsl(220, 10%, 45%)" };
const grid = "hsl(220, 14%, 14%)";

const getLeadsFromActions = (actions?: Array<{ action_type: string; value: string }>) => {
  if (!actions) return 0;
  const lead = actions.find(a => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped" || a.action_type === "offsite_conversion.fb_pixel_lead");
  return lead ? Number(lead.value) : 0;
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "Ativa", variant: "default" },
  PAUSED: { label: "Pausada", variant: "secondary" },
  DELETED: { label: "Excluída", variant: "destructive" },
  ARCHIVED: { label: "Arquivada", variant: "outline" },
};

const CampanhasPage = () => {
  const { data: today } = useTodayMetrics();
  const { data: monthData } = useMonthMetrics();
  const { data: metaData, isLoading: metaLoading, error: metaError } = useMetaAds();

  const insights = metaData?.accountInsights;
  const totalSpend = insights ? Number(insights.spend) : 0;
  const totalImpressions = insights ? Number(insights.impressions) : 0;
  const totalClicks = insights ? Number(insights.clicks) : 0;
  const avgCPC = insights ? Number(insights.cpc) : 0;
  const avgCTR = insights ? Number(insights.ctr) : 0;
  const totalReach = insights ? Number(insights.reach) : 0;
  const totalLeads = insights ? getLeadsFromActions(insights.actions) : 0;
  const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;

  // Daily chart data from Meta
  const dailyChart = (metaData?.dailyInsights || []).map(d => ({
    date: new Date(d.date_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    gasto: Number(d.spend),
    cliques: Number(d.clicks),
    impressoes: Number(d.impressions),
    ctr: Number(d.ctr),
  }));

  // Campaign performance table
  const campaignRows = (metaData?.campaignInsights || []).map(c => ({
    name: c.campaign_name,
    spend: Number(c.spend),
    impressions: Number(c.impressions),
    clicks: Number(c.clicks),
    ctr: Number(c.ctr),
    cpc: Number(c.cpc),
    leads: getLeadsFromActions(c.actions),
    reach: Number(c.reach),
  })).sort((a, b) => b.spend - a.spend);

  // Fallback data from local metrics
  const totalInvest = (monthData || []).reduce((s, d) => s + Number(d.custo_por_lead) * Number(d.leads), 0);
  const totalRevenue = (monthData || []).reduce((s, d) => s + Number(d.faturamento_dia), 0);
  const roi = totalInvest > 0 ? ((totalRevenue - totalInvest) / totalInvest * 100) : 0;

  const hasMetaData = !!metaData && !metaError;

  return (
    <PageTransition>
      <DashboardLayout title="Campanhas" subtitle="Gestão de mídia paga e investimentos — Meta Ads" actions={<MetricsForm currentData={today} />}>

        {/* Meta Ads KPIs */}
        {metaLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados da Meta Ads...
          </div>
        )}

        {metaError && (
          <div className="glass-card-hover rounded-lg p-4 border-destructive/30 mb-4">
            <p className="text-sm text-destructive">Erro ao carregar dados da Meta: {(metaError as Error).message}</p>
          </div>
        )}

        {hasMetaData && (
          <>
            <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StaggerItem><MetricCard title="Gasto Total (Meta)" value={formatCurrency(totalSpend)} icon={<DollarSign className="h-5 w-5" />} variant="warning" /></StaggerItem>
              <StaggerItem><MetricCard title="Impressões" value={formatNumber(totalImpressions)} icon={<Eye className="h-5 w-5" />} variant="primary" /></StaggerItem>
              <StaggerItem><MetricCard title="Cliques" value={formatNumber(totalClicks)} icon={<MousePointerClick className="h-5 w-5" />} variant="accent" /></StaggerItem>
              <StaggerItem><MetricCard title="CTR" value={`${avgCTR.toFixed(2)}%`} icon={<TrendingUp className="h-5 w-5" />} variant="success" /></StaggerItem>
            </StaggerContainer>

            <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StaggerItem><MetricCard title="CPC Médio" value={formatCurrency(avgCPC)} icon={<BarChart3 className="h-5 w-5" />} variant="primary" /></StaggerItem>
              <StaggerItem><MetricCard title="Alcance" value={formatNumber(totalReach)} icon={<Users className="h-5 w-5" />} variant="accent" /></StaggerItem>
              <StaggerItem><MetricCard title="Leads (Meta)" value={formatNumber(totalLeads)} icon={<Target className="h-5 w-5" />} variant="success" /></StaggerItem>
              <StaggerItem><MetricCard title="Custo por Lead" value={formatCurrency(costPerLead)} icon={<DollarSign className="h-5 w-5" />} variant={costPerLead > 50 ? "warning" : "success"} /></StaggerItem>
            </StaggerContainer>
          </>
        )}

        {/* Métricas locais */}
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><MetricCard title="Investimento (local)" value={formatCurrency(totalInvest)} icon={<Megaphone className="h-5 w-5" />} variant="primary" /></StaggerItem>
          <StaggerItem><MetricCard title="Retorno Total" value={formatCurrency(totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} variant="accent" /></StaggerItem>
          <StaggerItem><MetricCard title="ROI" value={`${roi.toFixed(1)}%`} icon={<BarChart3 className="h-5 w-5" />} variant={roi > 0 ? "success" : "warning"} /></StaggerItem>
          <StaggerItem><MetricCard title="ROAS Hoje" value={`${(today?.roas || 0).toFixed(2)}x`} icon={<MousePointerClick className="h-5 w-5" />} variant="success" /></StaggerItem>
        </StaggerContainer>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Daily spend chart from Meta */}
          {hasMetaData && dailyChart.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card-hover rounded-lg p-5">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Gasto Diário — Meta Ads</h3>
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

          {/* Daily clicks chart */}
          {hasMetaData && dailyChart.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card-hover rounded-lg p-5">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Cliques Diários — Meta Ads</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: grid }} />
                  <YAxis tick={axisStyle} axisLine={{ stroke: grid }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                  <Area type="monotone" dataKey="cliques" fill="hsl(210, 70%, 50%)" fillOpacity={0.15} stroke="hsl(210, 70%, 50%)" strokeWidth={2} name="Cliques" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>

        {/* Campaign performance table */}
        {hasMetaData && campaignRows.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card-hover rounded-lg p-5">
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Performance por Campanha</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campanha</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Gasto</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Impressões</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Cliques</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">CTR</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">CPC</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignRows.map((c, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 pr-4 font-medium text-foreground max-w-[200px] truncate">{c.name}</td>
                      <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(c.spend)}</td>
                      <td className="py-3 pr-4 text-right text-muted-foreground">{formatNumber(c.impressions)}</td>
                      <td className="py-3 pr-4 text-right text-muted-foreground">{formatNumber(c.clicks)}</td>
                      <td className="py-3 pr-4 text-right text-muted-foreground">{c.ctr.toFixed(2)}%</td>
                      <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(c.cpc)}</td>
                      <td className="py-3 text-right font-medium text-foreground">{c.leads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Campaign list with status */}
        {hasMetaData && (metaData?.campaigns || []).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card-hover rounded-lg p-5">
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Campanhas Ativas</h3>
            <div className="space-y-2">
              {(metaData?.campaigns || []).map((c) => {
                const st = statusMap[c.status] || { label: c.status, variant: "outline" as const };
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.objective?.replace(/_/g, " ") || "—"}</p>
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
