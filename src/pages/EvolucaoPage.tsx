import DashboardLayout from "@/components/DashboardLayout";
import EvolutionDashboard from "@/components/evolution/EvolutionDashboard";
import PageTransition from "@/components/PageTransition";

export default function EvolucaoPage() {
  return (
    <PageTransition>
      <DashboardLayout
        title="Evolução"
        subtitle="Visão executiva, crescimento e desempenho da empresa"
        contentClassName="max-w-[110rem]"
      >
        <EvolutionDashboard />
      </DashboardLayout>
    </PageTransition>
  );
}
