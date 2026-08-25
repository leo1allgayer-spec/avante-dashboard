import { useMemo, useState } from "react";
import { CalendarCheck2, Check, Clock3, Copy, GraduationCap, Link2, Loader2, Plus, Settings2, Trash2, Users, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import MetricCard from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateSupportRule, useDeleteSupportRule, useSupportBookings, useSupportRules, useUpdateSupportBooking, useUpdateSupportRule } from "@/hooks/useSupportSchedule";

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00`));
const formatTime = (value: string) => value.slice(0, 5);

export default function SupportSchedulePage() {
  const { data: rules = [], isLoading: loadingRules } = useSupportRules();
  const { data: bookings = [], isLoading: loadingBookings } = useSupportBookings();
  const createRule = useCreateSupportRule();
  const updateRule = useUpdateSupportRule();
  const deleteRule = useDeleteSupportRule();
  const updateBooking = useUpdateSupportBooking();
  const { toast } = useToast();
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("14:00");
  const [capacity, setCapacity] = useState("1");
  const [bookingView, setBookingView] = useState<"agendado" | "concluido" | "cancelado">("agendado");
  const publicLink = `${window.location.origin}/agendar-suporte`;
  const today = new Date().toISOString().slice(0, 10);

  const activeBookings = useMemo(() => bookings.filter((booking) => booking.status === "agendado"), [bookings]);
  const upcoming = useMemo(() => [...activeBookings].filter((booking) => booking.booking_date >= today).sort((a, b) => `${a.booking_date}${a.start_time}`.localeCompare(`${b.booking_date}${b.start_time}`)), [activeBookings, today]);
  const completed = bookings.filter((booking) => booking.status === "concluido").length;
  const uniqueStudents = new Set(bookings.filter((booking) => booking.status !== "cancelado").map((booking) => booking.cpf_limpo)).size;
  const visibleBookings = useMemo(() => {
    const filtered = bookings.filter((booking) => booking.status === bookingView);
    return [...filtered].sort((a, b) => {
      const left = `${a.booking_date}T${a.start_time}`;
      const right = `${b.booking_date}T${b.start_time}`;
      return bookingView === "agendado" ? left.localeCompare(right) : right.localeCompare(left);
    });
  }, [bookingView, bookings]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicLink);
    toast({ title: "Link da agenda copiado", description: publicLink });
  };

  const addRule = async () => {
    try {
      await createRule.mutateAsync({ weekday: Number(weekday), start_time: startTime, capacity: Math.max(1, Number(capacity)) });
      toast({ title: "Horário adicionado" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: "Não foi possível adicionar", description: message.includes("duplicate") ? "Este dia e horário já existem." : message, variant: "destructive" });
    }
  };

  const changeBookingStatus = async (id: string, status: "agendado" | "concluido" | "cancelado") => {
    try {
      await updateBooking.mutateAsync({ id, status });
      toast({ title: status === "concluido" ? "Aula concluída" : status === "cancelado" ? "Agendamento cancelado" : "Agendamento reaberto" });
    } catch (error) {
      toast({ title: "Erro ao atualizar", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  return <PageTransition><DashboardLayout title="Agenda de Suporte" subtitle="Aulas, disponibilidade e limite de três atendimentos por aluno" actions={<Button onClick={copyLink} className="gap-2"><Copy className="h-4 w-4" /> Copiar link dos alunos</Button>}>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Próximas aulas" value={upcoming.length} icon={<CalendarCheck2 className="h-5 w-5" />} variant="primary" countUp />
      <MetricCard title="Alunos atendidos" value={uniqueStudents} icon={<Users className="h-5 w-5" />} variant="accent" countUp />
      <MetricCard title="Aulas concluídas" value={completed} icon={<GraduationCap className="h-5 w-5" />} variant="success" countUp />
      <MetricCard title="Horários ativos" value={rules.filter((rule) => rule.active).length} icon={<Clock3 className="h-5 w-5" />} variant="warning" countUp />
    </div>

    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-xs uppercase tracking-wider text-muted-foreground">Link exclusivo para os alunos</p><p className="mt-1 truncate font-medium">{publicLink}</p></div><Button variant="outline" onClick={copyLink} className="gap-2"><Link2 className="h-4 w-4" /> Copiar</Button></div></div>

    <Tabs defaultValue="agenda" className="space-y-4">
      <TabsList><TabsTrigger value="agenda" className="gap-2"><CalendarCheck2 className="h-4 w-4" /> Agenda</TabsTrigger><TabsTrigger value="config" className="gap-2"><Settings2 className="h-4 w-4" /> Configurações</TabsTrigger></TabsList>
      <TabsContent value="agenda">
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card/70">
          <div className="border-b border-border/40 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><h2 className="font-display text-lg font-bold">Agendamentos de suporte</h2><p className="text-xs text-muted-foreground">Os atendimentos ativos aparecem pela data mais próxima.</p></div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={bookingView === "agendado" ? "default" : "outline"} onClick={() => setBookingView("agendado")}>Ativos ({bookings.filter((item) => item.status === "agendado").length})</Button>
                <Button size="sm" variant={bookingView === "concluido" ? "default" : "outline"} onClick={() => setBookingView("concluido")}>Realizados ({bookings.filter((item) => item.status === "concluido").length})</Button>
                <Button size="sm" variant={bookingView === "cancelado" ? "destructive" : "outline"} onClick={() => setBookingView("cancelado")}>Cancelados ({bookings.filter((item) => item.status === "cancelado").length})</Button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Horário</TableHead><TableHead>Modalidade</TableHead><TableHead>Aluno</TableHead><TableHead>CPF</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
            {loadingBookings ? <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow> : visibleBookings.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum agendamento nesta categoria.</TableCell></TableRow> : visibleBookings.map((booking) => <TableRow key={booking.id} className={booking.status === "cancelado" ? "opacity-50" : ""}><TableCell className="font-medium capitalize">{formatDate(booking.booking_date)}</TableCell><TableCell>{formatTime(booking.start_time)}</TableCell><TableCell><Badge variant="outline" className="capitalize">{booking.modality || "presencial"}</Badge></TableCell><TableCell className="font-semibold">{booking.student_name}</TableCell><TableCell>{booking.cpf_limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</TableCell><TableCell><Badge variant={booking.status === "concluido" ? "default" : booking.status === "cancelado" ? "destructive" : "secondary"} className={booking.status === "concluido" ? "bg-success text-success-foreground" : ""}>{booking.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-1">{booking.status !== "concluido" && booking.status !== "cancelado" && <Button size="sm" variant="outline" className="gap-1 text-success" onClick={() => void changeBookingStatus(booking.id, "concluido")}><Check className="h-4 w-4" /> Concluir</Button>}{booking.status !== "cancelado" && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => void changeBookingStatus(booking.id, "cancelado")} title="Cancelar"><X className="h-4 w-4" /></Button>}{booking.status === "cancelado" && <Button size="sm" variant="outline" onClick={() => void changeBookingStatus(booking.id, "agendado")}>Reabrir</Button>}</div></TableCell></TableRow>)}
          </TableBody></Table></div>
        </div>
      </TabsContent>

      <TabsContent value="config" className="space-y-4">
        <div className="rounded-xl border border-border/40 bg-card/70 p-5"><h2 className="font-display text-lg font-bold">Adicionar disponibilidade semanal</h2><p className="mt-1 text-sm text-muted-foreground">O horário ficará disponível semanalmente nos próximos 60 dias.</p><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_130px_auto]"><div><Label>Dia da semana</Label><Select value={weekday} onValueChange={setWeekday}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{WEEKDAYS.map((day, index) => <SelectItem key={day} value={String(index)}>{day}</SelectItem>)}</SelectContent></Select></div><div><Label>Horário</Label><Input className="mt-1.5" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></div><div><Label>Vagas por horário</Label><Input className="mt-1.5" type="number" min="1" max="50" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></div><Button className="mt-auto gap-2" onClick={() => void addRule()} disabled={createRule.isPending}><Plus className="h-4 w-4" /> Adicionar</Button></div></div>
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card/70"><div className="border-b border-border/40 p-4"><h2 className="font-display text-lg font-bold">Horários configurados</h2></div><Table><TableHeader><TableRow><TableHead>Dia</TableHead><TableHead>Horário</TableHead><TableHead>Vagas</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{loadingRules ? <TableRow><TableCell colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow> : rules.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum horário configurado.</TableCell></TableRow> : rules.map((rule) => <TableRow key={rule.id}><TableCell className="font-semibold">{WEEKDAYS[rule.weekday]}</TableCell><TableCell>{formatTime(rule.start_time)}</TableCell><TableCell><Input type="number" min="1" max="50" value={rule.capacity} className="h-8 w-20" onChange={(event) => void updateRule.mutateAsync({ id: rule.id, capacity: Math.max(1, Number(event.target.value)) })} /></TableCell><TableCell><Select value={rule.active ? "active" : "inactive"} onValueChange={(value) => void updateRule.mutateAsync({ id: rule.id, active: value === "active" })}><SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Pausado</SelectItem></SelectContent></Select></TableCell><TableCell className="text-right"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover este horário?</AlertDialogTitle><AlertDialogDescription>Agendamentos já feitos serão preservados, mas novas datas deixarão de aparecer aos alunos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => void deleteRule.mutateAsync(rule.id)}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>)}</TableBody></Table></div>
      </TabsContent>
    </Tabs>
  </DashboardLayout></PageTransition>;
}
