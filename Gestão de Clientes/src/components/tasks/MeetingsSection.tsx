import { useState, useMemo } from "react";
import { Meeting, TeamMember } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Calendar, Clock, Users, Pencil, CheckCircle2, ThumbsUp, ThumbsDown, History, ChevronLeft, ChevronRight, Filter, MapPin, Video, Handshake } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  meetings: Meeting[];
  members: TeamMember[];
  onAdd: (meeting: Omit<Meeting, "id">) => void;
  onUpdate: (meeting: Meeting) => void;
  onDelete: (id: string) => void;
}

const WEEKDAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function formatDateWithWeekday(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    const weekday = format(d, "EEEE", { locale: ptBR });
    const formatted = format(d, "dd/MM/yyyy");
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${formatted}`;
  } catch {
    return dateStr;
  }
}

function MeetingCard({ m, compact, onEdit, onDelete, onComplete, onUpdate }: {
  m: Meeting;
  compact?: boolean;
  onEdit: (m: Meeting) => void;
  onDelete: (id: string) => void;
  onComplete: (m: Meeting, outcome: "positive" | "negative") => void;
  onUpdate: (m: Meeting) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-2 space-y-1 text-xs">
      <div className="flex items-start justify-between gap-1">
        <span className="font-medium leading-tight">{m.title}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          {m.status === "pending" && (
            <>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEdit(m)}>
                <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-green-600" onClick={() => onComplete(m, "positive")}>
                <ThumbsUp className="h-2.5 w-2.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500" onClick={() => onComplete(m, "negative")}>
                <ThumbsDown className="h-2.5 w-2.5" />
              </Button>
            </>
          )}
          {m.status === "completed" && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onUpdate({ ...m, status: "pending", outcome: null })}>
              <CheckCircle2 className="h-2.5 w-2.5 text-muted-foreground" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDelete(m.id)}>
            <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
      {m.time && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />{m.time}
        </span>
      )}
      {m.status === "completed" && m.outcome && (
        <Badge variant={m.outcome === "positive" ? "default" : "destructive"} className="text-[9px] h-4">
          {m.outcome === "positive" ? "Positiva" : "Negativa"}
        </Badge>
      )}
      <div className="flex flex-wrap gap-1">
        {m.modality && (
          <Badge variant="outline" className="text-[9px] h-4 gap-0.5">
            {m.modality === "online" ? <Video className="h-2 w-2" /> : <MapPin className="h-2 w-2" />}
            {m.modality === "online" ? "Online" : "Presencial"}
          </Badge>
        )}
        {m.origin && (
          <Badge variant="secondary" className="text-[9px] h-4">{m.origin}</Badge>
        )}
        {m.hasClosed && (
          <Badge variant="default" className="text-[9px] h-4 gap-0.5 bg-green-600">
            <Handshake className="h-2 w-2" /> Fechou
          </Badge>
        )}
      </div>
      {m.participants.length > 0 && (
        <div className="text-muted-foreground truncate">
          <Users className="h-2.5 w-2.5 inline mr-1" />
          {m.participants.join(", ")}
        </div>
      )}
      {m.description && !compact && (
        <p className="text-muted-foreground line-clamp-2">{m.description}</p>
      )}
    </div>
  );
}

export function MeetingsSection({ meetings, members, onAdd, onUpdate, onDelete }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [modality, setModality] = useState<"presencial" | "online">("presencial");
  const [hasClosed, setHasClosed] = useState(false);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  // Filters
  const [filterParticipant, setFilterParticipant] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");

  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  const prevWeek = () => setCurrentWeekStart((w) => addWeeks(w, -1));
  const nextWeek = () => setCurrentWeekStart((w) => addWeeks(w, 1));
  const goToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const applyFilters = (list: Meeting[]) => {
    return list.filter((m) => {
      if (filterParticipant && !m.participants.includes(filterParticipant)) return false;
      if (filterOutcome === "positive" && m.outcome !== "positive") return false;
      if (filterOutcome === "negative" && m.outcome !== "negative") return false;
      return true;
    });
  };

  const pendingMeetings = useMemo(() => {
    const filtered = applyFilters(meetings.filter((m) => m.status === "pending"));
    return filtered;
  }, [meetings, filterParticipant, filterOutcome]);

  const completedMeetings = useMemo(() => {
    const filtered = applyFilters(meetings.filter((m) => m.status === "completed"));
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [meetings, filterParticipant, filterOutcome]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    weekDays.forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      map.set(key, []);
    });
    pendingMeetings.forEach((m) => {
      try {
        const mDate = parseISO(m.date);
        if (isWithinInterval(mDate, { start: currentWeekStart, end: weekEnd })) {
          const key = format(mDate, "yyyy-MM-dd");
          const arr = map.get(key);
          if (arr) arr.push(m);
        }
      } catch {}
    });
    // Sort each day by time
    map.forEach((arr) => arr.sort((a, b) => (a.time || "").localeCompare(b.time || "")));
    return map;
  }, [pendingMeetings, currentWeekStart]);

  const openAdd = () => {
    setEditingMeeting(null);
    setTitle(""); setDate(""); setTime(""); setDescription("");
    setSelectedParticipants([]); setOrigin(""); setModality("presencial"); setHasClosed(false);
    setConflictMsg(null);
    setShowDialog(true);
  };

  const openEdit = (m: Meeting) => {
    setEditingMeeting(m);
    setTitle(m.title); setDate(m.date); setTime(m.time);
    setDescription(m.description); setSelectedParticipants(m.participants);
    setOrigin(m.origin); setModality(m.modality); setHasClosed(m.hasClosed);
    setConflictMsg(null);
    setShowDialog(true);
  };

  const completeMeeting = (m: Meeting, outcome: "positive" | "negative") => {
    onUpdate({ ...m, status: "completed", outcome });
  };

  const checkConflict = (): string | null => {
    if (!time || selectedParticipants.length === 0) return null;
    const [h, m] = time.split(":").map(Number);
    const newMinutes = h * 60 + m;
    const otherMeetings = meetings.filter((mt) => {
      if (editingMeeting && mt.id === editingMeeting.id) return false;
      if (mt.status === "completed") return false;
      return mt.date === date && mt.time;
    });
    for (const mt of otherMeetings) {
      const [oh, om] = mt.time.split(":").map(Number);
      const otherMinutes = oh * 60 + om;
      const diff = Math.abs(newMinutes - otherMinutes);
      if (diff < 60) {
        const conflicting = selectedParticipants.filter((p) => mt.participants.includes(p));
        if (conflicting.length > 0) {
          return `${conflicting.join(", ")} já ${conflicting.length > 1 ? "têm" : "tem"} reunião "${mt.title}" às ${mt.time} (mínimo 1h de intervalo)`;
        }
      }
    }
    return null;
  };

  const handleSubmit = () => {
    if (!title.trim() || !date) return;
    const conflict = checkConflict();
    if (conflict) { setConflictMsg(conflict); return; }
    setConflictMsg(null);
    if (editingMeeting) {
      onUpdate({ ...editingMeeting, title: title.trim(), date, time, participants: selectedParticipants, description, origin, modality, hasClosed });
    } else {
      onAdd({ title: title.trim(), date, time, participants: selectedParticipants, description, status: "pending", outcome: null, origin, modality, hasClosed });
    }
    setShowDialog(false);
  };

  const toggleParticipant = (name: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const allParticipants = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => set.add(m.name));
    meetings.forEach((m) => m.participants.forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [members, meetings]);

  const isToday = (day: Date) => isSameDay(day, new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-semibold">Reuniões</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <Select value={filterParticipant} onValueChange={(v) => setFilterParticipant(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Participante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {allParticipants.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterOutcome} onValueChange={(v) => setFilterOutcome(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="positive">Positiva</SelectItem>
              <SelectItem value="negative">Negativa</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Agendar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Histórico ({completedMeetings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {format(currentWeekStart, "dd/MM", { locale: ptBR })} - {format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}
              </span>
              <Button variant="ghost" size="sm" onClick={goToday}>Hoje</Button>
            </div>
            <Button variant="outline" size="sm" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayMeetings = meetingsByDay.get(key) || [];
              const weekdayIdx = (day.getDay() + 6) % 7;
              return (
                <div key={key} className={`rounded-md border p-2 space-y-2 min-h-[120px] ${isToday(day) ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="text-[11px] font-medium text-muted-foreground">
                    {WEEKDAY_NAMES[weekdayIdx]} {formatDateShort(key)}
                  </div>
                  <div className="space-y-1.5">
                    {dayMeetings.map((m) => (
                      <MeetingCard
                        key={m.id}
                        m={m}
                        compact
                        onEdit={openEdit}
                        onDelete={onDelete}
                        onComplete={completeMeeting}
                        onUpdate={onUpdate}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completedMeetings.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{m.title}</h4>
                      {m.outcome && (
                        <Badge variant={m.outcome === "positive" ? "default" : "destructive"} className="text-[10px] h-5">
                          {m.outcome === "positive" ? "Positiva" : "Negativa"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdate({ ...m, status: "pending", outcome: null })}>
                        <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(m.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                   <div className="flex items-center gap-3 text-xs text-muted-foreground">
                     <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateWithWeekday(m.date)}</span>
                     {m.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.time}</span>}
                   </div>
                   <div className="flex flex-wrap gap-1">
                     {m.modality && (
                       <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
                         {m.modality === "online" ? <Video className="h-2.5 w-2.5" /> : <MapPin className="h-2.5 w-2.5" />}
                         {m.modality === "online" ? "Online" : "Presencial"}
                       </Badge>
                     )}
                     {m.origin && <Badge variant="secondary" className="text-[10px] h-5">{m.origin}</Badge>}
                     {m.hasClosed && (
                       <Badge variant="default" className="text-[10px] h-5 gap-0.5 bg-green-600">
                         <Handshake className="h-2.5 w-2.5" /> Fechou
                       </Badge>
                     )}
                   </div>
                   {m.participants.length > 0 && (
                     <div className="flex items-center gap-1 text-xs text-muted-foreground">
                       <Users className="h-3 w-3" />
                       {m.participants.join(", ")}
                     </div>
                   )}
                   {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                </CardContent>
              </Card>
            ))}
            {completedMeetings.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">Nenhuma reunião concluída</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMeeting ? "Editar Reunião" : "Agendar Reunião"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Daily standup" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Participantes</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {members.map((m) => (
                  <Button
                    key={m.id}
                    variant={selectedParticipants.includes(m.name) ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => toggleParticipant(m.name)}
                  >
                    {m.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Origem</Label>
                <Select value={origin} onValueChange={setOrigin}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indicação">Indicação</SelectItem>
                    <SelectItem value="anúncio">Anúncio</SelectItem>
                    <SelectItem value="social seller">Social Seller</SelectItem>
                    <SelectItem value="alinhamento interno">Alinhamento Interno</SelectItem>
                    <SelectItem value="alinhamento cliente">Alinhamento Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modalidade</Label>
                <Select value={modality} onValueChange={(v) => setModality(v as "presencial" | "online")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="has-closing" className="cursor-pointer">Houve fechamento?</Label>
              <Switch id="has-closing" checked={hasClosed} onCheckedChange={setHasClosed} />
            </div>
            <div>
              <Label>Pauta / Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            {conflictMsg && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{conflictMsg}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!title.trim() || !date}>
              {editingMeeting ? "Salvar" : "Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
