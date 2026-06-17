import { useMemo } from "react";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useCursosDados } from "@/hooks/useCursosDados";
import DashboardLayout from "@/components/DashboardLayout";
import DateFilterBar from "@/components/DateFilterBar";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import MetricCard from "@/components/MetricCard";
import RoasGauge from "@/components/charts/RoasGauge";
import { TrendingUp, DollarSign, Target, BarChart3, Users, GraduationCap, BookOpen, Award } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Bar, ComposedChart, Area, PieChart, Pie, Cell, BarChart } from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const tooltipStyle = { backgroundColor: "hsl(260, 22%, 12%)", border: "1px solid hsl(260, 15%, 22%)", borderRadius: "12px", color: "hsl(210, 40%, 96%)", fontSize: 12 };
const axisStyle = { fontSize: 11, fill: "hsl(240, 5%, 55%)" };
const gridColor = "hsl(260, 15%, 18%)";

const CHART_COLORS = ["hsl(270, 70%, 60%)", "hsl(174, 75%, 48%)", "hsl(45, 93%, 58%)", "hsl(340, 75%, 55%)", "hsl(210, 70%, 55%)"];

const PerformancePage = () => {
  const filter = useDateFilter();
  const monthData = filter.metrics;
  const { data: allCursos = [] } = useCursosDados();

  // Filter cursos by same date range
  const cursosFiltrados = useMemo(() => {
    const range = filter.range;
    if (!range) return allCursos;
    return allCursos.filter((c) => c.data >= range.start && c.data <= range.end);
  }, [allCursos, filter.range]);

  const daysWithData = monthData.filter(d => Number(d.faturamento_dia) > 0 || Number(d.leads) > 0);
  const totalFat = daysWithData.reduce((s, d) => s + Number(d.faturamento_dia), 0);
  const totalFatMarcado = daysWithData.reduce((s, d) => s + Number(d.faturamento_marcado || 0), 0);
  const totalFatTotal = totalFat + totalFatMarcado;
  const totalAds = daysWithData.reduce((s, d) => s + Number(d.ads || 0), 0);
  const totalLeads = daysWithData.reduce((s, d) => s + Number(d.leads), 0);
  const totalMql = daysWithData.reduce((s, d) => s + Number(d.lead_mql), 0);
  const totalCursoFeito = daysWithData.reduce((s, d) => s + Number(d.curso_feito || 0), 0);
  const totalCursoMarcado = daysWithData.reduce((s, d) => s + Number(d.curso_marcado || 0), 0);

  const totalComissaoVendas = daysWithData.reduce((s, d) => s + Number(d.faturamento_dia) * 0.15, 0);
  const totalComissaoCurso = cursosFiltrados.reduce((s, c) => s + c.comissao_extra, 0);
  const fatLiquido = totalFatTotal - totalAds - totalComissaoVendas - totalComissaoCurso;

  const avgRoas = totalAds > 0 ? (totalFatMarcado + totalFat) / totalAds : 0;
  const avgCac = totalCursoFeito > 0 ? totalAds / totalCursoFeito : 0;
  const avgCpl = totalLeads > 0 ? totalAds / totalLeads : 0;
  const convRate = totalLeads > 0 ? (totalCursoMarcado / totalLeads) * 100 : 0;
  const mqlRate = totalLeads > 0 ? (totalMql / totalLeads) * 100 : 0;
  const ticketMedioFeito = totalCursoFeito > 0 ? totalFat / totalCursoFeito : 0;
  const ticketMedioMarcado = totalCursoMarcado > 0 ? totalFatMarcado / totalCursoMarcado : 0;

  // Cursos dados metrics
  const cursosMetrics = useMemo(() => {
    const total = cursosFiltrados.length;
    const alunosUnicos = new Set(cursosFiltrados.map((c) => c.nome_aluno.trim().toLowerCase())).size;
    const mediaPorAluno = alunosUnicos > 0 ? total / alunosUnicos : 0;
    const meses = new Set(cursosFiltrados.map((c) => c.data.substring(0, 7))).size || 1;
    const mediaMensal = total / meses;
    const totalComissao = cursosFiltrados.reduce((s, c) => s + c.comissao_extra, 0);
    return { total, alunosUnicos, mediaPorAluno, mediaMensal, totalComissao };
  }, [cursosFiltrados]);

  // Commission per course type
  const comissaoPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    cursosFiltrados.forEach((c) => {
      const label = c.tipo_curso.replace("Curso de ", "");
      map[label] = (map[label] || 0) + c.comissao_extra;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([tipo, valor]) => ({ tipo, valor }));
  }, [cursosFiltrados]);

  const cursosPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    cursosFiltrados.forEach((c) => { const l = c.tipo_curso.replace("Curso de ", ""); map[l] = (map[l] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [cursosFiltrados]);

  const rankingAlunos = useMemo(() => {
    const map: Record<string, number> = {};
    cursosFiltrados.forEach((c) => { const k = c.nome_aluno.trim(); map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nome, cursos]) => ({ nome, cursos }));
  }, [cursosFiltrados]);

  const cursosPorInstrutor = useMemo(() => {
    const map: Record<string, number> = {};
    cursosFiltrados.forEach((c) => { map[c.instrutor.trim()] = (map[c.instrutor.trim()] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([instrutor, total]) => ({ instrutor, total }));
  }, [cursosFiltrados]);

  const dailyHistory = monthData.map((d) => ({
    date: new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit" }),
    roas: Number(d.roas),
    cac: Number(d.cac),
    cpl: Number(d.custo_por_lead),
    leads: Number(d.leads),
    mql: Number(d.lead_mql),
    faturamento: Number(d.faturamento_dia),
    ads: Number(d.ads || 0),
  }));

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border/40 bg-card p-3 shadow-xl">
        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs text-muted-foreground">{p.name}: <span className="font-semibold text-foreground">{p.value}</span></p>
        ))}
      </div>
    );
  };

  return (
    <PageTransition>
      <DashboardLayout title="Performance" subtitle="Indicadores de retorno e eficiência">
        <DateFilterBar mode={filter.mode} onModeChange={filter.setMode} label={filter.label} onBack={filter.goBack} onForward={filter.goForward} />

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><MetricCard title="ROAS Médio" value={`${avgRoas.toFixed(2)}x`} icon={<TrendingUp className="h-5 w-5" />} variant="success" /></StaggerItem>
          <StaggerItem><MetricCard title="CAC Médio" value={formatCurrency(avgCac)} icon={<DollarSign className="h-5 w-5" />} variant="warning" /></StaggerItem>
          <StaggerItem><MetricCard title="CPL Médio" value={formatCurrency(avgCpl)} icon={<Target className="h-5 w-5" />} variant="accent" /></StaggerItem>
          <StaggerItem><MetricCard title="Taxa Conversão" value={`${convRate.toFixed(1)}%`} subtitle="Curso Marcado / Leads" icon={<BarChart3 className="h-5 w-5" />} variant="primary" /></StaggerItem>
          <StaggerItem><MetricCard title="Taxa MQL" value={`${mqlRate.toFixed(1)}%`} subtitle="MQL / Leads" icon={<BarChart3 className="h-5 w-5" />} variant="accent" /></StaggerItem>
        </StaggerContainer>

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><MetricCard title="Faturamento Feito" value={totalFat} icon={<TrendingUp className="h-5 w-5" />} variant="primary" countUp prefix="R$ " decimals={0} /></StaggerItem>
          <StaggerItem><MetricCard title="Faturamento Marcado" value={totalFatMarcado} icon={<TrendingUp className="h-5 w-5" />} variant="accent" countUp prefix="R$ " decimals={0} /></StaggerItem>
          <StaggerItem><MetricCard title="Faturamento Total" value={totalFatTotal} icon={<TrendingUp className="h-5 w-5" />} variant="success" countUp prefix="R$ " decimals={0} /></StaggerItem>
          <StaggerItem><MetricCard title="Faturamento Líquido" value={fatLiquido} subtitle="Total - ADS - Comissões" icon={<DollarSign className="h-5 w-5" />} variant="warning" countUp prefix="R$ " decimals={0} /></StaggerItem>
        </StaggerContainer>

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><MetricCard title="Investido (ADS)" value={totalAds} icon={<DollarSign className="h-5 w-5" />} countUp prefix="R$ " decimals={2} /></StaggerItem>
          <StaggerItem><MetricCard title="Ticket Médio (Feito)" value={ticketMedioFeito} subtitle="Fat. Feito / Cursos Feitos" icon={<DollarSign className="h-5 w-5" />} variant="primary" countUp prefix="R$ " decimals={0} /></StaggerItem>
          <StaggerItem><MetricCard title="Ticket Médio (Marcado)" value={ticketMedioMarcado} subtitle="Fat. Marcado / Cursos Marcados" icon={<DollarSign className="h-5 w-5" />} variant="accent" countUp prefix="R$ " decimals={0} /></StaggerItem>
        </StaggerContainer>

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><MetricCard title="Leads / MQL" value={`${totalLeads} / ${totalMql}`} icon={<Users className="h-5 w-5" />} variant="accent" /></StaggerItem>
          <StaggerItem><MetricCard title="Cursos Marcados" value={totalCursoMarcado} icon={<GraduationCap className="h-5 w-5" />} variant="warning" countUp /></StaggerItem>
          <StaggerItem><MetricCard title="Cursos Feitos" value={totalCursoFeito} icon={<GraduationCap className="h-5 w-5" />} countUp /></StaggerItem>
        </StaggerContainer>

        <div className="grid gap-5 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <RoasGauge roas={avgRoas} />
          </motion.div>

          {dailyHistory.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
              <h3 className="font-display text-sm font-semibold text-foreground relative z-10 mb-4">Evolução do ROAS</h3>
              <div className="relative z-10">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: gridColor }} />
                    <YAxis tick={axisStyle} axisLine={{ stroke: gridColor }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="roas" stroke="hsl(142, 70%, 45%)" strokeWidth={2.5} dot={{ fill: "hsl(142, 70%, 45%)", r: 3 }} name="ROAS" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </div>

        {dailyHistory.length > 1 && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
              <h3 className="font-display text-sm font-semibold text-foreground relative z-10 mb-4">CAC vs CPL Diário</h3>
              <div className="relative z-10">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dailyHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: gridColor }} />
                    <YAxis tick={axisStyle} axisLine={{ stroke: gridColor }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                    <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span style={{ color: "hsl(240, 5%, 70%)", fontSize: 11 }}>{v}</span>} />
                    <Line type="monotone" dataKey="cac" stroke="hsl(38, 92%, 50%)" strokeWidth={2.5} dot={{ fill: "hsl(38, 92%, 50%)", r: 3 }} name="CAC" />
                    <Line type="monotone" dataKey="cpl" stroke="hsl(280, 65%, 60%)" strokeWidth={2} dot={{ fill: "hsl(280, 65%, 60%)", r: 3 }} name="CPL" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
              <h3 className="font-display text-sm font-semibold text-foreground relative z-10 mb-4">Faturamento vs Investimento (ADS)</h3>
              <div className="relative z-10">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={dailyHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: gridColor }} />
                    <YAxis tick={axisStyle} axisLine={{ stroke: gridColor }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                    <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span style={{ color: "hsl(240, 5%, 70%)", fontSize: 11 }}>{v}</span>} />
                    <Bar dataKey="ads" fill="hsl(0, 70%, 55%)" opacity={0.6} radius={[3, 3, 0, 0]} name="ADS Investido" />
                    <Line type="monotone" dataKey="faturamento" stroke="hsl(142, 70%, 45%)" strokeWidth={2.5} dot={{ fill: "hsl(142, 70%, 45%)", r: 3 }} name="Faturamento" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-card rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
              <h3 className="font-display text-sm font-semibold text-foreground relative z-10 mb-4">Leads vs MQL Diário</h3>
              <div className="relative z-10">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={dailyHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: gridColor }} />
                    <YAxis tick={axisStyle} axisLine={{ stroke: gridColor }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span style={{ color: "hsl(240, 5%, 70%)", fontSize: 11 }}>{v}</span>} />
                    <Area type="monotone" dataKey="leads" fill="hsl(36, 95%, 55%)" fillOpacity={0.15} stroke="hsl(36, 95%, 55%)" strokeWidth={2} name="Leads" />
                    <Bar dataKey="mql" fill="hsl(168, 65%, 48%)" opacity={0.7} radius={[3, 3, 0, 0]} name="MQL" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </>
        )}

        {/* Cursos Dados Section */}
        <div className="mt-2">
          <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" /> Cursos Dados
          </h2>

          <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-5">
            <StaggerItem><MetricCard title="Total Cursos" value={cursosMetrics.total} icon={<BookOpen className="h-5 w-5" />} variant="primary" countUp /></StaggerItem>
            <StaggerItem><MetricCard title="Alunos Únicos" value={cursosMetrics.alunosUnicos} icon={<Users className="h-5 w-5" />} variant="accent" countUp /></StaggerItem>
            <StaggerItem><MetricCard title="Cursos / Aluno" value={cursosMetrics.mediaPorAluno.toFixed(1)} subtitle="Média por pessoa" icon={<TrendingUp className="h-5 w-5" />} variant="success" /></StaggerItem>
            <StaggerItem><MetricCard title="Média Mensal" value={cursosMetrics.mediaMensal.toFixed(1)} subtitle="Cursos por mês" icon={<GraduationCap className="h-5 w-5" />} variant="warning" /></StaggerItem>
            <StaggerItem><MetricCard title="Comissão Extra" value={cursosMetrics.totalComissao} icon={<DollarSign className="h-5 w-5" />} variant="primary" countUp prefix="R$ " decimals={2} /></StaggerItem>
          </StaggerContainer>

          {/* Commission per course type */}
          {comissaoPorTipo.length > 0 && (
            <div className="mt-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-success" /> Comissão por Tipo de Curso
              </h3>
              <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {comissaoPorTipo.map((item) => (
                  <StaggerItem key={item.tipo}>
                    <MetricCard
                      title={item.tipo}
                      value={item.valor}
                      icon={<GraduationCap className="h-5 w-5" />}
                      variant="success"
                      countUp
                      prefix="R$ "
                      decimals={2}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Pie: Cursos por Tipo */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="glass-card rounded-xl p-5 border border-border/20">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Cursos por Tipo</h3>
              {cursosPorTipo.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={cursosPorTipo} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                      {cursosPorTipo.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-[10px] text-muted-foreground">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
              )}
            </motion.div>

            {/* Bar: Ranking Alunos */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="glass-card rounded-xl p-5 border border-border/20">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <Award className="h-3.5 w-3.5 text-accent" /> Ranking Alunos (Top 8)
              </h3>
              {rankingAlunos.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rankingAlunos} layout="vertical" margin={{ left: 0, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" tick={axisStyle} allowDecimals={false} />
                    <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 10, fill: "hsl(260, 10%, 70%)" }} tickFormatter={(v: string) => v.length > 12 ? v.substring(0, 12) + "…" : v} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="cursos" name="Cursos" fill="hsl(174, 75%, 48%)" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
              )}
            </motion.div>

            {/* Bar: Cursos por Instrutor */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }} className="glass-card rounded-xl p-5 border border-border/20">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Cursos por Instrutor</h3>
              {cursosPorInstrutor.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cursosPorInstrutor} margin={{ left: 0, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="instrutor" tick={{ fontSize: 10, fill: "hsl(260, 10%, 70%)" }} tickFormatter={(v: string) => v.length > 10 ? v.substring(0, 10) + "…" : v} />
                    <YAxis tick={axisStyle} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total" name="Cursos" fill="hsl(270, 70%, 60%)" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
              )}
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
};

export default PerformancePage;
