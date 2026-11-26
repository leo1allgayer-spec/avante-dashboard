import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Loader2, MapPin, Plus, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { useMeetings } from "@/hooks/clients/useMeetings";
import { useTeamMembers } from "@/hooks/clients/useTeamMembers";
import { getClientInPersonStatuses, type ClientInPersonStatus } from "@/lib/clientInPersonMeetings";
import type { Client } from "@/types/clients/client";
import type { Meeting } from "@/types/clients/task";
import { toast } from "sonner";

const todayInSaoPaulo = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const formatDate = (value: string) => format(parseISO(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

export default function ClientInPersonAgendaPage() {
  const meta = useClients("meta_ads");
  const google = useClients("google_ads");
  const { meetings, loading: meetingsLoading, syncing, addMeeting, updateMeeting } = useMeetings();
  const { members, loading: membersLoading } = useTeamMembers();
  const [managerFilter, setManagerFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [meetingDate, setMeetingDate] = useState(todayInSaoPaulo());
  const [meetingTime, setMeetingTime] = useState("14:00");
  const [responsible, setResponsible] = useState("");
  const [description, setDescription] = useState("Entrega mensal do relatório presencial.");
  const [saving, setSaving] = useState(false);

  const clients = useMemo(() => [...new Map([...meta.clients, ...google.clients].filter((client) => client.status === "Ativo").map((client) => [client.id, client])).values()], [meta.clients, google.clients]);
  const clientStatuses = useMemo(() => getClientInPersonStatuses(clients, meetings), [clients, meetings]);
  const overdue = clientStatuses.filter((item) => item.overdue);
  const upcoming = useMemo(() => meetings
    .filter((meeting) => meeting.origin === "gestao_clientes" && meeting.meetingType === "reuniao_cliente" && meeting.modality === "presencial" && meeting.status === "pending" && meeting.date >= todayInSaoPaulo())
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)), [meetings]);
  const managers = useMemo(() => [...new Set([...clients.map((client) => client.manager), ...members.map((member) => member.name)].filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [clients, members]);
  const visibleClients = managerFilter === "all" ? clientStatuses : clientStatuses.filter((item) => item.client.manager === managerFilter);
  const visibleOverdue = visibleClients.filter((item) => item.overdue);
  const loading = meta.loading || google.loading || meetingsLoading || membersLoading;

  const openSchedule = (client?: Client) => {
    setSelectedClient(client || null);
    setMeetingDate(todayInSaoPaulo());
    setMeetingTime("14:00");
    setResponsible(client?.manager || "");
    setDescription("Entrega mensal do relatório presencial.");
  };

  const saveMeeting = async () => {
    if (!selectedClient || !meetingDate || !meetingTime || !responsible) {
      toast.error("Selecione o cliente, a data, o horário e o gestor responsável.");
      return;
    }
    setSaving(true);
    try {
      const meeting: Omit<Meeting, "id"> = {
        agendaCategory: "geral",
        title: selectedClient.name,
        meetingType: "reuniao_cliente",
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone || "",
        notifyClient: false,
        date: meetingDate,
        time: meetingTime,
        durationMinutes: 60,
        responsible,
        professional: responsible,
        participants: [responsible],
        description: description.trim() || "Entrega mensal do relatório presencial.",
        status: "pending",
        outcome: null,
        origin: "gestao_clientes",
        service: "Entrega de relatório mensal",
        modality: "presencial",
        hasClosed: false,
        closingStatus: "pending",
      };
      await addMeeting(meeting);
      setSelectedClient(null);
      toast.success("Entrega presencial adicionada à agenda do gestor.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível agendar a reunião.");
    } finally {
      setSaving(false);
    }
  };

  const markCompleted = async (meeting: Meeting) => {
    try {
      await updateMeeting({ ...meeting, status: "completed" });
      toast.success("Reunião presencial registrada como realizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a reunião.");
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <PageTransition>
      <DashboardLayout title="Agenda presencial de clientes" subtitle="Reunião e entrega de relatório presencial pelo menos uma vez a cada 30 dias" contentClassName="max-w-[1500px]">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl text-sm text-muted-foreground">As reuniões realizadas são usadas para acompanhar a periodicidade. Ao concluir uma entrega nesta agenda, o prazo mensal do cliente é atualizado.</p>
            <Button onClick={() => openSchedule()} className="gap-2"><Plus className="h-4 w-4" /> Agendar entrega presencial</Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Users className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Clientes ativos</p><p className="text-2xl font-bold">{clients.length}</p></div></CardContent></Card>
            <Card className={overdue.length ? "border-amber-500/40" : ""}><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-amber-500/10 p-2 text-amber-500"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Sem reunião há mais de 30 dias</p><p className="text-2xl font-bold">{overdue.length}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary"><CalendarDays className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Entregas presenciais agendadas</p><p className="text-2xl font-bold">{upcoming.length}</p></div></CardContent></Card>
          </div>

          {overdue.length > 0 && <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><div><p className="font-semibold">Há clientes que precisam de uma reunião presencial</p><p className="text-sm text-muted-foreground">Agende uma visita e registre a entrega do relatório mensal. O prazo é atualizado quando a reunião é marcada como realizada.</p></div></div>}

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Clientes e periodicidade presencial</CardTitle><p className="mt-1 text-sm text-muted-foreground">O alerta considera somente reuniões presenciais concluídas e vinculadas ao cliente.</p></div><Select value={managerFilter} onValueChange={setManagerFilter}><SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Filtrar gestor" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os gestores</SelectItem>{managers.map((manager) => <SelectItem key={manager} value={manager}>{manager}</SelectItem>)}</SelectContent></Select></CardHeader>
            <CardContent>
              {visibleClients.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente ativo encontrado.</p> : <div className="space-y-2">{visibleClients.map((item) => <ClientStatusRow key={item.client.id} item={item} onSchedule={() => openSchedule(item.client)} />)}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Próximas entregas presenciais</CardTitle></CardHeader>
            <CardContent>
              {upcoming.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma entrega presencial agendada.</p> : <div className="space-y-2">{upcoming.map((meeting) => <div key={meeting.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{meeting.clientName || meeting.title}</p><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDate(meeting.date)}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{meeting.time}</span><span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{meeting.responsible}</span></p></div><Button variant="outline" size="sm" className="gap-2" onClick={() => void markCompleted(meeting)} disabled={syncing}><CheckCircle2 className="h-4 w-4" /> Marcar como realizada</Button></div>)}</div>}
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!selectedClient} onOpenChange={(open) => { if (!open && !saving) setSelectedClient(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Agendar entrega presencial</DialogTitle></DialogHeader>
            {selectedClient && <div className="grid gap-4">
              <div className="rounded-lg border bg-muted/20 p-3"><p className="font-semibold">{selectedClient.name}</p><p className="text-sm text-muted-foreground">Gestor atual: {selectedClient.manager || "Não definido"}</p></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="client-report-date">Data</Label><Input id="client-report-date" type="date" min={todayInSaoPaulo()} value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} /></div><div><Label htmlFor="client-report-time">Horário</Label><Input id="client-report-time" type="time" value={meetingTime} onChange={(event) => setMeetingTime(event.target.value)} /></div></div>
              <div><Label>Gestor responsável</Label><Select value={responsible || "__none"} onValueChange={(value) => setResponsible(value === "__none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Selecione o gestor" /></SelectTrigger><SelectContent><SelectItem value="__none">Selecione o gestor</SelectItem>{managers.map((manager) => <SelectItem key={manager} value={manager}>{manager}</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="client-report-description">Observação</Label><Input id="client-report-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">O compromisso será salvo na agenda presencial dos clientes, associado ao cliente e ao gestor selecionado.</div>
            </div>}
            <DialogFooter><Button variant="outline" onClick={() => setSelectedClient(null)} disabled={saving}>Cancelar</Button><Button onClick={() => void saveMeeting()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Agendar reunião</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </PageTransition>
  );
}

function ClientStatusRow({ item, onSchedule }: { item: ClientInPersonStatus; onSchedule: () => void }) {
  const label = item.lastMeetingDate
    ? `Última reunião: ${formatDate(item.lastMeetingDate)}${item.daysSinceMeeting !== null ? ` · há ${item.daysSinceMeeting} dias` : ""}`
    : item.daysSinceMeeting !== null
      ? `Nenhuma reunião registrada · cliente há ${item.daysSinceMeeting} dias`
      : "Nenhuma reunião presencial registrada";

  return <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{item.client.name}</p><Badge variant="outline">{item.client.manager || "Sem gestor"}</Badge>{item.overdue && <Badge variant="destructive">Atenção · mais de 30 dias</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>
    <Button size="sm" variant={item.overdue ? "default" : "outline"} onClick={onSchedule}><CalendarDays className="mr-2 h-4 w-4" /> Agendar</Button>
  </div>;
}
