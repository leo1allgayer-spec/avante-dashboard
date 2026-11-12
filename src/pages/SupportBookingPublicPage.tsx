import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Clock3, GraduationCap, Loader2, MapPin, Monitor, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { listMySupportBookings, useRescheduleSupportBooking, type MySupportBooking, lookupSupportStudent, useCreateSupportBooking, useSupportSlots, type SupportStudentLookup } from "@/hooks/useSupportSchedule";
import avanteLogo from "@/assets/logo-full.svg";
import { supabase } from "@/integrations/supabase/client";

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const formatCpf = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(`${value}T12:00:00`));
const formatTime = (value: string) => value.slice(0, 5);

export default function SupportBookingPublicPage() {
  const today = useMemo(() => new Date(), []);
  const from = localDate(today);
  const to = localDate(addDays(today, 60));
  const { data: slots = [], isLoading: loadingSlots } = useSupportSlots(from, to);
  const createBooking = useCreateSupportBooking();
  const rescheduleBooking = useRescheduleSupportBooking();
  const [mode, setMode] = useState<"book" | "reschedule">("book");
  const [verificationPhone, setVerificationPhone] = useState("");
  const [myBookings, setMyBookings] = useState<MySupportBooking[]>([]);
  const [rescheduling, setRescheduling] = useState<MySupportBooking | null>(null);
  const { toast } = useToast();
  const [cpf, setCpf] = useState("");
  const [student, setStudent] = useState<SupportStudentLookup | null>(null);
  const [cpfChecked, setCpfChecked] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [selected, setSelected] = useState<{ date: string; time: string } | null>(null);
  const [modality, setModality] = useState<"presencial" | "online">("presencial");
  const [completed, setCompleted] = useState<{ name: string; date: string; time: string; modality: "presencial" | "online"; remaining: number } | null>(null);
  const blockingAction = lookingUp || createBooking.isPending || rescheduleBooking.isPending;

  const slotsByDate = useMemo(() => {
    const groups = new Map<string, typeof slots>();
    slots.forEach((slot) => groups.set(slot.slot_date, [...(groups.get(slot.slot_date) || []), slot]));
    return [...groups.entries()];
  }, [slots]);

  const searchCpf = async () => {
    if (cpf.replace(/\D/g, "").length !== 11) {
      toast({ title: "CPF inválido", description: "Informe os 11 dígitos do CPF.", variant: "destructive" });
      return;
    }
    try {
      setLookingUp(true);
      if (mode === "reschedule") {
        const bookings = await listMySupportBookings(cpf, verificationPhone);
        setMyBookings(bookings); setCpfChecked(true); setSelected(null); setRescheduling(null);
        if (!bookings.length) toast({ title: "Nenhuma aula futura encontrada", description: "Confira o CPF e WhatsApp usados no agendamento." });
        return;
      }
      const found = await lookupSupportStudent(cpf);
      setStudent(found);
      setCpfChecked(true);
      setSelected(null);
      if (!found) toast({ title: "Novo aluno", description: "Preencha seu nome e WhatsApp para continuar o agendamento." });
    } catch (error) {
      toast({ title: "Não foi possível consultar", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setLookingUp(false);
    }
  };

  const confirmBooking = async () => {
    if ((mode === "book" && !student && (!newStudentName.trim() || newStudentPhone.replace(/\D/g, "").length < 10)) || (mode === "reschedule" && !rescheduling) || !selected) {
      toast({ title: "Preencha seus dados", description: "Informe nome e WhatsApp para confirmar o suporte.", variant: "destructive" });
      return;
    }
    try {
      const result = mode === "reschedule" && rescheduling ? await rescheduleBooking.mutateAsync({ id: rescheduling.id, cpf, phone: verificationPhone, date: selected.date, time: selected.time, modality }) : await createBooking.mutateAsync({ cpf, date: selected.date, time: selected.time, modality, name: newStudentName.trim(), phone: newStudentPhone.trim() });
      const { error: notificationError } = await supabase.functions.invoke("support-booking-notifications", {
        body: { bookingId: result.id },
      });
      if (notificationError) console.error("Erro ao disparar notificações do suporte:", notificationError);
      setCompleted({ name: result.name, date: result.date, time: result.time, modality, remaining: result.remaining });
      if (student) setStudent({ ...student, used: result.used, remaining: result.remaining });
    } catch (error) {
      toast({ title: mode === "reschedule" ? "Não foi possível remarcar" : "Não foi possível agendar", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  if (completed) {
    return <div className="min-h-screen bg-background text-foreground dot-pattern"><div className="flex min-h-screen items-center justify-center bg-background/90 p-4"><motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl border border-border/60 bg-card/90 p-8 text-center shadow-2xl">
      <img src={avanteLogo} alt="Avante Digital" className="mx-auto h-16 w-auto" />
      <CheckCircle2 className="mx-auto mt-7 h-16 w-16 text-success" />
      <h1 className="mt-5 font-display text-2xl font-bold">Aula de suporte {mode === "reschedule" ? "remarcada" : "agendada"}</h1>
      <p className="mt-2 text-muted-foreground">{completed.name}, sua aula ficou marcada para:</p>
      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-5"><strong className="block text-lg capitalize">{formatDate(completed.date)}</strong><span className="mt-1 block text-2xl font-bold text-primary">{formatTime(completed.time)}</span><Badge variant="secondary" className="mt-3 capitalize">{completed.modality}</Badge></div>
      <p className="mt-4 text-sm text-muted-foreground">Você ainda possui <strong className="text-foreground">{completed.remaining}</strong> {completed.remaining === 1 ? "aula disponível" : "aulas disponíveis"}.</p>
      <Button className="mt-6 w-full" variant="outline" onClick={() => { setCompleted(null); setSelected(null); setRescheduling(null); setMyBookings([]); setCpfChecked(false); }}>Voltar para a agenda</Button>
    </motion.div></div></div>;
  }

  return <div className="min-h-screen bg-background text-foreground dot-pattern">
    {blockingAction && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/75 backdrop-blur-sm" role="status" aria-live="polite" aria-label="Carregando">
      <div className="flex min-w-52 flex-col items-center gap-4 rounded-2xl border border-primary/20 bg-card p-7 shadow-2xl">
        <Loader2 className="h-11 w-11 animate-spin text-primary" />
        <div className="text-center"><p className="font-semibold">{rescheduleBooking.isPending ? "Confirmando remarcação" : createBooking.isPending ? "Confirmando agendamento" : "Consultando cadastro"}</p><p className="mt-1 text-xs text-muted-foreground">Aguarde só um momento...</p></div>
      </div>
    </div>}
    <div className="min-h-screen bg-background/90 px-4 py-8"><div className="mx-auto max-w-4xl">
    <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xl sm:p-8">
      <img src={avanteLogo} alt="Avante Digital" className="h-16 w-auto" />
      <div className="mt-5 flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><GraduationCap className="h-6 w-6" /></div><div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Agenda exclusiva</p><h1 className="mt-1 font-display text-3xl font-bold">Aulas de Suporte</h1><p className="mt-2 text-sm text-muted-foreground">Agende uma aula ou remarque uma aula futura. Cada aluno possui até três aulas; remarcar mantém a mesma aula.</p></div></div>
    </div>

    <div className="mt-5 rounded-2xl border border-border/60 bg-card/90 p-5 sm:p-6">
      <div className="flex flex-wrap gap-2 mb-5">{([{ value: "book", label: "Agendar aula de suporte" }, { value: "reschedule", label: "Remarcar aula de suporte" }] as const).map((option) => <Button key={option.value} variant={mode === option.value ? "default" : "outline"} onClick={() => { setMode(option.value); setStudent(null); setCpfChecked(false); setSelected(null); setRescheduling(null); setMyBookings([]); }}>{option.label}</Button>)}</div>
      {mode === "reschedule" && <div className="mb-4"><Label htmlFor="support-verification-phone">WhatsApp usado no agendamento</Label><Input id="support-verification-phone" value={verificationPhone} onChange={(e) => { setVerificationPhone(e.target.value); setCpfChecked(false); setMyBookings([]); setRescheduling(null); setSelected(null); }} placeholder="DDD + número" inputMode="tel" className="mt-2 h-11" /><p className="text-xs text-muted-foreground mt-2">Confirme seu CPF e WhatsApp para consultar suas aulas futuras. Remarcar não consome outra aula.</p></div>}
      <Label htmlFor="support-cpf">CPF do aluno</Label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input id="support-cpf" value={cpf} onChange={(event) => { setCpf(formatCpf(event.target.value)); setStudent(null); setCpfChecked(false); setSelected(null); setRescheduling(null); setMyBookings([]); }} placeholder="000.000.000-00" className="h-11" onKeyDown={(event) => event.key === "Enter" && void searchCpf()} /><Button className="h-11 gap-2 sm:w-44" onClick={() => void searchCpf()} disabled={lookingUp}>{lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Consultar</Button></div>
      {student && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{student.name}</p><p className="text-sm text-muted-foreground">{student.used} de 3 aulas utilizadas ou agendadas</p></div><Badge className="w-fit" variant={student.remaining > 0 ? "default" : "destructive"}>{student.remaining} restantes</Badge></div>}
      {mode === "book" && !student && cpfChecked && <div className="mt-4 grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:grid-cols-2"><div><Label htmlFor="support-name">Nome completo</Label><Input id="support-name" className="mt-2 h-11 bg-background" value={newStudentName} onChange={(event) => setNewStudentName(event.target.value)} placeholder="Seu nome completo" /></div><div><Label htmlFor="support-phone">WhatsApp</Label><Input id="support-phone" className="mt-2 h-11 bg-background" value={newStudentPhone} onChange={(event) => setNewStudentPhone(event.target.value)} placeholder="55 + DDD + número" inputMode="tel" /></div><p className="text-xs text-muted-foreground sm:col-span-2">Seu CPF será usado somente para controlar o limite de três aulas de suporte.</p></div>}
    </div>

    {mode === "reschedule" && cpfChecked && <div className="mt-5 rounded-2xl border border-border/60 bg-card/90 p-5"><h2 className="font-bold text-lg">Escolha a aula que deseja remarcar</h2>{myBookings.length === 0 ? <p className="mt-3 text-muted-foreground">Nenhuma aula futura encontrada para estes dados.</p> : <div className="grid gap-3 mt-4">{myBookings.map((booking) => <Button key={booking.id} variant={rescheduling?.id === booking.id ? "default" : "outline"} className="h-auto py-4 whitespace-normal justify-start" onClick={() => { setRescheduling(booking); setSelected(null); setModality(booking.modality); }}>{formatDate(booking.date)} às {formatTime(booking.time)} · {booking.modality}</Button>)}</div>}</div>}
    {mode === "book" && student && student.remaining <= 0 ? <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-amber-500" /><h2 className="mt-3 text-lg font-bold">Limite de aulas atingido</h2><p className="mt-1 text-sm text-muted-foreground">As três aulas de suporte vinculadas a este CPF já foram utilizadas ou estão agendadas.</p></div> : ((mode === "book" && (student || cpfChecked)) || (mode === "reschedule" && rescheduling)) ? <div className="mt-5 rounded-2xl border border-border/60 bg-card/90 p-5 sm:p-6">
      <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-bold">Escolha a modalidade, o dia e o horário</h2></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setModality("presencial")} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${modality === "presencial" ? "border-primary bg-primary/10" : "border-border/50 hover:bg-muted/40"}`}><MapPin className="h-5 w-5 text-primary" /><div><p className="font-semibold">Presencial</p><p className="text-xs text-muted-foreground">Aula realizada presencialmente</p></div></button>
        <button type="button" onClick={() => setModality("online")} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${modality === "online" ? "border-primary bg-primary/10" : "border-border/50 hover:bg-muted/40"}`}><Monitor className="h-5 w-5 text-primary" /><div><p className="font-semibold">Online</p><p className="text-xs text-muted-foreground">Aula realizada por chamada</p></div></button>
      </div>
      {loadingSlots ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : slotsByDate.length === 0 ? <p className="py-10 text-center text-muted-foreground">Nenhum horário disponível no momento.</p> : <div className="mt-5 space-y-4">{slotsByDate.map(([date, dateSlots]) => <div key={date} className="rounded-xl border border-border/40 p-4"><p className="font-semibold capitalize">{formatDate(date)}</p><div className="mt-3 flex flex-wrap gap-2">{dateSlots.map((slot) => { const active = selected?.date === date && selected.time === slot.start_time; return <Button key={`${date}-${slot.start_time}`} type="button" variant={active ? "default" : "outline"} className="gap-2" onClick={() => setSelected({ date, time: slot.start_time })}><Clock3 className="h-4 w-4" />{formatTime(slot.start_time)}<span className="text-[10px] opacity-70">{slot.capacity - slot.booked} vaga(s)</span></Button>; })}</div></div>)}</div>}
      {selected && <div className="sticky bottom-3 mt-5 rounded-xl border border-primary/30 bg-background/95 p-4 shadow-xl backdrop-blur"><p className="text-sm text-muted-foreground">Confirmar aula <strong className="capitalize text-foreground">{modality}</strong> em <strong className="capitalize text-foreground">{formatDate(selected.date)}</strong> às <strong className="text-foreground">{formatTime(selected.time)}</strong>?</p><Button className="mt-3 h-11 w-full" onClick={() => void confirmBooking()} disabled={createBooking.isPending || rescheduleBooking.isPending}>{createBooking.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{mode === "reschedule" ? "Confirmar remarcação" : "Confirmar aula de suporte"}</Button></div>}
    </div> : null}
  </div></div></div>;
}
