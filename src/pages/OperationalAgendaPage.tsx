import { useAgendaCourseEnrollments } from '@/hooks/clients/useAgendaCourseEnrollments';
import { useCourseBookings } from '@/hooks/clients/useCourseBookings';
import { courseAgendaMeetings } from '@/lib/courseAgendaMeetings';
import DashboardLayout from "@/components/DashboardLayout";
import {SUPPORT_RESPONSIBLES} from '@/lib/supportResponsibles';
import PageTransition from "@/components/PageTransition";
import { MeetingsSection } from "@/components/clients/tasks/MeetingsSection";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { useMeetings } from "@/hooks/clients/useMeetings";
import { useAgendaBlocks } from "@/hooks/clients/useAgendaBlocks";
import { useTeamMembers } from "@/hooks/clients/useTeamMembers";
import { useSupportBookings, type SupportBooking } from "@/hooks/useSupportSchedule";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { AgendaCategory } from "@/types/clients/task";

type AgendaView = AgendaCategory | "all";

export default function OperationalAgendaPage({ category }: { category: AgendaView }) {
  const enrollments = useAgendaCourseEnrollments(category === "all");
  const { bookings: courseBookings, loading: coursesLoading, refetch: refreshBookings } = useCourseBookings();
  const { meetings, loading: meetingsLoading, syncing, refreshMeetings, addMeeting, updateMeeting, deleteMeeting } = useMeetings();
  const { members, loading: membersLoading } = useTeamMembers();
  const { blocks, loading: blocksLoading, currentUserId, addBlock, deleteBlock } = useAgendaBlocks();
  const { data: supportBookings = [], isLoading: supportLoading } = useSupportBookings();
  const { clients: metaClients, loading: metaLoading } = useClients("meta_ads");
  const { clients: googleClients, loading: googleLoading } = useClients("google_ads");
  const clientNames = useMemo(
    () => [...new Set([...metaClients, ...googleClients].map((client) => client.name).filter(Boolean))].sort(),
    [metaClients, googleClients],
  );
  const agendaMeetings = useMemo(() => {
    const supportMeetings = (supportBookings as SupportBooking[]).filter((booking) => booking.status !== "cancelado").map((booking) => ({
      id: `support-${booking.id}`, agendaCategory: "geral" as const, title: booking.student_name || "Suporte", meetingType: "suporte",
      clientName: booking.student_name || "Suporte", date: booking.booking_date, time: booking.start_time?.slice(0, 5) || "", durationMinutes: 60,
      responsible: SUPPORT_RESPONSIBLES[0], responsibles: [...SUPPORT_RESPONSIBLES], professional: SUPPORT_RESPONSIBLES[0], participants: [...SUPPORT_RESPONSIBLES], description: booking.notes || "Aula de suporte", status: booking.status === "concluido" ? "completed" as const : "pending" as const,
      outcome: null, origin: "suporte", service: "Suporte", modality: booking.modality, hasClosed: false, source: "local" as const,
    }));
    const all = category === "all" ? [...meetings, ...supportMeetings, ...courseAgendaMeetings(courseBookings, enrollments.data)] : meetings.filter((meeting) => meeting.agendaCategory === category);
    return all.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [meetings, supportBookings, courseBookings, enrollments.data, category]);
  const agendaBlocks = useMemo(
    () => category === "all" ? blocks : blocks.filter((block) => block.agendaCategory === category || block.agendaCategory === "geral"),
    [blocks, category],
  );
  const title = category === "all"
    ? "Agenda Geral"
    : category === "captacao"
      ? "Agenda de Captação"
      : "Agenda Social Media";

  if (meetingsLoading || membersLoading || blocksLoading || metaLoading || googleLoading || supportLoading || (category === "all" && (coursesLoading || enrollments.isLoading))) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <PageTransition>
      <DashboardLayout title={title} subtitle={category === "all" ? "Compromissos gerais, Closer, captação, Social Media, suporte e cursos em um só lugar" : "Organize compromissos, responsáveis e resultados"} contentClassName="max-w-[96rem]">
        {enrollments.error && category === "all" && <p role="alert" className="text-sm text-destructive mb-3">Não foi possível carregar as inscrições antigas dos cursos. Atualize para tentar novamente.</p>}
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
          onRefresh={() => { void refreshMeetings(); void refreshBookings(); void enrollments.refetch(); }}
          syncing={syncing}
        />
      </DashboardLayout>
    </PageTransition>
  );
}


