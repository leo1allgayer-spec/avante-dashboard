import { useMemo } from "react";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useTodayMetrics } from "@/hooks/useMetrics";
import DashboardLayout from "@/components/DashboardLayout";
import DateFilterBar from "@/components/DateFilterBar";
import MetricsForm from "@/components/MetricsForm";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import MetricCard from "@/components/MetricCard";
import RevenueChart from "@/components/RevenueChart";
import { DollarSign, TrendingUp, ShoppingBag, Briefcase, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const SERVICOS = ["Tráfego", "Captação", "Site"];

const FaturamentoPage = () => {
  const { data: today } = useTodayMetrics();
  const filter = useDateFilter();
  const monthData = filter.metrics;
  const vendasData = filter.vendas;

  const totalFat = monthData.reduce((s, d) => s + Number(d.faturamento_dia), 0);
  const totalFatMarcado = monthData.reduce((s, d) => s + Number(d.faturamento_marcado || 0), 0);
  const totalAds = monthData.reduce((s, d) => s + Number(d.ads), 0);
  const avgDaily = monthData.length > 0 ? totalFat / monthData.length : 0;

  // Separate product vs service from vendas
  const { produtoTotal, servicoTotal, servicoByType } = useMemo(() => {
    let produtoTotal = 0;
    let servicoTotal = 0;
    const servicoByType: Record<string, number> = {};
    for (const s of SERVICOS) servicoByType[s] = 0;

    for (const v of vendasData) {
      if (v.servico && SERVICOS.includes(v.servico)) {
        servicoTotal += Number(v.valor);
        servicoByType[v.servico] += Number(v.valor);
      } else {
        produtoTotal += Number(v.valor);
      }
    }
    return { produtoTotal, servicoTotal, servicoByType };
  }, [vendasData]);

  const faturamentoGeral = totalFat + servicoTotal;

  // ROAS calculations: (fat_marcado + fat_feito) / ads
  const roasData = useMemo(() => {
    const roasTotal = totalAds > 0 ? ((totalFatMarcado + totalFat + servicoTotal) / totalAds) : 0;
    const roasPlanilha = totalAds > 0 ? ((totalFatMarcado + totalFat) / totalAds) : 0;
    const roasServicos = totalAds > 0 ? (servicoTotal / totalAds) : 0;
    const roasByService: Record<string, number> = {};
    for (const s of SERVICOS) {
      roasByService[s] = totalAds > 0 ? (servicoByType[s] / totalAds) : 0;
    }
    return { roasTotal, roasPlanilha, roasServicos, roasByService };
  }, [totalFatMarcado, totalFat, servicoTotal, totalAds, servicoByType]);

  const cumulativeData = monthData.reduce((acc: { date: string; acumulado: number }[], d, i) => {
    const prev = i > 0 ? acc[i - 1].acumulado : 0;
    acc.push({
      date: new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit" }),
      acumulado: prev + Number(d.faturamento_dia),
    });
    return acc;
  }, []);

  return (
    <PageTransition>
      <DashboardLayout title="Faturamento" subtitle="Análise detalhada do faturamento" actions={<MetricsForm currentData={today} />}>
        <DateFilterBar mode={filter.mode} onModeChange={filter.setMode} label={filter.label} onBack={filter.goBack} onForward={filter.goForward} />

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <MetricCard title="Faturamento Total" value={formatCurrency(faturamentoGeral)} subtitle="Planilha + Serviços" icon={<DollarSign className="h-5 w-5" />} variant="accent" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Produtos (Planilha)" value={formatCurrency(totalFat)} icon={<ShoppingBag className="h-5 w-5" />} variant="primary" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Serviços" value={formatCurrency(servicoTotal)} subtitle={`${vendasData.filter(v => v.servico && SERVICOS.includes(v.servico)).length} vendas`} icon={<Briefcase className="h-5 w-5" />} />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Média Diária (Planilha)" value={formatCurrency(avgDaily)} icon={<TrendingUp className="h-5 w-5" />} />
          </StaggerItem>
        </StaggerContainer>

        {/* Breakdown by service type */}
        <StaggerContainer className="grid gap-4 sm:grid-cols-3">
          {SERVICOS.map((s) => (
            <StaggerItem key={s}>
              <MetricCard title={s} value={formatCurrency(servicoByType[s])} icon={<Briefcase className="h-5 w-5" />} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* ROAS Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">ROAS por Categoria</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="ROAS Total"
              value={roasData.roasTotal.toFixed(2) + "x"}
              subtitle={`Investido: ${formatCurrency(totalAds)}`}
              icon={<BarChart3 className="h-5 w-5" />}
              variant="accent"
            />
            <MetricCard
              title="ROAS Produtos (Planilha)"
              value={roasData.roasPlanilha.toFixed(2) + "x"}
              icon={<ShoppingBag className="h-5 w-5" />}
              variant="primary"
            />
            <MetricCard
              title="ROAS Total Serviços"
              value={roasData.roasServicos.toFixed(2) + "x"}
              icon={<Briefcase className="h-5 w-5" />}
            />
            {SERVICOS.map((s) => (
              <MetricCard
                key={s}
                title={`ROAS ${s}`}
                value={roasData.roasByService[s].toFixed(2) + "x"}
                icon={<BarChart3 className="h-5 w-5" />}
              />
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <RevenueChart />
        </motion.div>

        {cumulativeData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <h3 className="font-display text-sm font-semibold text-foreground relative z-10 mb-4">Faturamento Acumulado</h3>
            <div className="relative z-10">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(270, 60%, 55%)" />
                      <stop offset="100%" stopColor="hsl(175, 80%, 50%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 15%, 18%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={{ stroke: "hsl(260, 15%, 18%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={{ stroke: "hsl(260, 15%, 18%)" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(260, 22%, 12%)", border: "1px solid hsl(260, 15%, 22%)", borderRadius: "12px", color: "hsl(210, 40%, 96%)" }} formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="acumulado" stroke="url(#lineGrad)" strokeWidth={3} dot={{ fill: "hsl(175, 80%, 50%)", r: 4 }} name="Acumulado" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
};

export default FaturamentoPage;
