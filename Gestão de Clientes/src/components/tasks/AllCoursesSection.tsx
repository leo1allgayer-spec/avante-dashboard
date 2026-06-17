import { useState, useMemo, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
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
  studentName: string;
  contact: string;
  email: string;
  instagram: string;
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
  ia: "IA",
  video: "Vídeo",
};

const COURSE_COLORS: Record<string, string> = {
  google: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  social_media: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  meta_ads: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  meta_ads_advanced: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  ia: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  video: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const COURSE_TYPE_TO_NAME: Record<string, string> = {
  google: "Curso Google Ads",
  social_media: "Curso Social Media",
  meta_ads: "Curso Meta Ads",
  meta_ads_advanced: "Curso Meta Ads Avançado",
  ia: "Curso Inteligência Artificial",
  video: "Curso Captação e Edição de Vídeo",
};

const emptyForm = { studentName: "", contact: "", email: "", instagram: "", date: "", time: "" };

export function AllCoursesSection() {
  const [enrollments, setEnrollments] = useState<AllEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { locale: ptBR }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [editing, setEditing] = useState<AllEnrollment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: bookings }] = await Promise.all([
      supabase.from("course_enrollments").select("*").order("date", { ascending: false }),
      supabase.from("course_bookings").select("student_name,course_name,date,time,course_status"),
    ]);
    if (error) {
      toast.error("Erro ao carregar inscrições");
    } else {
      const courseNameToType: Record<string, string> = {
        "Curso Google Ads": "google",
        "Curso Social Media": "social_media",
        "Curso Meta Ads": "meta_ads",
        "Curso Meta Ads Avançado": "meta_ads_advanced",
        "Curso Inteligência Artificial": "ia",
        "Curso Captação e Edição de Vídeo": "video",
      };
      const statusMap = new Map<string, string>();
      (bookings || []).forEach((b: any) => {
        const t = courseNameToType[b.course_name] || "other";
        statusMap.set(`${b.student_name}|${t}|${b.date}|${b.time}`, b.course_status);
      });
      setEnrollments((data || []).map((r: any) => ({
        id: r.id,
        studentName: r.student_name,
        contact: r.contact || "",
        email: r.email || "",
        instagram: r.instagram || "",
        date: r.date || "",
        time: r.time || "",
        courseType: r.course_type,
        courseStatus: statusMap.get(`${r.student_name}|${r.course_type}|${r.date}|${r.time}`),
      })));
    }
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
    const { error } = await supabase.from("course_enrollments").delete().eq("id", e.id);
    if (error) {
      toast.error("Erro ao excluir inscrição");
      return;
    }
    const courseName = COURSE_TYPE_TO_NAME[e.courseType];
    if (courseName) {
      await supabase
        .from("course_bookings")
        .delete()
        .eq("course_name", courseName)
        .eq("student_name", e.studentName)
        .eq("date", e.date)
        .eq("time", e.time);
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
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{weekLabel}</h3>
            <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">Hoje</Button>
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
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
                  "relative p-3 min-h-[90px] rounded-lg border text-left transition-colors flex flex-col",
                  "hover:bg-accent/50",
                  isSelected && "ring-2 ring-primary bg-accent",
                  isToday && !isSelected && "border-primary bg-primary/5",
                  !isSelected && !isToday && "border-border"
                )}
              >
                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                  {format(day, "EEE", { locale: ptBR })}
                </span>
                <span className={cn("text-lg font-semibold", isToday && "text-primary")}>
                  {format(day, "dd")}
                </span>
                {hasEnrollments && (
                  <div className="mt-auto flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">{dayEnrollments.length}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-4 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold capitalize">
                {format(selectedDate, "EEEE, dd/MM/yyyy", { locale: ptBR })}
              </h4>
              <Button size="sm" variant="ghost" onClick={() => setSelectedDate(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {selectedEnrollments.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhum aluno neste dia.</p>
            ) : (
              <div className="space-y-2">
                {selectedEnrollments.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50 border">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Curso</span>
                        <div className="mt-0.5">
                          <Badge variant="outline" className={cn("text-xs", COURSE_COLORS[e.courseType])}>
                            {COURSE_LABELS[e.courseType] || e.courseType}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Aluno</span>
                        <p className="font-medium">{e.studentName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Contato</span>
                        <p>{e.contact || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Email</span>
                        <p className="truncate">{e.email || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Instagram</span>
                        <p>
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
                      <div>
                        <span className="text-muted-foreground text-xs">Horário</span>
                        <p>{e.time === "Manhã" ? "08:30" : e.time === "Tarde" ? "14:00" : e.time}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Status</span>
                        <div className="mt-0.5">
                          {e.courseStatus ? (
                            <Badge variant="outline" className={cn("text-xs capitalize", STATUS_COLORS[e.courseStatus] || "bg-muted text-muted-foreground")}>
                              {e.courseStatus}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(e)}>
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
