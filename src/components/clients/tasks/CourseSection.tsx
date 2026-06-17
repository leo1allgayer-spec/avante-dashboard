import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCourseEnrollments, CourseEnrollment } from "@/hooks/clients/useCourseEnrollments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, GraduationCap, ChevronLeft, ChevronRight, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  courseType: "google" | "social_media" | "meta_ads" | "meta_ads_advanced" | "ia" | "video";
}

const COURSE_LABELS: Record<string, string> = {
  google: "Curso Google Ads",
  social_media: "Curso Social Media",
  meta_ads: "Curso Meta Ads",
  meta_ads_advanced: "Curso Meta Ads Avançado",
  ia: "Curso Inteligência Artificial",
  video: "Curso Captação e Edição de Vídeo",
};

const emptyForm = { studentName: "", contact: "", email: "", instagram: "", date: "", time: "" };

export function CourseSection({ courseType }: Props) {
  const { enrollments, loading, addEnrollment, updateEnrollment, deleteEnrollment } =
    useCourseEnrollments(courseType);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { locale: ptBR }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourseEnrollment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const title = COURSE_LABELS[courseType] || courseType;

  const enrollmentsByDate = useMemo(() => {
    const map: Record<string, CourseEnrollment[]> = {};
    enrollments.forEach((e) => {
      if (e.date) {
        if (!map[e.date]) map[e.date] = [];
        map[e.date].push(e);
      }
    });
    return map;
  }, [enrollments]);

  const weekDays = useMemo(() => {
    const end = endOfWeek(currentWeekStart, { locale: ptBR });
    return eachDayOfInterval({ start: currentWeekStart, end });
  }, [currentWeekStart]);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedEnrollments = selectedDateStr ? (enrollmentsByDate[selectedDateStr] || []) : [];

  const openAdd = (prefilledDate?: string) => {
    setEditing(null);
    setForm({ ...emptyForm, date: prefilledDate || "" });
    setDialogOpen(true);
  };

  const openEdit = (e: CourseEnrollment) => {
    setEditing(e);
    setForm({ studentName: e.studentName, contact: e.contact, email: e.email, instagram: e.instagram, date: e.date, time: e.time });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.studentName.trim()) return;
    if (editing) {
      await updateEnrollment({ ...editing, ...form });
    } else {
      await addEnrollment({ ...form, courseType });
    }
    setDialogOpen(false);
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { locale: ptBR }));
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> {title}
          </CardTitle>
          <Button onClick={() => openAdd()} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Adicionar Aluno
          </Button>
        </CardHeader>
        <CardContent>
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{weekLabel}</h3>
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
                Hoje
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekly grid */}
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
                  <span className={cn(
                    "text-lg font-semibold",
                    isToday && "text-primary",
                  )}>
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

          {/* Selected date detail */}
          {selectedDate && (
            <div className="mt-4 border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold capitalize">
                  {format(selectedDate, "EEEE, dd/MM/yyyy", { locale: ptBR })}
                </h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openAdd(format(selectedDate, "yyyy-MM-dd"))}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedDate(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {selectedEnrollments.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhum aluno neste dia.</p>
              ) : (
                <div className="space-y-2">
                  {selectedEnrollments.map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
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
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteEnrollment(e.id)}>
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
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Aluno" : "Adicionar Aluno"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Aluno *</label>
              <Input value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Contato</label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Instagram</label>
              <Input placeholder="@usuario" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Data</label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Horário</label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.studentName.trim()}>
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
