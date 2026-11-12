import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import MeetingAnalyticsPanel from "@/components/clients/tasks/MeetingAnalyticsPanel";
import { useMeetings } from "@/hooks/clients/useMeetings";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

export default function MeetingMetricsPage() {
  const { meetings, loading, syncing, refreshMeetings } = useMeetings();
  return (
    <PageTransition>
      <DashboardLayout
        title="Métricas de Reuniões"
        subtitle="Agendamentos da Agenda Closer, comparecimento, custos, taxas e metas"
        contentClassName="max-w-[96rem]"
        actions={<Button variant="outline" onClick={refreshMeetings} disabled={loading || syncing}><RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Atualizar dados</Button>}
      >
        {loading ? <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando reuniões...</div> : <MeetingAnalyticsPanel meetings={meetings} syncing={syncing} />}
      </DashboardLayout>
    </PageTransition>
  );
}
