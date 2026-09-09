import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { MeetingsSection } from "@/components/clients/tasks/MeetingsSection";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { useMeetings } from "@/hooks/clients/useMeetings";
import { useTeamMembers } from "@/hooks/clients/useTeamMembers";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

type AgendaCategory = "captacao" | "social_media";

export default function OperationalAgendaPage({ category }: { category: AgendaCategory }) {
  const { meetings, loading: meetingsLoading, syncing, refreshMeetings, addMeeting, updateMeeting, deleteMeeting } = useMeetings();
  const { members, loading: membersLoading } = useTeamMembers();
  const { clients: metaClients, loading: metaLoading } = useClients("meta_ads");
  const { clients: googleClients, loading: googleLoading } = useClients("google_ads");
  const clientNames = useMemo(
    () => [...new Set([...metaClients, ...googleClients].map((client) => client.name).filter(Boolean))].sort(),
    [metaClients, googleClients],
  );
  const agendaMeetings = useMemo(
    () => meetings.filter((meeting) => meeting.agendaCategory === category),
    [meetings, category],
  );
  const isCaptacao = category === "captacao";
  const title = isCaptacao ? "Agenda de Captação" : "Agenda Social Media";

  if (meetingsLoading || membersLoading || metaLoading || googleLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <PageTransition>
      <DashboardLayout title={title} subtitle="Organize compromissos, responsáveis e resultados" contentClassName="max-w-[96rem]">
        <MeetingsSection
          meetings={agendaMeetings}
          members={members}
          agendaTitle={title}
          agendaCategory={category}
          clientNames={clientNames}
          onAdd={addMeeting}
          onUpdate={updateMeeting}
          onDelete={deleteMeeting}
          onRefresh={refreshMeetings}
          syncing={syncing}
        />
      </DashboardLayout>
    </PageTransition>
  );
}
