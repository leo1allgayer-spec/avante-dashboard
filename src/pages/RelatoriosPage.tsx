import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import MetricCard from "@/components/MetricCard";
import { useMonthMetrics, useAvailableMonths } from "@/hooks/useMetrics";
import { motion } from "framer-motion";
import { FileBarChart, Calendar, TrendingUp, DollarSign, ChevronLeft, ChevronRight, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend, ComposedChart, Area } from "recharts";

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const tooltipStyle = { backgroundColor: "hsl(260, 22%, 12%)", border: "1px solid hsl(260, 15%, 22%)", borderRadius: "12px", color: "hsl(210, 40%, 96%)", fontSize: 12 };
const axisStyle = { fontSize: 11, fill: "hsl(240, 5%, 55%)" };
const grid = "hsl(260, 15%, 18%)";

const RelatoriosPage = () => {
  const { data: availableMonths } = useAvailableMonths();
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);

  useEffect(() => {
    if (availableMonths && availableMonths.length > 0 && !selectedMonth) {
      const [y, m] = availableMonths[0].split("-");
      setSelectedMonth({ year: parseInt(y), month: parseInt(m) - 1 });
    }
  }, [availableMonths, selectedMonth]);

  const viewYear = selectedMonth?.year ?? new Date().getFullYear();
  const viewMonth = selectedMonth?.month ?? new Date().getMonth();

  const { data: monthData } = useMonthMetrics(viewYear, viewMonth);

  const goToPrevMonth = () => {
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    setSelectedMonth({ year: y, month: m });
  };
  const goToNextMonth = () => {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    setSelectedMonth({ year: y, month: m });
  };

  const daysWithData = (monthData || []).filter(d => Number(d.faturamento_dia) > 0 || Number(d.leads) > 0);
  const totalFat = daysWithData.reduce((s, d) => s + Number(d.faturamento_dia), 0);
  const totalAds = daysWithData.reduce((s, d) => s + Number(d.ads || 0), 0);
  const totalLeads = daysWithData.reduce((s, d) => s + Number(d.leads), 0);
  const totalMql = daysWithData.reduce((s, d) => s + Number(d.lead_mql), 0);
  const totalCursoFeito = daysWithData.reduce((s, d) => s + Number(d.curso_feito || 0), 0);
  const totalCursoMarcado = daysWithData.reduce((s, d) => s + Number(d.curso_marcado || 0), 0);
  const totalFatMarcado = daysWithData.reduce((s, d) => s + Number(d.faturamento_marcado || 0), 0);
  const avgRoas = totalAds > 0 ? (totalFatMarcado + totalFat) / totalAds : 0;
  const avgCpl = totalLeads > 0 ? totalAds / totalLeads : 0;

  const weeklyData = Array.from({ length: 5 }, (_, w) => {
    const week = daysWithData.slice(w * 7, (w + 1) * 7);
    if (week.length === 0) return null;
    return {
      semana: `Sem ${w + 1}`,
      faturamento: week.reduce((s, d) => s + Number(d.faturamento_dia), 0),
      ads: week.reduce((s, d) => s + Number(d.ads || 0), 0),
      leads: week.reduce((s, d) => s + Number(d.leads), 0),
      mql: week.reduce((s, d) => s + Number(d.lead_mql), 0),
      cursoFeito: week.reduce((s, d) => s + Number(d.curso_feito || 0), 0),
    };
  }).filter(Boolean);

  const dailyHistory = (monthData || []).map((d) => ({
    date: new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit" }),
    faturamento: Number(d.faturamento_dia),
    ads: Number(d.ads || 0),
    leads: Number(d.leads),
    mql: Number(d.lead_mql),
  }));

  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  return (
    <PageTransition>
      <DashboardLayout title="Relatórios" subtitle="Resumo consolidado do período">
        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 mb-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-display text-sm font-semibold text-foreground min-w-[160px] text-center">{monthLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><MetricCard title="Faturamento Total" value={totalFat} icon={<TrendingUp className="h-5 w-5" />} variant="primary" countUp prefix="R$ " decimals={0} /></StaggerItem>
          <StaggerItem><MetricCard title="Investido (ADS)" value={formatCurrency(totalAds)} icon={<DollarSign className="h-5 w-5" />} /></StaggerItem>
          <StaggerItem><MetricCard title="ROAS Médio" value={`${avgRoas.toFixed(2)}x`} icon={<TrendingUp className="h-5 w-5" />} variant="success" /></StaggerItem>
          <StaggerItem><MetricCard title="Dias Registrados" value={daysWithData.length} icon={<Calendar className="h-5 w-5" />} countUp /></StaggerItem>
        </StaggerContainer>

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><MetricCard title="Total Leads" value={totalLeads} icon={<Users className="h-5 w-5" />} variant="accent" countUp /></StaggerItem>
          <StaggerItem><MetricCard title="Total MQL" value={totalMql} icon={<Users className="h-5 w-5" />} variant="accent" countUp /></StaggerItem>
          <StaggerItem><MetricCard title="CPL Médio" value={formatCurrency(avgCpl)} icon={<DollarSign className="h-5 w-5" />} variant="warning" /></StaggerItem>
          <StaggerItem><MetricCard title="Cursos Feitos" value={totalCursoFeito} icon={<GraduationCap className="h-5 w-5" />} countUp /></StaggerItem>
        </StaggerContainer>

        {/* Faturamento Semanal */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card-hover rounded-lg p-5">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Faturamento vs ADS Semanal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="semana" tick={axisStyle} axisLine={{ stroke: grid }} />
              <YAxis tick={axisStyle} axisLine={{ stroke: grid }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span style={{ color: "hsl(240, 5%, 70%)", fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="faturamento" fill="hsl(36, 95%, 55%)" radius={[4, 4, 0, 0]} opacity={0.85} name="Faturamento" />
              <Bar dataKey="ads" fill="hsl(0, 70%, 55%)" radius={[4, 4, 0, 0]} opacity={0.6} name="ADS" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Faturamento Diário */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card-hover rounded-lg p-5">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Faturamento Diário</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={dailyHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: grid }} />
              <YAxis tick={axisStyle} axisLine={{ stroke: grid }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span style={{ color: "hsl(240, 5%, 70%)", fontSize: 11 }}>{v}</span>} />
              <Area type="monotone" dataKey="faturamento" fill="hsl(36, 95%, 55%)" fillOpacity={0.15} stroke="hsl(36, 95%, 55%)" strokeWidth={2} name="Faturamento" />
              <Bar dataKey="ads" fill="hsl(0, 70%, 55%)" opacity={0.5} radius={[3, 3, 0, 0]} name="ADS" />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Leads vs MQL Semanal */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card-hover rounded-lg p-5">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Leads vs MQL Diário</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={dailyHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: grid }} />
              <YAxis tick={axisStyle} axisLine={{ stroke: grid }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span style={{ color: "hsl(240, 5%, 70%)", fontSize: 11 }}>{v}</span>} />
              <Area type="monotone" dataKey="leads" fill="hsl(36, 95%, 55%)" fillOpacity={0.15} stroke="hsl(36, 95%, 55%)" strokeWidth={2} name="Leads" />
              <Bar dataKey="mql" fill="hsl(168, 65%, 48%)" opacity={0.7} radius={[3, 3, 0, 0]} name="MQL" />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      </DashboardLayout>
    </PageTransition>
  );
};

export default RelatoriosPage;
