import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBlockedDates } from "@/hooks/useBlockedDates";
import { useCourseBookings } from "@/hooks/useCourseBookings";
import { useDisabledDays, DAY_LABELS } from "@/hooks/useDisabledDays";
import { useWhatsAppTemplates, useWhatsAppLogs, resendMessage, sendManualMessage, getTypeLabel } from "@/hooks/useWhatsAppAdmin";
import { useWhatsAppTiming, getTimingLabel, formatTimingDescription } from "@/hooks/useWhatsAppTiming";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { format, parse, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";


import {
  Trash2, Loader2, LogOut, CalendarDays, Users, GraduationCap, ClipboardList, Ban,
  MessageSquare, Send, RefreshCw, Edit, Settings, Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { EditableCell } from "@/components/EditableCell";
import { toast } from "sonner";

const COURSES = [
  "Curso Meta Ads",
  "Curso Meta Ads Avançado",
  "Curso Google Ads",
  "Curso Social Media",
  "Curso Inteligência Artificial",
  "Curso Captação e Edição de Vídeo",
];

const SHIFTS = ["Manhã", "Tarde"];
const MAX_STUDENTS = 5;


const fmtDate = (d: string) => {
  try { return format(parse(d, "yyyy-MM-dd", new Date()), "dd/MM/yyyy"); } catch { return d; }
};

const fmtDateWithDay = (d: string) => {
  try {
    const parsed = parse(d, "yyyy-MM-dd", new Date());
    const dayName = format(parsed, "EEEE", { locale: ptBR });
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${format(parsed, "dd/MM/yyyy")}`;
  } catch { return d; }
};

const fmtTime = (time: string) => {
  if (time === "Manhã") return "08:30";
  if (time === "Tarde") return "14:00";
  return time;
};

const fmtDateTime = (d: string | null) => {
  if (!d) return "-";
  try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }); } catch { return d; }
};

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AdminBookings() {
  const { signOut, session } = useAuth();
  const BOOKINGS_ADMINS = [
    "digitalavante3@gmail.com",
    "nicolaspatzlaff02@gmail.com",
    "lucadsilva666@gmail.com",
    "leonardowebster.ja@gmail.com",
  ];
  const isAdmin = !!session?.user?.email && BOOKINGS_ADMINS.includes(session.user.email);
  const { blockedDates, loading: blockedLoading, blockDate, unblockDate, isDateBlocked, getBlocksForDate } = useBlockedDates();
  const { bookings, loading: bookingsLoading, updateBooking, deleteBooking, refetch: refetchBookings } = useCourseBookings();
  const { loading: disabledLoading, toggleDay, isDayDisabled, isShiftOnlyDisabled } = useDisabledDays();
  const { templates, loading: templatesLoading, updateTemplate, refetch: refetchTemplates } = useWhatsAppTemplates();
  const { logs, loading: logsLoading, refetch: refetchLogs } = useWhatsAppLogs();
  const { timings, loading: timingsLoading, updateTiming } = useWhatsAppTiming();

  const [filterCourse, setFilterCourse] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [bookingsSubTab, setBookingsSubTab] = useState<"active" | "completed" | "cancelled">("active");
  const [weekOffset, setWeekOffset] = useState(0);
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockForm, setBlockForm] = useState({ date: "", courseName: "all", shift: "all" });
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editTemplateText, setEditTemplateText] = useState("");
  const [resending, setResending] = useState<string | null>(null);
  const [minAdvanceMinutes, setMinAdvanceMinutes] = useState(60);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [metaExceptions, setMetaExceptions] = useState<Array<{ id: string; date: string; shift: string | null }>>([]);
  const [excDialog, setExcDialog] = useState(false);
  const [excForm, setExcForm] = useState({ date: "", shift: "all" });

  const fetchMetaExceptions = async () => {
    const { data } = await supabase.from("meta_ads_exceptions").select("*").order("date");
    setMetaExceptions((data || []) as any);
  };
  useEffect(() => { fetchMetaExceptions(); }, []);

  const addMetaException = async () => {
    if (!excForm.date) { toast.error("Selecione uma data"); return; }
    const { error } = await supabase.from("meta_ads_exceptions").insert({
      date: excForm.date,
      shift: excForm.shift === "all" ? null : excForm.shift,
    });
    if (error) { toast.error("Erro ao adicionar exceção"); return; }
    toast.success("Exceção criada");
    setExcDialog(false);
    fetchMetaExceptions();
  };

  const removeMetaException = async (id: string) => {
    const { error } = await supabase.from("meta_ads_exceptions").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Exceção removida");
    fetchMetaExceptions();
  };

  // Load booking settings
  useEffect(() => {
    supabase.from("booking_settings").select("*").limit(1).single().then(({ data }) => {
      if (data) setMinAdvanceMinutes(data.min_advance_minutes);
    });
  }, []);

  const handleSaveAdvance = async () => {
    setSavingAdvance(true);
    const { error } = await supabase
      .from("booking_settings")
      .update({ min_advance_minutes: minAdvanceMinutes, updated_at: new Date().toISOString() })
      .not("id", "is", null);
    setSavingAdvance(false);
    if (error) {
      toast.error("Erro ao salvar configuração");
    } else {
      toast.success("Tempo mínimo de antecedência atualizado!");
    }
  };

  const loading = blockedLoading || bookingsLoading || disabledLoading;

  // Week navigation
  const today = new Date();
  const currentWeekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const openBlockDialog = (dateStr?: string) => {
    setBlockForm({ date: dateStr || "", courseName: "all", shift: "all" });
    setBlockDialog(true);
  };

  const handleBlock = async () => {
    await blockDate(
      blockForm.date,
      blockForm.courseName === "all" ? null : blockForm.courseName,
      blockForm.shift === "all" ? null : blockForm.shift
    );
    setBlockDialog(false);
  };

  const getBookingCount = (date: string, courseName: string, shift: string) => {
    return bookings.filter(b => b.date === date && b.courseName === courseName && b.time === shift && b.status === "confirmed").length;
  };

  const allFilteredBookings = bookings
    .filter(b => {
      if (filterCourse && b.courseName !== filterCourse) return false;
      if (searchStudent && !b.studentName.toLowerCase().includes(searchStudent.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const activeBookings = allFilteredBookings.filter(b => b.courseStatus !== "concluído" && b.courseStatus !== "cancelado");
  const completedBookings = allFilteredBookings.filter(b => b.courseStatus === "concluído");
  const cancelledBookings = allFilteredBookings.filter(b => b.courseStatus === "cancelado");

  const handleCourseStatusChange = async (bookingId: string, newStatus: string) => {
    await updateBooking(bookingId, { courseStatus: newStatus });

    // If marking as cancelled, also cancel scheduled messages
    if (newStatus === "cancelado") {
      await supabase
        .from("whatsapp_scheduled_messages")
        .update({ status: "cancelled" })
        .eq("booking_id", bookingId)
        .eq("status", "pending");
    }
  };

  const handleResend = async (log: any) => {
    setResending(log.id);
    await resendMessage(log);
    setResending(null);
    refetchLogs();
  };

  const handleManualSend = async (booking: any, messageType: string) => {
    await sendManualMessage(booking.phone, booking.id, messageType, booking.studentName, booking.courseName);
    refetchLogs();
  };

  const handleSaveTemplate = async (id: string) => {
    await updateTemplate(id, { messageTemplate: editTemplateText });
    setEditingTemplate(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Gestão de Agendamentos</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">Clientes</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/tasks">Tarefas</Link>
          </Button>
          {session?.user?.email === "digitalavante3@gmail.com" && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">Configurações</Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterCourse} onValueChange={v => setFilterCourse(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[250px]"><SelectValue placeholder="Filtrar por curso" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cursos</SelectItem>
              {COURSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue={isAdmin ? "availability" : "bookings"} className="space-y-4">
          <TabsList className="flex-wrap">
            {isAdmin && <TabsTrigger value="availability" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Disponibilidade</TabsTrigger>}
            {isAdmin && <TabsTrigger value="weekdays" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Dias da Semana</TabsTrigger>}
            <TabsTrigger value="bookings" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Agendamentos</TabsTrigger>
            {isAdmin && <TabsTrigger value="whatsapp-templates" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Mensagens</TabsTrigger>}
            <TabsTrigger value="whatsapp-logs" className="gap-1.5"><Send className="h-3.5 w-3.5" /> Logs de Envio</TabsTrigger>
            {isAdmin && <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Configurações</TabsTrigger>}
          </TabsList>

          {/* Availability Tab */}
          <TabsContent value="availability">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Calendário de Disponibilidade</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openBlockDialog()}>
                    <Ban className="h-4 w-4 mr-1" /> Bloquear Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500" /> Disponível</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/20 border border-destructive" /> Bloqueado</span>
                  <span className="text-xs">Padrão: todos os dias liberados, {MAX_STUDENTS} vagas por turno</span>
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>← Semana anterior</Button>
                  <span className="text-sm font-medium">
                    {format(currentWeekStart, "dd/MM", { locale: ptBR })} — {format(currentWeekEnd, "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>Semana seguinte →</Button>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map(day => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isPast = isBefore(day, startOfDay(today));
                    const coursesToShow = filterCourse ? [filterCourse] : COURSES;
                    const blocks = getBlocksForDate(dateStr, filterCourse || undefined);
                    const hasAnyBlock = blocks.length > 0;

                    return (
                      <div key={dateStr} className={`border rounded-lg p-2 min-h-[120px] ${isPast ? "opacity-40" : ""} ${hasAnyBlock ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
                        <div className="text-xs font-medium text-center mb-1">
                          {DAY_NAMES[day.getDay()]} {format(day, "dd/MM")}
                        </div>
                        {!isPast && (
                          <div className="space-y-1">
                            {SHIFTS.map(shift => {
                              const allBlocked = filterCourse
                                ? isDateBlocked(dateStr, filterCourse, shift)
                                : COURSES.every(c => isDateBlocked(dateStr, c, shift));

                              const totalBooked = coursesToShow.reduce((acc, c) => {
                                if (isDateBlocked(dateStr, c, shift)) return acc;
                                return acc + getBookingCount(dateStr, c, shift);
                              }, 0);

                              return (
                                <div key={shift} className={`text-xs px-1.5 py-1 rounded flex items-center justify-between ${allBlocked ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>
                                  <span>{shift === "Manhã" ? "☀️" : "☁️"} {shift === "Manhã" ? "08:30" : "14:00"}</span>
                                  {allBlocked ? <Ban className="h-3 w-3" /> : <span>{totalBooked > 0 ? `${totalBooked}` : ""}</span>}
                                </div>
                              );
                            })}
                            {!isPast && (
                              <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={() => openBlockDialog(dateStr)}>
                                {hasAnyBlock ? "Gerenciar" : "Bloquear"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {blockedDates.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Datas Bloqueadas</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Curso</TableHead>
                          <TableHead>Turno</TableHead>
                          <TableHead className="w-[80px]">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blockedDates.map(b => (
                          <TableRow key={b.id}>
                            <TableCell>{fmtDate(b.date)}</TableCell>
                            <TableCell>{b.courseName || "Todos os cursos"}</TableCell>
                            <TableCell>{b.shift || "Ambos"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => unblockDate(b.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4" /> Exceções Meta Ads (Básico + Avançado no mesmo período)
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => { setExcForm({ date: "", shift: "all" }); setExcDialog(true); }}>
                  Adicionar exceção
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Por padrão, Curso Meta Ads e Meta Ads Avançado não podem ser agendados no mesmo dia e turno. Adicione exceções para liberar essa regra em datas específicas.
                </p>
                {metaExceptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma exceção cadastrada.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Turno</TableHead>
                        <TableHead className="w-[80px]">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metaExceptions.map(e => (
                        <TableRow key={e.id}>
                          <TableCell>{fmtDate(e.date)}</TableCell>
                          <TableCell>{e.shift || "Ambos"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMetaException(e.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Dialog open={excDialog} onOpenChange={setExcDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova exceção Meta Ads</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Data</label>
                    <Input type="date" value={excForm.date} onChange={e => setExcForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Turno</label>
                    <Select value={excForm.shift} onValueChange={v => setExcForm(f => ({ ...f, shift: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Ambos os turnos</SelectItem>
                        <SelectItem value="Manhã">Manhã</SelectItem>
                        <SelectItem value="Tarde">Tarde</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setExcDialog(false)}>Cancelar</Button>
                  <Button onClick={addMetaException}>Adicionar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Weekdays Tab */}
          <TabsContent value="weekdays">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Dias da Semana por Curso</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Controle a disponibilidade por dia inteiro ou por turno individual. Itens desativados não aparecerão para os alunos.
                </p>
                <div className="space-y-4">
                  {COURSES.map(course => (
                    <div key={course} className="border rounded-lg p-4">
                      <h3 className="text-sm font-semibold mb-3">{course}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left pr-2 pb-2 text-muted-foreground font-medium text-xs">Turno</th>
                              {DAY_LABELS.map((label, i) => (
                                <th key={i} className="text-center pb-2 px-1 text-muted-foreground font-medium text-xs min-w-[50px]">{label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="pr-2 py-1 text-xs font-medium whitespace-nowrap">Dia inteiro</td>
                              {DAY_LABELS.map((_, dayIndex) => {
                                const off = isDayDisabled(course, dayIndex);
                                return (
                                  <td key={dayIndex} className="text-center px-1 py-1">
                                    <Button
                                      variant={off ? "destructive" : "outline"}
                                      size="sm"
                                      className={`w-full min-w-[44px] h-7 text-xs ${!off ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10" : ""}`}
                                      onClick={() => toggleDay(course, dayIndex, null)}
                                    >
                                      {off ? "Off" : "On"}
                                    </Button>
                                  </td>
                                );
                              })}
                            </tr>
                            {["08:30", "14:00"].map(shift => (
                              <tr key={shift}>
                                <td className="pr-2 py-1 text-xs font-medium whitespace-nowrap">{shift}</td>
                                {DAY_LABELS.map((_, dayIndex) => {
                                  const fullOff = isDayDisabled(course, dayIndex);
                                  const shiftOff = isShiftOnlyDisabled(course, dayIndex, shift);
                                  return (
                                    <td key={dayIndex} className="text-center px-1 py-1">
                                      <Button
                                        variant={fullOff || shiftOff ? "destructive" : "outline"}
                                        size="sm"
                                        disabled={fullOff}
                                        className={`w-full min-w-[44px] h-7 text-xs ${!fullOff && !shiftOff ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10" : ""}`}
                                        onClick={() => toggleDay(course, dayIndex, shift)}
                                      >
                                        {fullOff ? "—" : shiftOff ? "Off" : "On"}
                                      </Button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab - Updated with course status */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Alunos</CardTitle>
                <Button variant="outline" size="sm" onClick={refetchBookings}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar aluno..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Tabs value={bookingsSubTab} onValueChange={(v) => setBookingsSubTab(v as "active" | "completed" | "cancelled")}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="active" className="gap-1">
                      <Users className="h-3.5 w-3.5" /> Agendados ({activeBookings.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="gap-1">
                      <GraduationCap className="h-3.5 w-3.5" /> Concluídos ({completedBookings.length})
                    </TabsTrigger>
                    <TabsTrigger value="cancelled" className="gap-1">
                      <Ban className="h-3.5 w-3.5" /> Cancelados ({cancelledBookings.length})
                    </TabsTrigger>
                  </TabsList>

                  {(["active", "completed", "cancelled"] as const).map((tab) => {
                    const list = tab === "active" ? activeBookings : tab === "completed" ? completedBookings : cancelledBookings;
                    const emptyMsg = tab === "active"
                      ? "Nenhum agendamento encontrado."
                      : tab === "completed"
                      ? "Nenhum aluno concluído encontrado."
                      : "Nenhum curso cancelado encontrado.";
                    return (
                      <TabsContent key={tab} value={tab}>
                        {list.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">{emptyMsg}</p>
                        ) : (
                          <div className="w-full">
                            <Table className="text-xs [&_th]:h-8 [&_th]:px-2 [&_th]:text-[11px] [&_td]:p-2 [&_td]:align-middle table-fixed">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[90px]">Curso</TableHead>
                                  <TableHead className="w-[80px]">Data</TableHead>
                                  <TableHead className="w-[55px]">Hora</TableHead>
                                  <TableHead className="w-[130px]">Aluno</TableHead>
                                  <TableHead className="w-[170px]">E-mail</TableHead>
                                  <TableHead className="w-[110px]">Instagram</TableHead>
                                  <TableHead className="w-[100px]">Telefone</TableHead>
                                  <TableHead className="w-[120px]">Nome Cert.</TableHead>
                                  <TableHead className="w-[110px]">Status</TableHead>
                                  {isAdmin && tab === "active" && <TableHead className="w-[100px]">WhatsApp</TableHead>}
                                  {isAdmin && <TableHead className="w-[60px]">Ações</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {list.map(b => (
                                  <TableRow key={b.id}>
                                    <TableCell className="font-medium truncate" title={b.courseName}>{b.courseName.replace(/^Curso\s+/, "")}</TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <EditableCell
                                        value={b.date}
                                        type="date"
                                        onSave={(v) => updateBooking(b.id, { date: v })}
                                        renderDisplay={(v) => v ? fmtDate(v) : "—"}
                                      />
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{fmtTime(b.time)}</TableCell>
                                    <TableCell className="truncate" title={b.studentName}>
                                      <EditableCell value={b.studentName} onSave={(v) => updateBooking(b.id, { studentName: v })} placeholder="Nome" />
                                    </TableCell>
                                    <TableCell className="truncate" title={b.email}>
                                      <EditableCell value={b.email} type="email" onSave={(v) => updateBooking(b.id, { email: v })} placeholder="email@..." />
                                    </TableCell>
                                    <TableCell className="truncate">
                                      <EditableCell
                                        value={b.instagram}
                                        onSave={(v) => updateBooking(b.id, { instagram: v })}
                                        placeholder="@usuario"
                                        renderDisplay={(v) => v ? (
                                          <a
                                            href={`https://instagram.com/${v.replace("@", "")}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-primary hover:underline truncate block"
                                          >
                                            {v.startsWith("@") ? v : `@${v}`}
                                          </a>
                                        ) : <span className="text-muted-foreground italic">—</span>}
                                      />
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <EditableCell value={b.phone} onSave={(v) => updateBooking(b.id, { phone: v })} placeholder="55..." />
                                    </TableCell>
                                    <TableCell className="truncate" title={b.certificateName || b.studentName}>
                                      <EditableCell
                                        value={b.certificateName}
                                        onSave={(v) => updateBooking(b.id, { certificateName: v })}
                                        placeholder={b.studentName}
                                        renderDisplay={(v) => <span className="truncate block">{v || b.studentName}</span>}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={b.courseStatus || "confirmado"}
                                        onValueChange={(v) => handleCourseStatusChange(b.id, v)}
                                      >
                                        <SelectTrigger className="w-full h-7 text-[11px] px-2">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="a confirmar">⏳ A Confirmar</SelectItem>
                                          <SelectItem value="confirmado">✅ Confirmado</SelectItem>
                                          <SelectItem value="concluído">🎓 Concluído</SelectItem>
                                          <SelectItem value="cancelado">❌ Cancelado</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    {isAdmin && tab === "active" && (
                                      <TableCell>
                                        <Select onValueChange={(v) => handleManualSend(b, v)}>
                                          <SelectTrigger className="w-full h-7 text-[11px] px-2">
                                            <SelectValue placeholder="Enviar..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="confirmation">Confirmação</SelectItem>
                                            <SelectItem value="reminder_24h">Lembrete 24h</SelectItem>
                                            <SelectItem value="reminder_1h">Lembrete 1h</SelectItem>
                                            <SelectItem value="post_course">Pós-curso</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                    )}
                                    {isAdmin && (
                                      <TableCell>
                                        <div className="flex gap-0.5">
                                          {tab === "active" && b.status === "confirmed" && b.courseStatus !== "cancelado" && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateBooking(b.id, { status: "cancelled" })}>
                                              <Ban className="h-3.5 w-3.5" />
                                            </Button>
                                          )}
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBooking(b.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Templates Tab */}
          <TabsContent value="whatsapp-templates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Templates de Mensagens</CardTitle>
                <Button variant="outline" size="sm" onClick={refetchTemplates}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
                </Button>
              </CardHeader>
              <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                  Edite os templates de mensagem. Use as variáveis: <code className="bg-muted px-1 rounded">{"{{nome}}"}</code>, <code className="bg-muted px-1 rounded">{"{{curso}}"}</code>, <code className="bg-muted px-1 rounded">{"{{data_agendamento}}"}</code>
                </p>

                {/* Timing Config */}
                <div className="mb-6 border rounded-lg p-4 bg-muted/30">
                  <h3 className="text-sm font-semibold mb-3">⏱️ Tempo de Envio</h3>
                  {timingsLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {timings.map(t => (
                        <div key={t.id} className="border rounded-lg p-3 bg-background space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">{getTimingLabel(t.messageType)}</p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              value={t.offsetValue}
                              onChange={e => {
                                const val = parseInt(e.target.value);
                                if (val > 0) updateTiming(t.id, { offsetValue: val });
                              }}
                              className="w-20 h-8 text-sm"
                            />
                            <Select
                              value={t.offsetUnit}
                              onValueChange={v => updateTiming(t.id, { offsetUnit: v as "hours" | "days" })}
                            >
                              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hours">Horas</SelectItem>
                                <SelectItem value="days">Dias</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{t.direction === "before" ? "antes" : "depois"}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatTimingDescription(t)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {templatesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                <div className="space-y-4">
                    {templates.map(t => (
                      <div key={t.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-sm">{getTypeLabel(t.type)}</h3>
                            <Badge variant={t.isActive ? "default" : "secondary"}>
                              {t.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Ativo</span>
                              <Switch
                                checked={t.isActive}
                                onCheckedChange={(checked) => updateTemplate(t.id, { isActive: checked })}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTemplate(t.id);
                                setEditTemplateText(t.messageTemplate);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                            </Button>
                          </div>
                        </div>
                        {editingTemplate === t.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editTemplateText}
                              onChange={(e) => setEditTemplateText(e.target.value)}
                              rows={6}
                              className="font-mono text-sm"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>Cancelar</Button>
                              <Button size="sm" onClick={() => handleSaveTemplate(t.id)}>Salvar</Button>
                            </div>
                          </div>
                        ) : (
                          <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded p-3">{t.messageTemplate}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Logs Tab */}
          <TabsContent value="whatsapp-logs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Logs de Envio WhatsApp</CardTitle>
                <Button variant="outline" size="sm" onClick={refetchLogs}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum log de envio encontrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Aluno</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Curso</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map(log => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm">{fmtDateTime(log.sentAt || log.createdAt)}</TableCell>
                            <TableCell>{log.studentName}</TableCell>
                            <TableCell>{log.phone}</TableCell>
                            <TableCell className="text-sm">{log.courseName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getTypeLabel(log.messageType)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={log.status === "sent" ? "default" : log.status === "error" ? "destructive" : "secondary"}>
                                {log.status === "sent" ? "✅ Enviado" : log.status === "error" ? "❌ Erro" : "⏳ Pendente"}
                              </Badge>
                              {log.errorMessage && (
                                <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={log.errorMessage}>{log.errorMessage}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={resending === log.id}
                                onClick={() => handleResend(log)}
                                title="Reenviar"
                              >
                                {resending === log.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Agendamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-3 max-w-md">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Tempo mínimo de antecedência (minutos)</label>
                    <Input
                      type="number"
                      min={0}
                      value={minAdvanceMinutes}
                      onChange={e => setMinAdvanceMinutes(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      O aluno precisa agendar com pelo menos {minAdvanceMinutes} minutos de antecedência do horário do curso.
                    </p>
                  </div>
                  <Button onClick={handleSaveAdvance} disabled={savingAdvance}>
                    {savingAdvance ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Block Date Dialog */}
      <Dialog open={blockDialog} onOpenChange={setBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Data *</label>
              <Input type="date" value={blockForm.date} onChange={e => setBlockForm({ ...blockForm, date: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Curso</label>
              <Select value={blockForm.courseName} onValueChange={v => setBlockForm({ ...blockForm, courseName: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cursos</SelectItem>
                  {COURSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Turno</label>
              <Select value={blockForm.shift} onValueChange={v => setBlockForm({ ...blockForm, shift: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Ambos (Manhã e Tarde)</SelectItem>
                  <SelectItem value="Manhã">Manhã</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(false)}>Cancelar</Button>
            <Button onClick={handleBlock} disabled={!blockForm.date}>Bloquear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
