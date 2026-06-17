import { useDateFilter } from "@/hooks/useDateFilter";
import { useTodayMetrics } from "@/hooks/useMetrics";
import DashboardLayout from "@/components/DashboardLayout";
import DateFilterBar from "@/components/DateFilterBar";
import MetricsForm from "@/components/MetricsForm";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import MetricCard from "@/components/MetricCard";
import LeadsPieChart from "@/components/charts/LeadsPieChart";
import CostBarChart from "@/components/charts/CostBarChart";
import LeadsFunnelChart from "@/components/charts/LeadsFunnelChart";
import { Users, DollarSign, Magnet, Target } from "lucide-react";
import { motion } from "framer-motion";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const ComercialPage = () => {
  const { data: today } = useTodayMetrics();
  const filter = useDateFilter();
  const monthData = filter.metrics;

  const totalLeads = monthData.reduce((s, d) => s + Number(d.leads), 0);
  const totalMql = monthData.reduce((s, d) => s + Number(d.lead_mql), 0);
  const totalAds = monthData.reduce((s, d) => s + Number(d.ads || 0), 0);
  const conversionRate = totalLeads > 0 ? ((totalMql / totalLeads) * 100).toFixed(1) : "0";
  const avgCac = totalMql > 0 ? totalAds / totalMql : 0;
  const avgCpl = totalLeads > 0 ? totalAds / totalLeads : 0;
  const avgCplMql = totalMql > 0 ? totalAds / totalMql : 0;

  return (
    <PageTransition>
      <DashboardLayout title="Comercial" subtitle="Métricas de aquisição e leads" actions={<MetricsForm currentData={today} />}>
        <DateFilterBar mode={filter.mode} onModeChange={filter.setMode} label={filter.label} onBack={filter.goBack} onForward={filter.goForward} />

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <MetricCard title="Leads" value={totalLeads} icon={<Users className="h-5 w-5" />} variant="primary" countUp />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="MQL" value={totalMql} icon={<Magnet className="h-5 w-5" />} variant="accent" countUp />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Taxa Conversão" value={`${conversionRate}%`} subtitle="Leads → MQL" icon={<Target className="h-5 w-5" />} variant="success" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="CAC" value={formatCurrency(avgCac)} icon={<DollarSign className="h-5 w-5" />} variant="warning" />
          </StaggerItem>
        </StaggerContainer>

        <div className="grid gap-5 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <LeadsPieChart leads={totalLeads} leadsMql={totalMql} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <CostBarChart custoLead={avgCpl} custoMql={avgCplMql} cac={avgCac} />
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <LeadsFunnelChart monthData={monthData} />
        </motion.div>

        <StaggerContainer className="grid gap-4 sm:grid-cols-2" delay={0.6}>
          <StaggerItem>
            <MetricCard title="Custo por Lead" value={formatCurrency(avgCpl)} icon={<DollarSign className="h-5 w-5" />} />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Custo por Lead MQL" value={formatCurrency(avgCplMql)} icon={<DollarSign className="h-5 w-5" />} />
          </StaggerItem>
        </StaggerContainer>
      </DashboardLayout>
    </PageTransition>
  );
};

export default ComercialPage;
