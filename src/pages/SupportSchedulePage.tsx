import {SUPPORT_RESPONSIBLES} from '@/lib/supportResponsibles';
import SupportAvailabilityEditor from "@/components/SupportAvailabilityEditor";
import { useMemo, useState } from "react";
import { CalendarCheck2, Check, Clock3, Copy, GraduationCap, Link2, Loader2, Pencil, Plus, Settings2, Trash2, Users, X } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateSupportBooking, useCreateSupportRule, useDeleteSupportRule, useSupportBookings, useSupportRules, useSupportSlots, useUpdateSupportBooking, useUpdateSupportRule } from "@/hooks/useSupportSchedule";
import { supabase } from "@/integrations/supabase/client";

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00`));
const formatTime = (value: string) => value.slice(0, 5);
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const formatCpf = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export default function SupportSchedulePage() {
  const { data: rules = [] } = useSupportRules();

  const { data: bookings = [], isLoading: loadingBookings } = useSupportBookings();



  const updateBooking = useUpdateSupportBooking();
  const createBooking = useCreateSupportBooking();
  const { toast } = useToast();



  const [bookingView, setBookingView] = useState<"agendado" | "concluido" | "cancelado">("agendado");
  const [editing, setEditing] = useState<(typeof bookings)[number] | null>(null);
  const [editSlot, setEditSlot] = useState("");
  const saveEdit = async () => {
    if (!editing || !editing.student_name.trim() || (editing.student_phone || "").replace(/\D/g, "").length < 10) {
      toast({ title: "Informe nome e telefone válidos", variant: "destructive" }); return;
    }
    try {
      const [date, time] = editSlot.split("|");
      if (date !== editing.booking_date || time !== editing.start_time) {
        const { data: slots, error } = await (supabase as any).rpc("list_support_slots", { p_from: date, p_to: date });
        if (error) throw error;
        if (!slots?.some((slot: any) => slot.slot_date === date && slot.start_time === time)) throw new Error("Horário indisponível. Selecione outro horário.");
      }
      await updateBooking.mutateAsync({ id: editing.id, student_name: editing.student_name.trim(), student_phone: editing.student_phone, modality: editing.modality, notes: editing.notes, booking_date: date, start_time: time });
      setEditing(null); toast({ title: "Agendamento atualizado" });
    } catch (error) {
      toast({ title: "Erro ao salvar", description: String((error as { message?: string })?.message || error), variant: "destructive" });
    }
  };
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCpf, setManualCpf] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualModality, setManualModality] = useState<"presencial" | "online">("presencial");
  const [manualSlot, setManualSlot] = useState("");
  const publicLink = `${window.location.origin}/agendar-suporte`;
  const today = new Date().toISOString().slice(0, 10);
  const slotFrom = localDate(new Date());
  const slotTo = localDate(addDays(new Date(), 60));
  const { data: availableSlots = [], isLoading: loadingSlots } = useSupportSlots(slotFrom, slotTo);

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


  const changeBookingStatus = async (id: string, status: "agendado" | "concluido" | "cancelado") => {
    try {
      await updateBooking.mutateAsync({ id, status });
      toast({ title: status === "concluido" ? "Aula concluída" : status === "cancelado" ? "Agendamento cancelado" : "Agendamento reaberto" });
    } catch (error) {
      toast({ title: "Erro ao atualizar", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  const addManualBooking = async () => {
    const cpfDigits = manualCpf.replace(/\D/g, "");
    const phoneDigits = manualPhone.replace(/\D/g, "");
    const [date, time] = manualSlot.split("|");
    if (cpfDigits.length !== 11 || !manualName.trim() || phoneDigits.length < 10 || !date || !time) {
      toast({ title: "Preencha os dados obrigatórios", description: "Informe CPF, nome, WhatsApp e um horário disponível.", variant: "destructive" });
      return;
    }
    try {
      const result = await createBooking.mutateAsync({ cpf: manualCpf, date, time, modality: manualModality, name: manualName.trim(), phone: manualPhone.trim() });
      const { error: notificationError } = await supabase.functions.invoke("support-booking-notifications", { body: { bookingId: result.id } });
      setManualOpen(false);
      setManualCpf(""); setManualName(""); setManualPhone(""); setManualSlot(""); setManualModality("presencial");
      toast({ title: "Reunião adicionada", description: notificationError ? "O agendamento foi salvo, mas o aviso não pôde ser enviado." : "Agendamento salvo e confirmação enviada ao aluno." });
    } catch (error) {
      toast({ title: "Não foi possível agendar", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };
  return <PageTransition><DashboardLayout title="Agenda de Suporte" subtitle="Aulas, disponibilidade e limite de três atendimentos por aluno" actions={<Button onClick={copyLink} className="gap-2"><Copy className="h-4 w-4" /> Copiar link dos alunos</Button>}>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Próximas aulas" value={upcoming.length} icon={<CalendarCheck2 className="h-5 w-5" />} variant="primary" countUp />
      <MetricCard title="Alunos atendidos" value={uniqueStudents} icon={<Users className="h-5 w-5" />} variant="accent" countUp />
      <MetricCard title="Aulas concluídas" value={completed} icon={<GraduationCap className="h-5 w-5" />} variant="success" countUp />
      <MetricCard title="Horários semanais ativos" value={rules.filter((rule) => rule.active).length} icon={<Clock3 className="h-5 w-5" />} variant="warning" countUp />
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
                <Button size="sm" className="gap-1" onClick={() => setManualOpen(true)}><Plus className="h-4 w-4" /> Novo agendamento</Button>
                <Button size="sm" variant={bookingView === "agendado" ? "default" : "outline"} onClick={() => setBookingView("agendado")}>Ativos ({bookings.filter((item) => item.status === "agendado").length})</Button>
                <Button size="sm" variant={bookingView === "concluido" ? "default" : "outline"} onClick={() => setBookingView("concluido")}>Realizados ({bookings.filter((item) => item.status === "concluido").length})</Button>
                <Button size="sm" variant={bookingView === "cancelado" ? "destructive" : "outline"} onClick={() => setBookingView("cancelado")}>Cancelados ({bookings.filter((item) => item.status === "cancelado").length})</Button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Horário</TableHead><TableHead>Modalidade</TableHead><TableHead>Responsáveis</TableHead><TableHead>Aluno</TableHead><TableHead>CPF</TableHead><TableHead>Telefone</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
            {loadingBookings ? <TableRow><TableCell colSpan={9} className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow> : visibleBookings.length === 0 ? <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Nenhum agendamento nesta categoria.</TableCell></TableRow> : visibleBookings.map((booking) => <TableRow key={booking.id} className={booking.status === "cancelado" ? "opacity-50" : ""}><TableCell className="font-medium capitalize">{formatDate(booking.booking_date)}</TableCell><TableCell>{formatTime(booking.start_time)}</TableCell><TableCell><Badge variant="outline" className="capitalize">{booking.modality || "presencial"}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs">{SUPPORT_RESPONSIBLES.map(name=><p key={name}>{name}</p>)}</TableCell><TableCell className="font-semibold">{booking.student_name}</TableCell><TableCell>{booking.cpf_limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</TableCell><TableCell className="whitespace-nowrap">{booking.student_phone || "—"}</TableCell><TableCell><Badge variant={booking.status === "concluido" ? "default" : booking.status === "cancelado" ? "destructive" : "secondary"} className={booking.status === "concluido" ? "bg-success text-success-foreground" : ""}>{booking.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title="Editar agendamento" aria-label="Editar agendamento" onClick={() => { setEditing({ ...booking }); setEditSlot(`${booking.booking_date}|${booking.start_time}`); }}><Pencil className="h-4 w-4" /></Button>{booking.status !== "concluido" && booking.status !== "cancelado" && <Button size="sm" variant="outline" className="gap-1 text-success" onClick={() => void changeBookingStatus(booking.id, "concluido")}><Check className="h-4 w-4" /> Concluir</Button>}{booking.status !== "cancelado" && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => void changeBookingStatus(booking.id, "cancelado")} title="Cancelar"><X className="h-4 w-4" /></Button>}{booking.status === "cancelado" && <Button size="sm" variant="outline" onClick={() => void changeBookingStatus(booking.id, "agendado")}>Reabrir</Button>}</div></TableCell></TableRow>)}
          </TableBody></Table></div>
        </div>
      </TabsContent>

      <TabsContent value="config" className="space-y-4"><SupportAvailabilityEditor /></TabsContent>
    </Tabs>

    <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !updateBooking.isPending) setEditing(null); }}>
      <DialogContent><DialogHeader><DialogTitle>Editar agendamento de suporte</DialogTitle><DialogDescription>Atualize os dados e escolha um horário disponível para remarcar.</DialogDescription></DialogHeader>
        {editing && <div className="grid gap-4">
          <div><Label htmlFor="edit-support-name">Aluno</Label><Input id="edit-support-name" value={editing.student_name} onChange={e => setEditing({ ...editing, student_name: e.target.value })} /></div>
          <div><Label htmlFor="edit-support-phone">Telefone</Label><Input id="edit-support-phone" value={editing.student_phone || ""} onChange={e => setEditing({ ...editing, student_phone: e.target.value })} /></div>
          <div><Label>Modalidade</Label><Select value={editing.modality} onValueChange={(modality: "online" | "presencial") => setEditing({ ...editing, modality })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="online">Online</SelectItem></SelectContent></Select></div>
          <div><Label>Data e horário</Label><Select value={editSlot} onValueChange={setEditSlot}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value={editing.booking_date + "|" + editing.start_time}>{formatDate(editing.booking_date)} às {formatTime(editing.start_time)} (atual)</SelectItem>
            {availableSlots.filter(slot => slot.slot_date !== editing.booking_date || slot.start_time !== editing.start_time).map(slot => <SelectItem key={slot.slot_date + slot.start_time} value={slot.slot_date + "|" + slot.start_time}>{formatDate(slot.slot_date)} às {formatTime(slot.start_time)}</SelectItem>)}
          </SelectContent></Select></div>
          <div><Label htmlFor="edit-support-notes">Observações</Label><Input id="edit-support-notes" value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></div>
        </div>}
        <DialogFooter><Button variant="outline" disabled={updateBooking.isPending} onClick={() => setEditing(null)}>Cancelar</Button><Button disabled={updateBooking.isPending} onClick={() => void saveEdit()}>{updateBooking.isPending ? "Salvando..." : "Salvar alterações"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={manualOpen} onOpenChange={setManualOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Adicionar reunião manualmente</DialogTitle><DialogDescription>Use um horário disponível da agenda. O limite de três atendimentos e a capacidade do horário serão validados automaticamente.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div><Label htmlFor="manual-support-cpf">CPF *</Label><Input id="manual-support-cpf" className="mt-1.5" value={manualCpf} onChange={(event) => setManualCpf(formatCpf(event.target.value))} placeholder="000.000.000-00" /></div>
          <div><Label htmlFor="manual-support-name">Nome do aluno *</Label><Input id="manual-support-name" className="mt-1.5" value={manualName} onChange={(event) => setManualName(event.target.value)} /></div>
          <div><Label htmlFor="manual-support-phone">WhatsApp *</Label><Input id="manual-support-phone" className="mt-1.5" value={manualPhone} onChange={(event) => setManualPhone(event.target.value)} placeholder="55 + DDD + número" inputMode="tel" /></div>
          <div><Label>Modalidade *</Label><Select value={manualModality} onValueChange={(value: "presencial" | "online") => setManualModality(value)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="online">Online</SelectItem></SelectContent></Select></div>
          <div className="sm:col-span-2"><Label>Data e horário *</Label><Select value={manualSlot} onValueChange={setManualSlot} disabled={loadingSlots || availableSlots.length === 0}><SelectTrigger className="mt-1.5"><SelectValue placeholder={loadingSlots ? "Carregando horários..." : availableSlots.length === 0 ? "Nenhum horário disponível" : "Selecione um horário disponível"} /></SelectTrigger><SelectContent>{availableSlots.map((slot) => <SelectItem key={`${slot.slot_date}-${slot.start_time}`} value={`${slot.slot_date}|${slot.start_time}`}><span className="capitalize">{formatDate(slot.slot_date)} às {formatTime(slot.start_time)} — {slot.capacity - slot.booked} vaga(s)</span></SelectItem>)}</SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setManualOpen(false)}>Cancelar</Button><Button onClick={() => void addManualBooking()} disabled={createBooking.isPending || loadingSlots}>{createBooking.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar reunião</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </DashboardLayout></PageTransition>;
}
