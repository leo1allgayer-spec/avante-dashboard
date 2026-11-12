import {COURSE_NAMES_BY_TYPE,findCourse} from '@/constants/courseCatalog';
import { saveCourseStudent } from "@/lib/saveCourseStudent";
import {transferCourseInstructor} from '@/lib/transferCourseInstructor';
import {studentCourseIdentity} from '@/lib/surveyCourseOptions';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import { useState, useMemo, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, GraduationCap, ChevronLeft, ChevronRight, X, Users, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

const financialEmails = new Set(["digitalavante3@gmail.com", "nicolaspatzlaff02@gmail.com", "lucadsilva666@gmail.com", "leonardowebster.ja@gmail.com"]);
const paymentKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\bde\b/g, " ").replace(/\bmidia\b/g, "media").replace(/\s+/g, " ").trim();
type CoursePayment = { student_name: string; course_name: string; remaining: number | null };

interface AllEnrollment {
  id: string;
  enrollmentId?: string;
  bookingId?: string;
  source: "enrollment" | "booking";
  studentName: string;
  contact: string;
  email: string;
  instagram: string;
  certificateName: string;
  certificateReady: boolean;
  date: string;
  time: string;
  courseType: string;
  instructor?: string;
  courseStatus?: string;
  bookingStatus?: string;
}

const STATUS_COLORS: Record<string, string> = {
  "a confirmar": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "confirmado": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "cancelado": "bg-red-500/15 text-red-400 border-red-500/30",
  "realizado": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "faltou": "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

const COURSE_LABELS:Record<string,string> = COURSE_NAMES_BY_TYPE;

const COURSE_COLORS: Record<string, string> = {
  google: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  social_media: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  meta_ads: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  meta_ads_online: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  meta_ads_advanced: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  canva: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  ia: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  video: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const COURSE_TYPE_TO_NAME:Record<string,string> = COURSE_NAMES_BY_TYPE;
const courseTypeFromName=(name:string)=>findCourse(name)?.id||'other';

const emptyForm = { studentName: "", contact: "", email: "", instagram: "", date: "", time: "" };

export function AllCoursesSection() {
  const { session } = useAuth();
  const canSeePayments = financialEmails.has((session?.user.email || "").toLowerCase());
  const payments = useQuery({
    queryKey: ["course-payment-summary", session?.user.id],
    enabled: canSeePayments,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("course_payment_summary");
      if (error) throw error;
      return data as CoursePayment[];
    },
  });
  const paymentLabel = (enrollment: AllEnrollment) => {
    if (payments.isPending) return "Carregando pagamento…";
    if (payments.isError) return "Pagamento indisponível";
    const matches = (payments.data || []).filter((p) => paymentKey(p.student_name) === paymentKey(enrollment.studentName) && studentCourseIdentity(p.course_name) === studentCourseIdentity(COURSE_TYPE_TO_NAME[enrollment.courseType] || enrollment.courseType));
    if (matches.length !== 1 || matches[0].remaining === null) return "Pagamento não identificado";
    const remaining = Number(matches[0].remaining);
    return remaining === 0 ? "Pago integralmente" : `Falta pagar ${remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
  };
  const [enrollments, setEnrollments] = useState<AllEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { locale: ptBR }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [savingEdit, setSavingEdit] = useState(false);
  const [editing, setEditing] = useState<AllEnrollment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [changingInstructor,setChangingInstructor]=useState<AllEnrollment|null>(null);
  const [selectedInstructorBookings,setSelectedInstructorBookings]=useState<string[]>([]);
  const [nextInstructor,setNextInstructor]=useState('');
  const [savingInstructor,setSavingInstructor]=useState(false);
  const [instructorError,setInstructorError]=useState('');
  const shiftKey=(time:string)=>/^(manhã|manha)$/i.test(time.trim())||(/^\d{2}:\d{2}/.test(time.trim())&&Number(time.trim().slice(0,2))<12)?'Manhã':'Tarde';
  const instructorClass=changingInstructor?enrollments.filter(row=>row.bookingId&&row.bookingStatus==='confirmed'&&row.courseType===changingInstructor.courseType&&row.date===changingInstructor.date&&shiftKey(row.time)===shiftKey(changingInstructor.time)&&row.instructor===changingInstructor.instructor&&!['cancelado','concluído','concluido','realizado','faltou'].includes(row.courseStatus||'')):[];
  const saveInstructor=async()=>{
    if(!changingInstructor?.bookingId||!nextInstructor||savingInstructor||!selectedInstructorBookings.length)return;
    setSavingInstructor(true);setInstructorError('');
    try{
      const result=await transferCourseInstructor(supabase,selectedInstructorBookings[0],nextInstructor,changingInstructor.instructor,changingInstructor.date,changingInstructor.time,selectedInstructorBookings);
      if(result.warning)toast.warning('Professor alterado; aviso não confirmado',{description:result.warning});
      else toast.success(result.changed?`Professor alterado para ${nextInstructor}. Aviso enviado por WhatsApp.`:'A turma já está com esse professor.');
      setChangingInstructor(null);await fetchAll();
    }catch(error){setInstructorError(error instanceof Error?error.message:'Não foi possível trocar o professor.');}
    finally{setSavingInstructor(false);}
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: bookings, error: bookingsError }] = await Promise.all([
      supabase.from("course_enrollments").select("*").order("date", { ascending: false }),
      supabase
        .from("course_bookings")
        .select("id,student_name,course_name,date,time,course_status,status,email,phone,instagram,certificate_name,certificate_ready,instructor")
        .order("date", { ascending: false }),
    ]);
    if (error && bookingsError) {
      toast.error("Erro ao carregar cursos");
      setEnrollments([]);
      setLoading(false);
      return;
    }

    if (error || bookingsError) {
      toast.warning("Alguns agendamentos podem não ter carregado");
    }

      const bookingMap = new Map<string, any>();
      (bookings || []).forEach((b: any) => {
        const t = courseTypeFromName(b.course_name);
        const key = `${b.student_name}|${t}|${b.date}|${b.time}`;
        bookingMap.set(key, b);
      });
      const enrollmentRows: AllEnrollment[] = (data || []).map((r: any) => {
        const booking = bookingMap.get(`${r.student_name}|${r.course_type}|${r.date}|${r.time}`);
        return {
          id: r.id,
          enrollmentId: r.id,
          bookingId: booking?.id,
          source: "enrollment",
          studentName: r.student_name,
          contact: r.contact || "",
          email: r.email || "",
          instagram: r.instagram || "",
          certificateName: booking?.certificate_name || r.student_name || "",
          certificateReady: Boolean(booking?.certificate_ready ?? r.certificate_ready),
          date: r.date || "",
          time: r.time || "",
          courseType: r.course_type,
          courseStatus: booking?.course_status,
          bookingStatus: booking?.status,
          instructor: booking?.instructor || undefined,
        };
      });

      const enrollmentKeys = new Set(
        enrollmentRows.map(e => `${e.studentName.trim().toLowerCase()}|${e.courseType}|${e.date}|${e.time}`)
      );
      const bookingRows: AllEnrollment[] = (bookings || [])
        .map((b: any) => {
          const courseType = courseTypeFromName(b.course_name);
          return {
            id: `booking:${b.id}`,
            bookingId: b.id,
            source: "booking" as const,
            studentName: b.student_name || b.certificate_name || "",
            contact: b.phone || "",
            email: b.email || "",
            instagram: b.instagram || "",
            certificateName: b.certificate_name || b.student_name || "",
            certificateReady: Boolean(b.certificate_ready),
            date: b.date || "",
            time: b.time || "",
            courseType,
            instructor: b.instructor || undefined,
            courseStatus: b.course_status || "a confirmar",
            bookingStatus: b.status,
          };
        })
        .filter((b: AllEnrollment) => {
          const key = `${b.studentName.trim().toLowerCase()}|${b.courseType}|${b.date}|${b.time}`;
          return !enrollmentKeys.has(key);
        });

      setEnrollments([...enrollmentRows, ...bookingRows]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel("all-enrollments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "course_enrollments" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "course_bookings" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const handleDelete = async (e: AllEnrollment) => {
    if (!confirm(`Excluir o aluno "${e.studentName}" deste curso?`)) return;
    if (e.source === "booking" && e.bookingId) {
      const { error } = await supabase.from("course_bookings").delete().eq("id", e.bookingId);
      if (error) {
        toast.error("Erro ao excluir agendamento");
        return;
      }
      toast.success("Agendamento excluído");
      fetchAll();
      return;
    }

    const { error } = await supabase.from("course_enrollments").delete().eq("id", e.id);
    if (error) {
      toast.error("Erro ao excluir inscrição");
      return;
    }
    const courseName = COURSE_TYPE_TO_NAME[e.courseType];
    if (courseName && e.date) {
      let q = supabase
        .from("course_bookings")
        .delete()
        .eq("course_name", courseName)
        .eq("date", e.date);
      const filters: string[] = [];
      if (e.email) filters.push(`email.eq.${e.email.trim().toLowerCase()}`);
      if (e.contact) filters.push(`phone.eq.${e.contact.trim()}`);
      if (e.studentName) filters.push(`student_name.eq.${e.studentName.trim()}`);
      if (filters.length) q = q.or(filters.join(","));
      const { error: delErr } = await q;
      if (delErr) console.error("Erro ao excluir booking relacionado:", delErr);
    }
    toast.success("Aluno excluído");
    fetchAll();
  };

  const handleCertificateReady = async (enrollment: AllEnrollment, checked: boolean) => {
    setEnrollments((current) => current.map((item) => item.id === enrollment.id ? { ...item, certificateReady: checked } : item));
    const updates: Array<PromiseLike<{ error: unknown }>> = [];
    if (enrollment.enrollmentId) {
      updates.push(supabase.from("course_enrollments").update({ certificate_ready: checked }).eq("id", enrollment.enrollmentId));
    }
    if (enrollment.bookingId) {
      updates.push(supabase.from("course_bookings").update({ certificate_ready: checked }).eq("id", enrollment.bookingId));
    }
    const results = await Promise.all(updates);
    if (results.some((result) => result.error)) {
      setEnrollments((current) => current.map((item) => item.id === enrollment.id ? { ...item, certificateReady: !checked } : item));
      toast.error("Não foi possível atualizar o certificado");
      return;
    }
    toast.success(checked ? "Certificado marcado como pronto" : "Certificado marcado como pendente");
  };

  const openEdit = (e: AllEnrollment) => {
    setEditing(e);
    setForm({
      studentName: e.studentName,
      contact: e.contact,
      email: e.email,
      instagram: e.instagram,
      date: e.date,
      time: e.time,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing || savingEdit) return;
    setSavingEdit(true);
    try {
      const result = await saveCourseStudent(supabase, editing, form);
      if (result.warning) toast.warning(result.warning);
      else toast.success(result.rescheduled ? "Nova data salva e enviada pelo WhatsApp" : "Aluno atualizado");
      setEditing(null);
      await fetchAll();
    } catch (error) {
      toast.error("Erro ao atualizar aluno", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally { setSavingEdit(false); }
  };

  const enrollmentsByDate = useMemo(() => {
    const map: Record<string, AllEnrollment[]> = {};
    enrollments.forEach((e) => {
      if (e.date) {
        if (!map[e.date]) map[e.date] = [];
        map[e.date].push(e);
      }
    });
    const timeKey = (t: string) => {
      const v = t === "Manhã" ? "08:30" : t === "Tarde" ? "14:00" : t || "";
      const m = v.match(/^(\d{1,2}):(\d{2})/);
      return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 9999;
    };
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => timeKey(a.time) - timeKey(b.time));
    });
    return map;
  }, [enrollments]);

  const weekDays = useMemo(() => {
    const end = endOfWeek(currentWeekStart, { locale: ptBR });
    return eachDayOfInterval({ start: currentWeekStart, end });
  }, [currentWeekStart]);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedEnrollments = selectedDateStr ? (enrollmentsByDate[selectedDateStr] || []) : [];

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { locale: ptBR }));
    setSelectedDate(new Date());
  };

  const weekLabel = `${format(weekDays[0], "dd/MM")} — ${format(weekDays[weekDays.length - 1], "dd/MM/yyyy")}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" /> Todos os Cursos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4 gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 min-w-0">
            <h3 className="text-sm sm:text-lg font-semibold truncate">{weekLabel}</h3>
            <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs h-7 px-2">Hoje</Button>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 xl:gap-4">
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayEnrollments = enrollmentsByDate[dateStr] || [];
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const hasEnrollments = dayEnrollments.length > 0;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={cn(
                  "relative p-1.5 sm:p-3 md:p-4 xl:p-5 min-h-[64px] sm:min-h-[90px] md:min-h-[110px] xl:min-h-[128px] rounded-lg border text-left transition-colors flex flex-col",
                  "hover:bg-accent/50",
                  isSelected && "ring-2 ring-primary border-primary bg-transparent",
                  isToday && !isSelected && "border-primary bg-primary/5",
                  !isSelected && !isToday && "border-border"
                )}
              >
                <span className="block text-[9px] sm:text-[10px] md:text-xs font-medium text-muted-foreground uppercase truncate">
                  <span className="sm:hidden">{["D", "S", "T", "Q", "Q", "S", "S"][day.getDay()]}</span>
                  <span className="hidden sm:inline">{format(day, "EEE", { locale: ptBR })}</span>
                </span>
                <span className={cn("text-sm sm:text-lg md:text-xl xl:text-2xl font-semibold", isToday && "text-primary")}>
                  {format(day, "dd")}
                </span>
                {hasEnrollments && (
                  <div className="mt-auto flex items-center justify-center gap-0.5 md:gap-1">
                    <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-primary" />
                    <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-primary">{dayEnrollments.length}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-4 border rounded-lg p-2 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4 gap-2">
              <h4 className="text-sm sm:text-base md:text-lg font-semibold capitalize">
                {format(selectedDate, "EEEE, dd/MM/yyyy", { locale: ptBR })}
              </h4>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => setSelectedDate(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {selectedEnrollments.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhum aluno neste dia.</p>
            ) : (
              <div className="space-y-2">
                {selectedEnrollments.map((e) => (
                  <div key={e.id} className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 rounded-md bg-muted/50 border">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[90px_1fr_1fr_1.35fr_0.9fr_1fr_90px_100px_100px] gap-2 sm:gap-2 md:gap-3 text-xs sm:text-sm md:text-sm">
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Curso</span>
                        <div className="mt-0.5">
                          <Badge variant="outline" className={cn("max-w-full whitespace-normal break-words text-left leading-tight text-[10px] sm:text-xs md:text-xs", COURSE_COLORS[e.courseType])}>
                            {COURSE_LABELS[e.courseType] || e.courseType}
                          </Badge>
                          {e.instructor && <p className="mt-1 text-xs font-medium text-sky-400">Prof. {e.instructor}</p>}
                          {canSeePayments&&e.bookingId&&e.bookingStatus==='confirmed'&&['meta_ads','meta_ads_advanced','meta_ads_online','video'].includes(e.courseType)&&!['cancelado','concluído','concluido','realizado','faltou'].includes(e.courseStatus||'')&&<button type="button" className="mt-1 text-left text-[11px] text-primary underline underline-offset-2" onClick={()=>{setChangingInstructor(e);setSelectedInstructorBookings([e.bookingId!]);setNextInstructor(e.instructor||'');setInstructorError('');}} aria-label={`Trocar professor da turma de ${e.studentName}`}>Trocar professor</button>}
                          {e.courseType === 'meta_ads_online' && <Badge variant="outline" className="mt-1 border-teal-500/40 bg-teal-500/15 text-teal-400 text-[10px] sm:text-xs">Online</Badge>}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Aluno</span>
                        <p className="font-medium break-words md:leading-tight">{e.studentName}</p>
                        {canSeePayments && <p className={cn("mt-1 text-xs font-semibold", paymentLabel(e) === "Pago integralmente" ? "text-emerald-400" : "text-amber-400")}>{paymentLabel(e)}</p>}
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Contato</span>
                        <p className="break-words md:leading-tight">{e.contact || "—"}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Email</span>
                        <p className="truncate">{e.email || "—"}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Instagram</span>
                        <p className="truncate">
                          {e.instagram ? (
                            <a
                              href={`https://instagram.com/${e.instagram.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {e.instagram.startsWith("@") ? e.instagram : `@${e.instagram}`}
                            </a>
                          ) : "—"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Nome no certificado</span>
                        <p className="break-words font-medium md:leading-tight">{e.certificateName || e.studentName}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Horário</span>
                        <p className="truncate">{e.time === "Manhã" ? "08:30" : e.time === "Tarde" ? "14:00" : e.time}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Status</span>
                        <div className="mt-0.5">
                          {e.courseStatus ? (
                            <Badge variant="outline" className={cn("text-[10px] sm:text-xs md:text-xs capitalize", STATUS_COLORS[e.courseStatus] || "bg-muted text-muted-foreground")}>
                              {e.courseStatus}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                          <span className="text-muted-foreground text-[10px] sm:text-xs">Certificado pronto</span>
                          <label className="mt-1 flex cursor-pointer items-center gap-2">
                            <Checkbox
                              checked={e.certificateReady}
                              onCheckedChange={(checked) => handleCertificateReady(e, checked === true)}
                              aria-label={`Certificado de ${e.studentName} pronto`}
                            />
                            <span className={cn("text-xs font-medium", e.certificateReady ? "text-emerald-400" : "text-muted-foreground")}>
                              {e.certificateReady ? "Pronto" : "Pendente"}
                            </span>
                          </label>
                        </div>
                    </div>
                    <div className="flex items-center justify-end sm:justify-start gap-1 shrink-0 ml-auto">
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => openEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" onClick={() => handleDelete(e)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={!!changingInstructor} onOpenChange={open=>{if(!open&&!savingInstructor)setChangingInstructor(null);}}>
        <DialogContent data-lenis-prevent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Trocar professor dos alunos selecionados</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">{COURSE_LABELS[changingInstructor?.courseType||'']} · {changingInstructor?.date.split('-').reverse().join('/')} · {changingInstructor?shiftKey(changingInstructor.time):''}</p>
            <p className="text-sm text-muted-foreground">Professor atual: <strong>{changingInstructor?.instructor||'Não definido'}</strong>. Selecione os alunos que deseja transferir.</p>
            <div className="space-y-2"><Button variant="outline" size="sm" disabled={savingInstructor} onClick={()=>setSelectedInstructorBookings(selectedInstructorBookings.length===instructorClass.length?[]:instructorClass.map(row=>row.bookingId!))}>{selectedInstructorBookings.length===instructorClass.length?"Desmarcar todos":"Selecionar todos"}</Button><div className="max-h-48 overflow-y-auto space-y-2">{instructorClass.map(row=><label key={row.id} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={savingInstructor} checked={selectedInstructorBookings.includes(row.bookingId!)} onChange={event=>setSelectedInstructorBookings(ids=>event.target.checked?[...ids,row.bookingId!]:ids.filter(id=>id!==row.bookingId))}/>{row.studentName}</label>)}</div><p className="text-xs text-muted-foreground">{selectedInstructorBookings.length} aluno(s) selecionado(s). Os demais continuam com o professor atual.</p></div>
            <label className="block text-sm font-medium" htmlFor="new-course-instructor">Novo professor</label>
            <Select value={nextInstructor} onValueChange={setNextInstructor} disabled={savingInstructor}><SelectTrigger id="new-course-instructor"><SelectValue placeholder="Selecione o professor"/></SelectTrigger><SelectContent><SelectItem value="Nicolas">Nicolas</SelectItem>{changingInstructor?.courseType!=="video"&&<SelectItem value="Henrique">Henrique</SelectItem>}</SelectContent></Select>
            <p className="text-xs text-muted-foreground">O novo professor precisa estar disponível neste curso, dia e turno. Após salvar, ele receberá o aviso por WhatsApp com curso, data, horário e apenas os alunos selecionados.</p>
            {instructorError&&<p role="alert" className="text-sm text-destructive">{instructorError}</p>}
          </div>
          <DialogFooter><Button variant="outline" disabled={savingInstructor} onClick={()=>setChangingInstructor(null)}>Cancelar</Button><Button disabled={savingInstructor||!selectedInstructorBookings.length||!nextInstructor||nextInstructor===changingInstructor?.instructor} onClick={saveInstructor}>{savingInstructor?'Salvando e avisando…':'Salvar e avisar professor'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(open) => !open && !savingEdit && setEditing(null)}>
        <DialogContent data-lenis-prevent className="course-student-edit max-h-[90dvh] overflow-y-auto overscroll-contain touch-pan-y">
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Contato</label>
                <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Instagram</label>
              <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Data</label>
                <Input aria-label="Data do curso" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Horário</label>
                <Input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="08:30 / Manhã / Tarde" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingEdit} onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={savingEdit} onClick={handleSaveEdit}>{savingEdit ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


