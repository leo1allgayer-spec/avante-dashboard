import { useState, useMemo, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, GraduationCap, ChevronLeft, ChevronRight, X, Users, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  date: string;
  time: string;
  courseType: string;
  courseStatus?: string;
}

const STATUS_COLORS: Record<string, string> = {
  "a confirmar": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "confirmado": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "cancelado": "bg-red-500/15 text-red-400 border-red-500/30",
  "realizado": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "faltou": "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

const COURSE_LABELS: Record<string, string> = {
  google: "Google Ads",
  social_media: "Social Media",
  meta_ads: "Meta Ads",
  meta_ads_advanced: "Meta Avançado",
  canva: "Canva",
  ia: "IA",
  video: "Vídeo",
};

const COURSE_COLORS: Record<string, string> = {
  google: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  social_media: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  meta_ads: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  meta_ads_advanced: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  canva: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  ia: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  video: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const COURSE_TYPE_TO_NAME: Record<string, string> = {
  google: "Curso Google Ads",
  social_media: "Curso Social Media",
  meta_ads: "Curso Meta Ads",
  meta_ads_advanced: "Curso Meta Ads Avançado",
  canva: "Curso Canva",
  ia: "Curso Inteligência Artificial",
  video: "Curso Captação e Edição de Vídeo",
};

const COURSE_NAME_TO_TYPE: Record<string, string> = {
  "Curso Google Ads": "google",
  "Curso Social Media": "social_media",
  "Curso Meta Ads": "meta_ads",
  "Curso Meta Ads Avançado": "meta_ads_advanced",
  "Curso Canva": "canva",
  "Curso Inteligência Artificial": "ia",
  "Curso Captação e Edição de Vídeo": "video",
};

const emptyForm = { studentName: "", contact: "", email: "", instagram: "", date: "", time: "" };

export function AllCoursesSection() {
  const [enrollments, setEnrollments] = useState<AllEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { locale: ptBR }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editing, setEditing] = useState<AllEnrollment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: bookings, error: bookingsError }] = await Promise.all([
      supabase.from("course_enrollments").select("*").order("date", { ascending: false }),
      supabase
        .from("course_bookings")
        .select("id,student_name,course_name,date,time,course_status,email,phone,instagram,certificate_name")
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

      const statusMap = new Map<string, string>();
      const certificateMap = new Map<string, string>();
      (bookings || []).forEach((b: any) => {
        const t = COURSE_NAME_TO_TYPE[b.course_name] || "other";
        const key = `${b.student_name}|${t}|${b.date}|${b.time}`;
        statusMap.set(key, b.course_status);
        certificateMap.set(key, b.certificate_name || b.student_name || "");
      });
      const enrollmentRows: AllEnrollment[] = (data || []).map((r: any) => ({
        id: r.id,
        enrollmentId: r.id,
        source: "enrollment",
        studentName: r.student_name,
        contact: r.contact || "",
        email: r.email || "",
        instagram: r.instagram || "",
        certificateName: certificateMap.get(`${r.student_name}|${r.course_type}|${r.date}|${r.time}`) || r.student_name || "",
        date: r.date || "",
        time: r.time || "",
        courseType: r.course_type,
        courseStatus: statusMap.get(`${r.student_name}|${r.course_type}|${r.date}|${r.time}`),
      }));

      const enrollmentKeys = new Set(
        enrollmentRows.map(e => `${e.studentName.trim().toLowerCase()}|${e.courseType}|${e.date}|${e.time}`)
      );
      const bookingRows: AllEnrollment[] = (bookings || [])
        .map((b: any) => {
          const courseType = COURSE_NAME_TO_TYPE[b.course_name] || "other";
          return {
            id: `booking:${b.id}`,
            bookingId: b.id,
            source: "booking" as const,
            studentName: b.student_name || b.certificate_name || "",
            contact: b.phone || "",
            email: b.email || "",
            instagram: b.instagram || "",
            certificateName: b.certificate_name || b.student_name || "",
            date: b.date || "",
            time: b.time || "",
            courseType,
            courseStatus: b.course_status || "a confirmar",
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
    if (!editing || !form.studentName.trim()) return;
    if (editing.source === "booking" && editing.bookingId) {
      const { error } = await supabase
        .from("course_bookings")
        .update({
          student_name: form.studentName,
          phone: form.contact,
          email: form.email,
          instagram: form.instagram,
          date: form.date,
          time: form.time,
        })
        .eq("id", editing.bookingId);
      if (error) {
        toast.error("Erro ao atualizar agendamento");
        return;
      }
      toast.success("Agendamento atualizado");
      setEditing(null);
      fetchAll();
      return;
    }

    const { error } = await supabase
      .from("course_enrollments")
      .update({
        student_name: form.studentName,
        contact: form.contact,
        email: form.email,
        instagram: form.instagram,
        date: form.date,
        time: form.time,
      })
      .eq("id", editing.id);
    if (error) {
      toast.error("Erro ao atualizar inscrição");
      return;
    }
    // Also update the matching course_booking (match by original values)
    const courseName = COURSE_TYPE_TO_NAME[editing.courseType];
    if (courseName) {
      await supabase
        .from("course_bookings")
        .update({
          student_name: form.studentName,
          phone: form.contact,
          email: form.email,
          instagram: form.instagram,
          date: form.date,
          time: form.time,
        })
        .eq("course_name", courseName)
        .eq("student_name", editing.studentName)
        .eq("date", editing.date)
        .eq("time", editing.time);
    }
    toast.success("Aluno atualizado");
    setEditing(null);
    fetchAll();
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

  useEffect(() => {
    if (loading || selectedDate) return;
    const firstDateWithEnrollment = weekDays.find((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      return (enrollmentsByDate[dateStr] || []).length > 0;
    });
    if (firstDateWithEnrollment) {
      setSelectedDate(firstDateWithEnrollment);
    }
  }, [loading, selectedDate, weekDays, enrollmentsByDate]);

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
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[100px_1fr_1fr_1.4fr_1fr_1fr_70px_110px] gap-2 sm:gap-2 md:gap-3 text-xs sm:text-sm md:text-sm">
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Curso</span>
                        <div className="mt-0.5">
                          <Badge variant="outline" className={cn("text-[10px] sm:text-xs md:text-xs", COURSE_COLORS[e.courseType])}>
                            {COURSE_LABELS[e.courseType] || e.courseType}
                          </Badge>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Aluno</span>
                        <p className="font-medium break-words md:leading-tight">{e.studentName}</p>
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

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
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
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Horário</label>
                <Input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="08:30 / Manhã / Tarde" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
