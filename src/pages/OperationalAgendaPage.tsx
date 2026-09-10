import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { MeetingsSection } from "@/components/clients/tasks/MeetingsSection";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { useMeetings } from "@/hooks/clients/useMeetings";
import { useAgendaBlocks } from "@/hooks/clients/useAgendaBlocks";
import { useTeamMembers } from "@/hooks/clients/useTeamMembers";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { AgendaCategory } from "@/types/clients/task";

type AgendaView = AgendaCategory | "all";

export default function OperationalAgendaPage({ category }: { category: AgendaView }) {
  const { meetings, loading: meetingsLoading, syncing, refreshMeetings, addMeeting, updateMeeting, deleteMeeting } = useMeetings();
  const { members, loading: membersLoading } = useTeamMembers();
  const { blocks, loading: blocksLoading, currentUserId, addBlock, deleteBlock } = useAgendaBlocks();
  const { clients: metaClients, loading: metaLoading } = useClients("meta_ads");
  const { clients: googleClients, loading: googleLoading } = useClients("google_ads");
  const clientNames = useMemo(
    () => [...new Set([...metaClients, ...googleClients].map((client) => client.name).filter(Boolean))].sort(),
    [metaClients, googleClients],
  );
  const agendaMeetings = useMemo(
    () => category === "all" ? meetings : meetings.filter((meeting) => meeting.agendaCategory === category),
    [meetings, category],
  );
  const agendaBlocks = useMemo(
    () => category === "all" ? blocks : blocks.filter((block) => block.agendaCategory === category),
    [blocks, category],
  );
  const title = category === "all"
    ? "Agenda Geral"
    : category === "captacao"
      ? "Agenda de Captação"
      : "Agenda Social Media";

  if (meetingsLoading || membersLoading || blocksLoading || metaLoading || googleLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <PageTransition>
      <DashboardLayout title={title} subtitle={category === "all" ? "Todas as agendas reunidas e sincronizadas em um só lugar" : "Organize compromissos, responsáveis e resultados"} contentClassName="max-w-[96rem]">
        <MeetingsSection
          meetings={agendaMeetings}
          blocks={agendaBlocks}
          currentUserId={currentUserId}
          members={members}
          agendaTitle={title}
          agendaCategory={category}
          clientNames={clientNames}
          onAdd={addMeeting}
          onUpdate={updateMeeting}
          onDelete={deleteMeeting}
          onAddBlock={addBlock}
          onDeleteBlock={deleteBlock}
          onRefresh={refreshMeetings}
          syncing={syncing}
        />
      </DashboardLayout>
    </PageTransition>
  );
}
