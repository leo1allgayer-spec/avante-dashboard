import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ClientAnalyticsPanel from "@/components/clients/ClientAnalyticsPanel";
import { useAuth as useGestaoAuth } from "@/hooks/clients/useGestaoAuth";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { useAuth as useMainAuth } from "@/hooks/useAuth";

export default function ClientMetricsPage() {
  const { session } = useGestaoAuth();
  const { clients, loading } = useClients();
  const { signOut: signOutMain } = useMainAuth();
  if (!session && !loading) { signOutMain(); return null; }
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return <DashboardLayout title="Métricas dos Clientes" subtitle="Indicadores, saúde e desempenho da carteira"><ClientAnalyticsPanel clients={clients} onClientClick={() => {}} /></DashboardLayout>;
}
