import { useMemo } from "react";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useBusinessSummary } from "@/hooks/useBusinessSummary";
import { useFechamentosDiarios } from "@/hooks/useFechamentosDiarios";
import { useMetaAds } from "@/hooks/useMetaAds";
import DashboardLayout from "@/components/DashboardLayout";
import DateFilterBar from "@/components/DateFilterBar";
import MetricsForm from "@/components/MetricsForm";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import MetricCard from "@/components/MetricCard";
import RevenueChart from "@/components/RevenueChart";
import { DollarSign, TrendingUp, ShoppingBag, Briefcase, BarChart3, Wallet, Clock3 } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { COURSE_PRODUCTS, GENERAL_SERVICE_OPTIONS, canonicalizeSaleCategory } from "@/constants/serviceCategories";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const normalizeText = (value?: string | null) =>
  (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const CATEGORY_GROUPS = ["Cursos", "Serviços", "Suporte Extra", "Captação/Edição", "Site", "CRM", "Upsell"] as const;

const getCategoryGroup = (sale: { produto?: string | null; servico?: string | null; origem?: string | null }) => {
  const category = canonicalizeSaleCategory(sale.servico || sale.produto);
  if (normalizeText(sale.origem) === "upsell" || normalizeText(category) === "upsell") return "Upsell";
  if (COURSE_PRODUCTS.some((item) => normalizeText(item) === normalizeText(category))) return "Cursos";
  if (GENERAL_SERVICE_OPTIONS.some((item) => normalizeText(item) === normalizeText(category))) return "Serviços";
  if (normalizeText(category) === normalizeText("Suporte Extra")) return "Suporte Extra";
  if (normalizeText(category) === normalizeText("Captacao/Edicao de Conteudo")) return "Captação/Edição";
  if (normalizeText(category) === normalizeText("Desenvolvimento de Site")) return "Site";
  if (normalizeText(category) === normalizeText("CRM/Treinamento Comercial")) return "CRM";
  return "Serviços";
};

const FaturamentoPage = () => {
  const filter = useDateFilter();
  const summary = useBusinessSummary(filter);
  const { today, metaMensal } = summary;
  const { data: fechamentos = [] } = useFechamentosDiarios();
  const metaAdsFilters = useMemo(() => ({
    datePreset: "custom" as const,
    since: filter.range.start,
    until: filter.range.end,
  }), [filter.range.start, filter.range.end]);
  const { data: metaAds } = useMetaAds(metaAdsFilters);

  const sales = useMemo(
    () => filter.vendas.filter((sale) => normalizeText(sale.status) !== "cancelada"),
    [filter.vendas],
  );
  const soldTotal = useMemo(() => sales.reduce((total, sale) => total + Number(sale.valor || 0), 0), [sales]);

  const salesWithCollected = useMemo(() => {
    const usedClosings = new Set<string>();
    return sales.map((sale) => {
      const category = canonicalizeSaleCategory(sale.servico || sale.produto);
      const closing = fechamentos.find((item) =>
        !usedClosings.has(item.id) &&
        normalizeText(item.status) !== "cancelado" &&
        item.data === sale.data &&
        normalizeText(item.cliente) === normalizeText(sale.cliente) &&
        normalizeText(item.vendedor) === normalizeText(sale.vendedor) &&
        normalizeText(canonicalizeSaleCategory(item.categoria || item.produto_servico)) === normalizeText(category)
      );
      if (closing) usedClosings.add(closing.id);
      return { sale, collected: Math.min(Number(sale.valor || 0), Number(closing?.valor_sinal || 0)) };
    });
  }, [sales, fechamentos]);

  const collectedTotal = useMemo(
    () => salesWithCollected.reduce((total, item) => total + item.collected, 0),
    [salesWithCollected],
  );
  const receivableTotal = Math.max(soldTotal - collectedTotal, 0);
  const averageSale = sales.length > 0 ? soldTotal / sales.length : 0;
  const investedAds = useMemo(() => {
    const daily = metaAds?.dailyInsights || [];
    if (daily.length > 0) return daily.reduce((total, day) => total + Number(day.spend || 0), 0);
    return summary.totalAds;
  }, [metaAds, summary.totalAds]);

  const categoryStats = useMemo(() => {
    const stats = new Map(CATEGORY_GROUPS.map((category) => [category, { sold: 0, collected: 0, count: 0 }]));
    salesWithCollected.forEach(({ sale, collected }) => {
      const group = getCategoryGroup(sale);
      const current = stats.get(group)!;
      current.sold += Number(sale.valor || 0);
      current.collected += collected;
      current.count += 1;
    });
    return stats;
  }, [salesWithCollected]);

  const dailyTarget = useMemo(() => {
    const year = filter.anchor.getFullYear();
    const month = filter.anchor.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    let businessDays = 0;
    for (let day = 1; day <= lastDay; day += 1) {
      const weekday = new Date(year, month, day).getDay();
      if (weekday >= 1 && weekday <= 5) businessDays += 1;
    }
    return businessDays > 0 ? Number(metaMensal || 0) / businessDays : 0;
  }, [filter.anchor, metaMensal]);

  const chartData = useMemo(() => {
    const collectedByDate = new Map<string, number>();
    salesWithCollected.forEach(({ sale, collected }) => {
      collectedByDate.set(sale.data, (collectedByDate.get(sale.data) || 0) + collected);
    });
    const start = new Date(`${filter.range.start}T12:00:00`);
    const end = new Date(`${filter.range.end}T12:00:00`);
    return Array.from({ length: Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000) + 1) }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return {
        date: String(date.getDate()).padStart(2, "0"),
        faturamento: collectedByDate.get(key) || 0,
        meta: date.getDay() >= 1 && date.getDay() <= 5 ? dailyTarget : 0,
      };
    });
  }, [salesWithCollected, filter.range.start, filter.range.end, dailyTarget]);

  const cumulativeData = useMemo(() => {
    let accumulated = 0;
    return chartData.map((day) => {
      accumulated += day.faturamento;
      return { date: day.date, acumulado: accumulated };
    });
  }, [chartData]);

  const generalRoas = investedAds > 0 ? collectedTotal / investedAds : 0;

  return (
    <PageTransition>
      <DashboardLayout title="Faturamento" subtitle="Análise detalhada das vendas e recebimentos" actions={<MetricsForm currentData={today} />}>
        <DateFilterBar mode={filter.mode} onModeChange={filter.setMode} label={filter.label} onBack={filter.goBack} onForward={filter.goForward} />

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><MetricCard title="Total Vendido" value={formatCurrency(soldTotal)} subtitle={`${sales.length} vendas registradas`} icon={<ShoppingBag className="h-5 w-5" />} variant="accent" /></StaggerItem>
          <StaggerItem><MetricCard title="Coletado" value={formatCurrency(collectedTotal)} subtitle="Valor efetivamente recebido" icon={<Wallet className="h-5 w-5" />} variant="primary" /></StaggerItem>
          <StaggerItem><MetricCard title="A Receber" value={formatCurrency(receivableTotal)} subtitle="Saldo das vendas do período" icon={<Clock3 className="h-5 w-5" />} /></StaggerItem>
          <StaggerItem><MetricCard title="Ticket Médio" value={formatCurrency(averageSale)} icon={<TrendingUp className="h-5 w-5" />} /></StaggerItem>
        </StaggerContainer>

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_GROUPS.map((category) => {
            const stat = categoryStats.get(category)!;
            return (
              <StaggerItem key={category}>
                <MetricCard title={category} value={formatCurrency(stat.sold)} subtitle={`${stat.count} vendas · Coletado ${formatCurrency(stat.collected)}`} icon={<Briefcase className="h-5 w-5" />} />
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">ROAS por Categoria</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="ROAS Geral" value={`${generalRoas.toFixed(2)}x`} subtitle={`Investido: ${formatCurrency(investedAds)}`} icon={<BarChart3 className="h-5 w-5" />} variant="accent" />
            {CATEGORY_GROUPS.map((category) => {
              const stat = categoryStats.get(category)!;
              const roas = investedAds > 0 ? stat.collected / investedAds : 0;
              return <MetricCard key={category} title={`ROAS ${category}`} value={`${roas.toFixed(2)}x`} icon={<DollarSign className="h-5 w-5" />} />;
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <RevenueChart data={chartData} />
        </motion.div>

        {cumulativeData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-xl p-6 relative overflow-hidden">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Faturamento Coletado Acumulado</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 15%, 18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(260, 22%, 12%)", border: "1px solid hsl(260, 15%, 22%)", borderRadius: "12px" }} formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="acumulado" stroke="hsl(175, 80%, 50%)" strokeWidth={3} dot={{ r: 3 }} name="Coletado" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
};

export default FaturamentoPage;
