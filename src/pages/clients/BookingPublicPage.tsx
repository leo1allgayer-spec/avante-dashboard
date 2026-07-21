import { useState, useEffect } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, parse, addDays, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays, Sun, CloudSun, ChevronLeft, ChevronRight, CheckCircle2, Loader2,
} from "lucide-react";
import avanteLogo from "@/assets/logo-full.svg";

const COURSES: { id: string; label: string; subtitle?: string }[] = [
  { id: "Curso Meta Ads", label: "Curso Tráfego Pago Meta Ads", subtitle: "Facebook e Instagram" },
  { id: "Curso Meta Ads Avançado", label: "Curso Tráfego Pago Meta Ads PRO+", subtitle: "Facebook e Instagram" },
  { id: "Curso Google Ads", label: "Curso Tráfego Pago Google Ads" },
  { id: "Curso Social Media", label: "Curso Social Media" },
  { id: "Curso Canva", label: "Curso Canva" },
  { id: "Curso Inteligência Artificial", label: "Curso Inteligência Artificial" },
  { id: "Curso Captação e Edição de Vídeo", label: "Curso Captação e Edição de Vídeo" },
];

const MAX_STUDENTS = 5;
const DAYS_AHEAD = 60;

const normalizeShift = (time: string) => {
  if (time === "Manhã" || time === "08:30") return "Manhã";
  if (time === "Tarde" || time === "14:00") return "Tarde";
  return time;
};

interface DateShift {
  date: string;
  shift: string;
  bookedCount: number;
  available: boolean;
}

export default function BookingPublic() {
  const [step, setStep] = useState<"course" | "date" | "form" | "loading" | "done">("course");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [dateShifts, setDateShifts] = useState<DateShift[]>([]);
  const [selectedShift, setSelectedShift] = useState<DateShift | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "55", instagram: "", certificateName: "" });
  const [errors, setErrors] = useState({ name: "", email: "", phone: "", instagram: "", certificateName: "" });

  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    (async () => {
      // Fetch blocked dates, disabled days, bookings, and settings in parallel
      // Meta Ads and Meta Ads Avançado are mutually exclusive
      const EXCLUSIVE_PAIRS: Record<string, string> = {
        "Curso Meta Ads": "Curso Meta Ads Avançado",
        "Curso Meta Ads Avançado": "Curso Meta Ads",
      };
      const siblingCourse = EXCLUSIVE_PAIRS[selectedCourse] || null;

      const fetchPromises = [
        supabase.from("course_blocked_dates").select("*"),
        supabase.from("course_disabled_days").select("*").eq("course_name", selectedCourse),
        supabase.rpc("get_booking_counts", { p_course_name: selectedCourse }),
        supabase.from("booking_settings").select("*").limit(1).single(),
      ] as const;

      const baseResults = await Promise.all(fetchPromises);
      const { data: blockedData } = baseResults[0];
      const { data: disabledData } = baseResults[1];
      const { data: countsData } = baseResults[2];
      const { data: settingsData } = baseResults[3];

      let siblingCountsData: any[] | null = null;
      let siblingSlotsData: any[] | null = null;
      let exceptionsData: any[] | null = null;
      if (siblingCourse) {
        const [countsRes, slotsRes, exceptionsRes] = await Promise.all([
          supabase.rpc("get_booking_counts", { p_course_name: siblingCourse }),
          supabase.from("course_slots").select("date,time").eq("course_name", siblingCourse),
          supabase.from("meta_ads_exceptions").select("date,shift"),
        ]);
        siblingCountsData = countsRes.data as any[] | null;
        siblingSlotsData = slotsRes.data as any[] | null;
        exceptionsData = exceptionsRes.data as any[] | null;
      }
      const exceptionSet = new Set<string>();
      (exceptionsData || []).forEach((e: any) => {
        if (e.shift) exceptionSet.add(`${e.date}|${e.shift}`);
        else { exceptionSet.add(`${e.date}|Manhã`); exceptionSet.add(`${e.date}|Tarde`); }
      });

      const minAdvanceMs = ((settingsData as any)?.min_advance_minutes ?? 60) * 60 * 1000;

      // Count bookings per date+shift
      const countMap: Record<string, number> = {};
      (countsData || []).forEach((b: any) => {
        const key = `${b.booking_date}|${b.booking_time}`;
        countMap[key] = (b.booking_count || 0);
      });

      // Sibling course - block if has bookings OR a slot is already scheduled
      const siblingBookedSet = new Set<string>();
      if (siblingCountsData) {
        (siblingCountsData as any[]).forEach((b: any) => {
          if ((b.booking_count || 0) > 0) {
            const shiftLabel = normalizeShift(b.booking_time);
            siblingBookedSet.add(`${b.booking_date}|${shiftLabel}`);
          }
        });
      }
      if (siblingSlotsData) {
        siblingSlotsData.forEach((s: any) => {
          const shiftLabel = normalizeShift(s.time);
          siblingBookedSet.add(`${s.date}|${shiftLabel}`);
        });
      }

      // Disabled weekdays for this course (with shift support)
      const disabledEntries = (disabledData || []) as Array<{ day_of_week: number; shift: string | null }>;
      const isWeekdayShiftDisabled = (dayOfWeek: number, shift: string) => {
        return disabledEntries.some(d =>
          d.day_of_week === dayOfWeek && (d.shift === null || d.shift === shift)
        );
      };

      // Check if a date+shift is blocked
      const isBlocked = (date: string, shift: string) => {
        return (blockedData || []).some((b: any) => {
          if (b.date !== date) return false;
          if (b.course_name !== null && b.course_name !== selectedCourse) return false;
          if (b.shift !== null && b.shift !== shift) return false;
          return true;
        });
      };

      // Generate all dates for next DAYS_AHEAD days
      const now = new Date();
      const today = startOfDay(now);
      const shifts: DateShift[] = [];

      for (let i = 0; i <= DAYS_AHEAD; i++) {
        const day = addDays(today, i);
        const dayOfWeek = day.getDay(); // 0=Sun, 6=Sat
        const dateStr = format(day, "yyyy-MM-dd");

        for (const shift of ["Manhã", "Tarde"]) {
          const shiftTime = shift === "Manhã" ? "08:30" : "14:00";
          // Require at least 1h in advance
          const [h, m] = shiftTime.split(":").map(Number);
          const shiftDateTime = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
          if (shiftDateTime.getTime() - now.getTime() < minAdvanceMs) continue;

          if (isWeekdayShiftDisabled(dayOfWeek, shiftTime)) continue;
          if (isBlocked(dateStr, shift)) continue;
          // Mutual exclusion: if sibling course has bookings, block this slot (unless exception)
          const siblingKey = `${dateStr}|${shift}`;
          if (siblingBookedSet.has(siblingKey) && !exceptionSet.has(siblingKey)) continue;
          const key = `${dateStr}|${shift}`;
          const booked = countMap[key] || 0;
          shifts.push({
            date: dateStr,
            shift,
            bookedCount: booked,
            available: booked < MAX_STUDENTS,
          });
        }
      }

      setDateShifts(shifts);
      setLoading(false);
    })();
  }, [selectedCourse]);

  const handleSelectCourse = (c: string) => {
    setSelectedCourse(c);
    setStep("date");
  };

  const handleSelectShift = (s: DateShift) => {
    if (!s.available) return;
    setSelectedShift(s);
    setStep("form");
  };

  const validate = () => {
    const e = { name: "", email: "", phone: "", instagram: "", certificateName: "" };
    if (!form.name.trim()) e.name = "Nome é obrigatório";
    if (!form.email.trim()) e.email = "E-mail é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "E-mail inválido";
    if (!form.phone.trim() || form.phone.length < 12) e.phone = "Telefone deve ter pelo menos 12 dígitos (55 + DDD + número)";
    setErrors(e);
    return !e.name && !e.email && !e.phone;
  };

  const handleSubmit = async () => {
    if (!validate() || !selectedShift) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: {
          courseName: selectedCourse,
          date: selectedShift.date,
          shift: selectedShift.shift,
          studentName: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          instagram: form.instagram.trim(),
          certificateName: form.certificateName.trim() || form.name.trim(),
        },
      });

      if (error || !data?.bookingId) {
        const msg = data?.error || "Erro ao agendar. Tente novamente.";
        alert(msg);
        setSubmitting(false);
        return;
      }

      // Show loading step while processing
      setStep("loading");

      // Trigger WhatsApp confirmation message
      try {
        await supabase.functions.invoke("whatsapp-trigger", {
          body: { bookingId: data.bookingId },
        });
      } catch (e) {
        console.error("WhatsApp trigger error:", e);
      }

      setSubmitting(false);
      setStep("done");
    } catch (e) {
      console.error("Booking error:", e);
      alert("Erro ao agendar. Tente novamente.");
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === "form") setStep("date");
    else if (step === "date") { setStep("course"); setSelectedCourse(""); setDateShifts([]); }
  };

  const reset = () => {
    setStep("course"); setSelectedCourse(""); setSelectedShift(null);
    setDateShifts([]); setForm({ name: "", email: "", phone: "55", instagram: "", certificateName: "" }); setErrors({ name: "", email: "", phone: "", instagram: "", certificateName: "" });
  };

  // Build a set of available dates and their shifts
  const availableDatesMap: Record<string, DateShift[]> = {};
  dateShifts.forEach(s => {
    if (!availableDatesMap[s.date]) availableDatesMap[s.date] = [];
    availableDatesMap[s.date].push(s);
  });

  const formatDate = (d: string) => {
    try {
      return format(parse(d, "yyyy-MM-dd", new Date()), "EEEE, dd 'de' MMMM", { locale: ptBR });
    } catch { return d; }
  };

  const shiftIcon = (shift: string) =>
    shift === "Manhã" ? <Sun className="h-4 w-4" /> : <CloudSun className="h-4 w-4" />;

  const shiftTime = (shift: string) => shift === "Manhã" ? "8:30" : "14:00";

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const calendarDays = (() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  })();

  const today = startOfDay(new Date());

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const shiftsForSelectedDate = selectedDate ? (availableDatesMap[selectedDate] || []) : [];

  return (
    <div className="min-h-screen bg-background text-foreground dot-pattern">
      <div className="min-h-screen bg-background/85">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-lg shadow-black/10 backdrop-blur-lg sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <img src={avanteLogo} alt="Avante Digital" className="h-12 w-auto object-contain" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/60">Avante Digital</p>
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  Agende seu Curso
                </h1>
              </div>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Escolha o curso, selecione uma data e turno disponíveis.
            </p>
          </div>

          {/* Step indicators */}
          {step !== "done" && (
            <div className="mb-6 grid grid-cols-3 gap-2">
              {[
                { key: "course", label: "Curso" },
                { key: "date", label: "Data" },
                { key: "form", label: "Dados" },
              ].map((s, i) => {
                const stepOrder = ["course", "date", "form"];
                const current = stepOrder.indexOf(step);
                const isActive = step === s.key;
                const isPast = current > i;
                return (
                  <div key={s.key} className={`rounded-2xl border p-3 transition-colors ${
                    isActive ? "border-primary/35 bg-primary/10" :
                    isPast ? "border-success/25 bg-success/10" :
                    "border-border/50 bg-card/60"
                  }`}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" :
                        isPast ? "bg-success text-success-foreground" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {i + 1}
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 1: Choose course */}
          {step === "course" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {COURSES.map(c => (
                <Card
                  key={c.id}
                  className="group cursor-pointer overflow-hidden rounded-2xl border-border/60 bg-card/70 shadow-lg shadow-black/10 backdrop-blur-lg transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-primary/5"
                  onClick={() => handleSelectCourse(c.id)}
                >
                  <CardContent className="flex items-center justify-between p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold leading-tight text-foreground">{c.label}</span>
                        {c.subtitle && (
                          <span className="mt-0.5 text-[11px] text-muted-foreground">{c.subtitle}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Step 2: Choose date and shift */}
          {step === "date" && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={goBack} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>

              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{selectedCourse}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Selecione uma data e turno disponíveis</p>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : Object.keys(availableDatesMap).length === 0 ? (
                <Card className="rounded-2xl border-border/60 bg-card/70">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Nenhuma data disponível no momento para este curso.
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-2xl border-border/60 bg-card/70 shadow-lg shadow-black/10 backdrop-blur-lg">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    {/* Month navigation */}
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="icon" className="h-9 w-9" disabled={isSameMonth(calendarMonth, new Date())} onClick={() => setCalendarMonth(m => subMonths(m, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-display text-sm font-semibold capitalize text-foreground">
                        {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
                      </span>
                      <Button variant="outline" size="icon" className="h-9 w-9" disabled={isSameMonth(calendarMonth, addMonths(new Date(), 2))} onClick={() => setCalendarMonth(m => addMonths(m, 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                        <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map(day => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const inMonth = isSameMonth(day, calendarMonth);
                        const hasShifts = !!availableDatesMap[dateStr];
                        const isSelected = selectedDate === dateStr;
                        const isPast = day < today;

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={!inMonth || !hasShifts || isPast}
                            onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                            className={`aspect-square rounded-xl text-sm transition-all ${
                              !inMonth ? "text-muted-foreground/20" :
                              isSelected ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20" :
                              hasShifts && !isPast ? "border border-success/25 bg-success/10 text-success hover:bg-success/20 font-medium cursor-pointer" :
                              "bg-secondary/20 text-muted-foreground/40"
                            }`}
                          >
                            {format(day, "d")}
                          </button>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500" /> Disponível</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-muted" /> Indisponível</span>
                    </div>

                    {/* Shift selection for selected date */}
                    {selectedDate && shiftsForSelectedDate.length > 0 && (
                      <div className="border-t border-border/50 pt-4 space-y-2">
                        <p className="text-sm font-medium capitalize">
                          {formatDate(selectedDate)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {shiftsForSelectedDate.map(s => (
                            <Button
                              key={`${s.date}-${s.shift}`}
                              variant={s.available ? "outline" : "ghost"}
                              size="sm"
                              disabled={!s.available}
                              onClick={() => handleSelectShift(s)}
                              className={`gap-2 ${s.available
                                ? "hover:bg-primary hover:text-primary-foreground border-primary/30"
                                : "opacity-40 cursor-not-allowed"
                              }`}
                            >
                              {shiftIcon(s.shift)}
                              {shiftTime(s.shift)}
                              {s.available
                                ? <span className="text-xs text-muted-foreground">(Disponível)</span>
                                : <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">Lotado</Badge>}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Form */}
          {step === "form" && selectedShift && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={goBack} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>

              <Card className="rounded-2xl border-primary/20 bg-primary/10">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Você está agendando:</div>
                  <div className="font-semibold text-foreground">{selectedCourse}</div>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span className="capitalize">{formatDate(selectedShift.date)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {shiftIcon(selectedShift.shift)}
                      {selectedShift.shift} — {shiftTime(selectedShift.shift)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-lg shadow-black/10 backdrop-blur-lg sm:grid-cols-2 sm:p-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nome completo <span className="text-destructive">*</span></label>
                  <Input
                    value={form.name}
                    onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: "" }); }}
                    placeholder="Seu nome completo"
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">E-mail <span className="text-destructive">*</span></label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: "" }); }}
                    placeholder="seu@email.com"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Telefone <span className="text-destructive">*</span></label>
                  <Input
                    value={form.phone}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, "");
                      if (!val.startsWith("55")) val = "55" + val;
                      if (val.length > 13) val = val.slice(0, 13);
                      setForm({ ...form, phone: val });
                      setErrors({ ...errors, phone: "" });
                    }}
                    placeholder="5551999999999"
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Formato: 55 + DDD + número (ex: 5551999999999)</p>
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Instagram</label>
                  <Input
                    value={form.instagram}
                    onChange={e => { setForm({ ...form, instagram: e.target.value }); }}
                    placeholder="@seuusuario"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Opcional</p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium">Nome para o certificado</label>
                  <Input
                    value={form.certificateName}
                    onChange={e => { setForm({ ...form, certificateName: e.target.value }); }}
                    placeholder="Nome que deseja no certificado"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Se deixar em branco, será usado o nome completo</p>
                </div>
              </div>

              <Button
                className="h-11 w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmar Agendamento
              </Button>
            </div>
          )}

          {/* Loading step */}
          {step === "loading" && (
            <Card className="rounded-2xl border-primary/30 bg-card/70 shadow-lg shadow-black/10 backdrop-blur-lg">
              <CardContent className="space-y-4 p-8 text-center">
                <Loader2 className="mx-auto h-14 w-14 animate-spin text-primary" />
                <h2 className="font-display text-xl font-bold">Processando seu agendamento...</h2>
                <p className="text-muted-foreground">Aguarde um momento enquanto confirmamos sua vaga.</p>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Confirmation */}
          {step === "done" && (
            <Card className="mx-auto max-w-xl rounded-2xl border-success/30 bg-card/70 shadow-lg shadow-black/10 backdrop-blur-lg">
              <CardContent className="space-y-4 p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <h2 className="font-display text-2xl font-bold">Agendamento Confirmado!</h2>
                <p className="text-muted-foreground">
                  Sua vaga no <strong>{selectedCourse}</strong> foi reservada com sucesso.
                </p>
                {selectedShift && (
                  <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span className="capitalize">{formatDate(selectedShift.date)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {shiftIcon(selectedShift.shift)}
                      {selectedShift.shift} — {shiftTime(selectedShift.shift)}
                    </span>
                  </div>
                )}
                <Button variant="outline" onClick={reset}>
                  Fazer novo agendamento
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Avante Digital
      </footer>
    </div>
  );
}
