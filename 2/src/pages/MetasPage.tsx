import { useMemo } from "react";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useTodayMetrics } from "@/hooks/useMetrics";
import DashboardLayout from "@/components/DashboardLayout";
import DateFilterBar from "@/components/DateFilterBar";
import GoalProgress from "@/components/GoalProgress";
import MetricsForm from "@/components/MetricsForm";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import MetricCard from "@/components/MetricCard";
import { Target, TrendingUp, GraduationCap, CalendarDays, Globe, MapPin, Database, ArrowUpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

/** Count weekdays Mon-Sat in a given month/year */
function countWorkingDays(year: number, month: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(year, month, d).getDay(); // 0=Sun
    if (dow >= 1 && dow <= 6) count++; // Mon-Sat
  }
  return count;
}

/** Count remaining working days (Mon-Sat) from a date to end of month (inclusive) */
function remainingWorkingDays(fromDate: Date) {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = fromDate.getDate(); d <= lastDay; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow >= 1 && dow <= 6) count++;
  }
  return count;
}

const MetasPage = () => {
  const { data: today } = useTodayMetrics();
  const filter = useDateFilter();
  const periodData = filter.metrics;
  const fullMonthData = filter.monthMetrics;
  const fullMonthVendas = filter.monthVendas;

  const dedup = (data: typeof periodData) => {
    const map = new Map<string, typeof periodData[0]>();
    data.forEach((d) => {
      const existing = map.get(d.date);
      if (!existing) {
        map.set(d.date, { ...d });
      } else {
        map.set(d.date, {
          ...existing,
          faturamento_dia: Number(existing.faturamento_dia) + Number(d.faturamento_dia),
          curso_feito: (Number(existing.curso_feito) || 0) + (Number(d.curso_feito) || 0),
          curso_marcado: (Number(existing.curso_marcado) || 0) + (Number(d.curso_marcado) || 0),
          ads: Number(existing.ads) + Number(d.ads),
          leads: (Number(existing.leads) || 0) + (Number(d.leads) || 0),
          meta_mensal_prevista: Math.max(Number(existing.meta_mensal_prevista), Number(d.meta_mensal_prevista)),
          meta_diaria_prevista: Math.max(Number(existing.meta_diaria_prevista), Number(d.meta_diaria_prevista)),
          meta_diaria_realizada: Math.max(Number(existing.meta_diaria_realizada || 0), Number(d.meta_diaria_realizada || 0)),
          super_meta_mensal: Math.max(Number(existing.super_meta_mensal || 0), Number(d.super_meta_mensal || 0)),
          super_meta_diaria: Math.max(Number(existing.super_meta_diaria || 0), Number(d.super_meta_diaria || 0)),
          meta_cursos: Math.max(Number(existing.meta_cursos || 0), Number(d.meta_cursos || 0)),
          meta_site: Math.max(Number(existing.meta_site || 0), Number(d.meta_site || 0)),
          meta_negocio_local: Math.max(Number(existing.meta_negocio_local || 0), Number(d.meta_negocio_local || 0)),
          meta_crm: Math.max(Number(existing.meta_crm || 0), Number(d.meta_crm || 0)),
          meta_upsell: Math.max(Number(existing.meta_upsell || 0), Number(d.meta_upsell || 0)),
          valor_cursos: Math.max(Number(existing.valor_cursos || 0), Number(d.valor_cursos || 0)),
          valor_site: Math.max(Number(existing.valor_site || 0), Number(d.valor_site || 0)),
          valor_negocio_local: Math.max(Number(existing.valor_negocio_local || 0), Number(d.valor_negocio_local || 0)),
          valor_crm: Math.max(Number(existing.valor_crm || 0), Number(d.valor_crm || 0)),
          valor_upsell: Math.max(Number(existing.valor_upsell || 0), Number(d.valor_upsell || 0)),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const uniquePeriod = useMemo(() => dedup(periodData), [periodData]);
  const uniqueMonth = useMemo(() => dedup(fullMonthData), [fullMonthData]);
  const approvedMonthVendas = useMemo(
    () => fullMonthVendas.filter((v) => v.status === "aprovada"),
    [fullMonthVendas]
  );
  const approvedMonthProducts = useMemo(
    () => approvedMonthVendas.filter((v) => Boolean(v.produto?.trim())),
    [approvedMonthVendas]
  );

  const approvedPeriodVendas = useMemo(
    () => filter.vendas.filter((v) => v.status === "aprovada"),
    [filter.vendas]
  );
  const periodRealized = approvedPeriodVendas.reduce((s, v) => s + Number(v.valor || 0), 0);
  const monthRealized = approvedMonthVendas.reduce((s, v) => s + Number(v.valor || 0), 0);

  const dayWithMeta = [...uniqueMonth].reverse().find((d) => Number(d.meta_mensal_prevista) > 0);
  const dayWithDiaria = [...uniqueMonth].reverse().find((d) => Number(d.meta_diaria_prevista) > 0);
  const dayWithSuperMensal = [...uniqueMonth].reverse().find((d) => Number(d.super_meta_mensal) > 0);
  const dayWithSuperDiaria = [...uniqueMonth].reverse().find((d) => Number(d.super_meta_diaria) > 0);
  const metaMensal = dayWithMeta?.meta_mensal_prevista || today?.meta_mensal_prevista || 0;
  const metaDiariaPrevista = dayWithDiaria?.meta_diaria_prevista || today?.meta_diaria_prevista || 0;
  const superMetaMensal = dayWithSuperMensal?.super_meta_mensal || today?.super_meta_mensal || 0;
  const superMetaDiaria = dayWithSuperDiaria?.super_meta_diaria || today?.super_meta_diaria || 0;
  const latestDay = uniquePeriod.length > 0 ? uniquePeriod[uniquePeriod.length - 1] : null;
  const metaDiariaRealizada = latestDay?.meta_diaria_realizada || today?.meta_diaria_realizada || 0;

  const svcSource = [...uniqueMonth].reverse();
  const svcMetaCursos = svcSource.find((d) => Number(d.meta_cursos) > 0)?.meta_cursos || today?.meta_cursos || 0;
  const svcMetaSite = svcSource.find((d) => Number(d.meta_site) > 0)?.meta_site || today?.meta_site || 0;
  const svcMetaNL = svcSource.find((d) => Number(d.meta_negocio_local) > 0)?.meta_negocio_local || today?.meta_negocio_local || 0;
  const svcMetaCRM = svcSource.find((d) => Number(d.meta_crm) > 0)?.meta_crm || today?.meta_crm || 0;
  const svcMetaUpsell = svcSource.find((d) => Number(d.meta_upsell) > 0)?.meta_upsell || today?.meta_upsell || 0;
  const svcValCursos = svcSource.find((d) => Number(d.valor_cursos) > 0)?.valor_cursos || today?.valor_cursos || 0;
  const svcValSite = svcSource.find((d) => Number(d.valor_site) > 0)?.valor_site || today?.valor_site || 0;
  const svcValNL = svcSource.find((d) => Number(d.valor_negocio_local) > 0)?.valor_negocio_local || today?.valor_negocio_local || 0;
  const svcValCRM = svcSource.find((d) => Number(d.valor_crm) > 0)?.valor_crm || today?.valor_crm || 0;
  const svcValUpsell = svcSource.find((d) => Number(d.valor_upsell) > 0)?.valor_upsell || today?.valor_upsell || 0;

  const calcData = useMemo(() => {
    const now = new Date();
    const year = filter.anchor.getFullYear();
    const month = filter.anchor.getMonth();
    const totalWorkDays = countWorkingDays(year, month);
    const metaDiaPorDiaUtil = totalWorkDays > 0 ? Number(metaMensal) / totalWorkDays : 0;

    const refDate = year === now.getFullYear() && month === now.getMonth()
      ? now
      : new Date(year, month, 1);
    const remaining = remainingWorkingDays(refDate);

    const faltante = Math.max(0, Number(metaMensal) - monthRealized);
    const metaDiariaAjustada = remaining > 0 ? faltante / remaining : 0;

    const totalCursos = approvedMonthProducts.length;

    const cursosParaMeta = Math.max(0, Number(svcMetaCursos) - totalCursos);
    const cursosPorDia = remaining > 0 ? Math.ceil(cursosParaMeta / remaining) : 0;


    let periodMeta = Number(metaMensal);
    if (filter.mode === "dia") {
      periodMeta = metaDiaPorDiaUtil;
    } else if (filter.mode === "semana") {
      const weekWorkDays = uniquePeriod.filter((d) => {
        const dow = new Date(d.date + "T12:00:00").getDay();
        return dow >= 1 && dow <= 6;
      }).length;
      periodMeta = metaDiaPorDiaUtil * weekWorkDays;
    }

    return {
      totalWorkDays,
      metaDiaPorDiaUtil,
      remaining,
      faltante,
      metaDiariaAjustada,
      cursosParaMeta,
      cursosPorDia,
      totalCursos,
      periodMeta,
    };
  }, [approvedMonthProducts, filter.anchor, filter.mode, metaMensal, monthRealized, periodRealized, uniquePeriod, svcMetaCursos]);

  const pctAtingido = calcData.periodMeta > 0 ? ((periodRealized / calcData.periodMeta) * 100).toFixed(1) : "0";

  const weeklyData = [];
  for (let w = 0; w < Math.ceil(uniqueMonth.length / 7); w++) {
    const weekDays = uniqueMonth.slice(w * 7, (w + 1) * 7);
    const weekRevenue = weekDays.reduce((s, d) => s + Number(d.faturamento_dia), 0);
    const weekMeta = weekDays.reduce((s, d) => s + Number(d.meta_diaria_prevista), 0);
    weeklyData.push({ name: `Sem ${w + 1}`, realizado: weekRevenue, meta: weekMeta });
  }

  return (
    <PageTransition>
      <DashboardLayout title="Metas" subtitle="Acompanhe suas metas mensais e diárias" actions={<MetricsForm currentData={today} />}>
        <DateFilterBar mode={filter.mode} onModeChange={filter.setMode} label={filter.label} onBack={filter.goBack} onForward={filter.goForward} />

        <StaggerContainer className="grid gap-5 sm:grid-cols-2">
          <StaggerItem>
            <GoalProgress label={filter.mode === "dia" ? "Meta do Dia" : filter.mode === "semana" ? "Meta da Semana" : "Meta Mensal"} prevista={calcData.periodMeta} realizada={periodRealized} superMeta={filter.mode === "mes" ? Number(superMetaMensal) : undefined} />
          </StaggerItem>
          <StaggerItem>
            <GoalProgress label="Meta Diária (Prevista)" prevista={metaDiariaPrevista} realizada={metaDiariaRealizada} superMeta={Number(superMetaDiaria) || undefined} />
          </StaggerItem>
        </StaggerContainer>

        <StaggerContainer className="grid gap-4 sm:grid-cols-3" delay={0.2}>
          <StaggerItem>
            <MetricCard title="Meta do Período" value={formatCurrency(calcData.periodMeta)} icon={<Target className="h-5 w-5" />} variant="primary" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Realizado" value={formatCurrency(periodRealized)} icon={<TrendingUp className="h-5 w-5" />} variant="accent" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="% Atingido" value={`${pctAtingido}%`} icon={<Target className="h-5 w-5" />} variant="success" />
          </StaggerItem>
        </StaggerContainer>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Projeção Diária (Seg–Sáb)</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Meta/Dia Útil"
              value={formatCurrency(calcData.metaDiaPorDiaUtil)}
              subtitle={`${calcData.totalWorkDays} dias úteis no mês`}
              icon={<CalendarDays className="h-5 w-5" />}
              variant="primary"
            />
            <MetricCard
              title="Meta Diária Ajustada"
              value={formatCurrency(calcData.metaDiariaAjustada)}
              subtitle={`${calcData.remaining} dias úteis restantes`}
              icon={<TrendingUp className="h-5 w-5" />}
              variant={calcData.metaDiariaAjustada > calcData.metaDiaPorDiaUtil ? "accent" : "primary"}
            />
            <MetricCard
              title="Faltante p/ Meta"
              value={formatCurrency(calcData.faltante)}
              icon={<Target className="h-5 w-5" />}
            />
            <MetricCard
              title="Cursos p/ Bater Meta"
              value={`${calcData.cursosParaMeta}`}
              subtitle={calcData.cursosPorDia > 0 ? `~${calcData.cursosPorDia} por dia útil` : "Meta atingida"}
              icon={<GraduationCap className="h-5 w-5" />}
              variant="accent"
            />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Metas por Serviço</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Cursos", metaQty: svcMetaCursos, metaVal: svcValCursos, source: "produto" as const, icon: <GraduationCap className="h-5 w-5" />, variant: "accent" as const },
              { label: "Site", metaQty: svcMetaSite, metaVal: svcValSite, source: "servico" as const, servico: "Site", icon: <Globe className="h-5 w-5" />, variant: "primary" as const },
              { label: "Negócio Local", metaQty: svcMetaNL, metaVal: svcValNL, source: "servico" as const, servico: "Negócio Local", icon: <MapPin className="h-5 w-5" />, variant: "primary" as const },
              { label: "CRM", metaQty: svcMetaCRM, metaVal: svcValCRM, source: "servico" as const, servico: "CRM", icon: <Database className="h-5 w-5" />, variant: "primary" as const },
              { label: "Upsell", metaQty: svcMetaUpsell, metaVal: svcValUpsell, source: "servico" as const, servico: "Upsell", icon: <ArrowUpCircle className="h-5 w-5" />, variant: "accent" as const },
            ].map((svc) => {
              const vendasRelacionadas = svc.source === "produto"
                ? approvedMonthProducts
                : approvedMonthVendas.filter((v) => v.servico === svc.servico);
              const realizado = vendasRelacionadas.length;
              const realizadoValor = vendasRelacionadas.reduce((s, v) => s + Number(v.valor || 0), 0);
              const comissoes = vendasRelacionadas.reduce((s, v) => s + Number(v.comissao || 0), 0);
              const valorLiquido = realizadoValor - comissoes;

              return (
                <motion.div
                  key={svc.label}
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`glass-card-hover rounded-lg p-5 border-l-2 ${svc.variant === "accent" ? "border-l-accent" : "border-l-primary"} relative overflow-hidden`}
                >
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${svc.variant === "accent" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                        {svc.icon}
                      </div>
                      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{svc.label}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground/50">Meta Valor</p>
                        <p className="font-display text-base font-bold text-foreground">{formatCurrency(Number(svc.metaVal))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/50">Meta Qtd</p>
                        <p className="font-display text-base font-bold text-foreground">{Number(svc.metaQty)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/50">Valor Total</p>
                        <p className="font-display text-sm font-semibold text-accent">{formatCurrency(realizadoValor)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/50">Valor Líquido</p>
                        <p className="font-display text-sm font-semibold text-accent">{formatCurrency(valorLiquido)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/50">Feitos</p>
                        <p className="font-display text-sm font-semibold text-accent">{realizado}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {filter.mode === "mes" && weeklyData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card-hover rounded-lg p-5 relative overflow-hidden group">
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Meta vs Realizado por Semana</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyData} barGap={8}>
                <defs>
                  <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(174, 75%, 48%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(174, 75%, 48%)" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 18%, 14%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(260, 10%, 45%)" }} axisLine={{ stroke: "hsl(260, 18%, 14%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(260, 10%, 45%)" }} axisLine={{ stroke: "hsl(260, 18%, 14%)" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(260, 22%, 10%)", border: "1px solid hsl(260, 18%, 18%)", borderRadius: "8px", color: "hsl(240, 10%, 93%)", fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="meta" fill="url(#metaGrad)" radius={[4, 4, 0, 0]} name="Meta" />
                <Bar dataKey="realizado" fill="url(#realGrad)" radius={[4, 4, 0, 0]} name="Realizado" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
};

export default MetasPage;
