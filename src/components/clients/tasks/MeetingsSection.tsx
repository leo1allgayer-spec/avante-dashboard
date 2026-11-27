import {emptyMeetingLeadFields,readMeetingLeadFields,writeMeetingLeadFields,type MeetingLeadFields} from "@/lib/meetingLeadFields";
import { useNavigate } from 'react-router-dom';
import { isCourseMeeting,AGENDA_LABELS,AGENDA_DESCRIPTIONS,AGENDA_DESTINATIONS,isSupportMeeting,meetingAgendaLabel } from '@/lib/agendaPresentation';
import { crmMeetingAgenda, isCloserResponsible, localMeetingAgenda } from '@/lib/crmMeetingAgenda';
import { useEffect, useState, useMemo } from "react";
import MeetingClosingSelect from './MeetingClosingSelect';
import { AgendaBlock, AgendaCategory, Meeting, TeamMember } from "@/types/clients/task";
import { useMeetingMonthlyMetrics, useSaveMeetingMonthlyMetrics } from "@/hooks/clients/useMeetingMetrics";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Calendar, Clock, Users, Pencil, Repeat, CheckCircle2, ThumbsUp, ThumbsDown, History, ChevronLeft, ChevronRight, Filter, MapPin, Video, Handshake, RefreshCw, BarChart3, Loader2, LockKeyhole } from "lucide-react";
import { meetingScheduleLabel } from '@/lib/meetingScheduleLabel';
import { format, parseISO, startOfWeek, endOfWeek, addDays, addWeeks, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  meetings: Meeting[];
  blocks?: AgendaBlock[];
  currentUserId?: string;
  members: TeamMember[];
  agendaTitle?: string;
  agendaCategory?: AgendaCategory | "all";
  clientNames?: string[];
  onAdd: (meeting: Omit<Meeting, "id">) => void;
  onUpdate: (meeting: Meeting) => void;
  onDelete: (id: string) => void;
  onAddBlock?: (block: Omit<AgendaBlock, "id" | "ownerId">) => void;
  onDeleteBlock?: (id: string) => void;
  onRefresh?: () => void;
  syncing?: boolean;
}

const WEEKDAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const normalizePersonName = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const matchesPersonName = (candidate: string, selected: string) => {
  const candidateName = normalizePersonName(candidate);
  const selectedName = normalizePersonName(selected);
  if (!candidateName || !selectedName) return false;
  return candidateName === selectedName
    || candidateName.startsWith(`${selectedName} `)
    || selectedName.startsWith(`${candidateName} `);
};

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
        <div className="flex items-center gap-0.5 shrink-0">{isCourseMeeting(m) ? <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px]" onClick={() => onEdit(m)}>Ver curso</Button> : <>
          {m.status === "pending" && (
            <>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-primary" onClick={() => onEdit(m)} title="Remarcar reunião">
                <Repeat className="h-2.5 w-2.5" />
              </Button>
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
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDelete(m.id)} title="Excluir do dashboard e do CRM">
            <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
          </Button>
        </>}</div>
      </div>
      {meetingScheduleLabel(m) && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />{meetingScheduleLabel(m)}
        </span>
      )}
      {m.status === "completed" && m.outcome && (
        <Badge variant={m.outcome === "positive" ? "default" : "destructive"} className="text-[9px] h-4">
          {m.outcome === "positive" ? "Positiva" : "Negativa"}
        </Badge>
      )}
      {m.status === "completed" && !m.outcome && (
        <Badge className="text-[9px] h-4 bg-green-600">Concluída</Badge>
      )}
      {m.status === "cancelled" && (
        <Badge variant="destructive" className="text-[9px] h-4">Cancelada</Badge>
      )}
      <div className="flex flex-wrap gap-1">
        {m.agendaCategory && (
          <Badge className="text-[9px] h-4 bg-primary/80">
            {meetingAgendaLabel(m)}
          </Badge>
        )}
        {m.modality && (
          <Badge variant="outline" className="text-[9px] h-4 gap-0.5">
            {m.modality === "online" ? <Video className="h-2 w-2" /> : <MapPin className="h-2 w-2" />}
            {m.modality === "online" ? "Online" : m.modality === "presencial" ? "Presencial" : "Modalidade não informada"}
          </Badge>
        )}
        {m.origin && (
          <Badge variant="secondary" className="text-[9px] h-4">{m.origin}</Badge>
        )}
        {m.service && <Badge variant="outline" className="text-[9px] h-4">{m.service}</Badge>}
        {m.meetingType && <Badge variant="secondary" className="text-[9px] h-4 capitalize">{m.meetingType.replace("_", " ")}</Badge>}
        {m.responsible && <Badge variant="outline" className="text-[9px] h-4">Resp. {m.responsibles?.length?m.responsibles.join(' e '):m.responsible}</Badge>}
        {m.source === "crm" && <Badge className="text-[9px] h-4 bg-violet-600">Sincronizado</Badge>}
        {m.hasClosed && (
          <Badge variant="default" className="text-[9px] h-4 gap-0.5 bg-green-600">
            <Handshake className="h-2 w-2" /> Fechou
          </Badge>
        )}
        {m.closingStatus === "not_closed" && <Badge variant="destructive" className="text-[9px] h-4">Não fechou</Badge>}

      </div>
      {!isCourseMeeting(m)&&!isSupportMeeting(m)&&((m.agendaCategory || 'reunioes') === 'reunioes' || m.origin === 'CRM') && <MeetingClosingSelect meeting={m} onUpdate={onUpdate}/>}
      {m.participants.length > 0 && (
        <div className="text-muted-foreground truncate">
          <Users className="h-2.5 w-2.5 inline mr-1" />
          {m.participants.join(", ")}
        </div>
      )}
      {m.closingStatus === "not_closed" && m.objection && !compact && <p className="text-amber-500 line-clamp-2"><strong>Objeção:</strong> {m.objection}</p>}
      {m.description && !compact && (
        <p className={isCourseMeeting(m) ? "text-muted-foreground whitespace-pre-line break-words" : "text-muted-foreground line-clamp-2"}>{m.description}</p>
      )}
    </div>
  );
}

export function MeetingsSection({ meetings, blocks = [], currentUserId = "", members, agendaTitle = "Agenda Closer", agendaCategory = "reunioes", clientNames = [], onAdd, onUpdate, onDelete, onAddBlock, onDeleteBlock, onRefresh, syncing }: Props) {
  const navigate=useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockCategory, setBlockCategory] = useState<AgendaCategory>(agendaCategory === "all" ? "geral" : agendaCategory);
  const [blockResponsible, setBlockResponsible] = useState("");
  const [blockStartDate, setBlockStartDate] = useState("");
  const [blockEndDate, setBlockEndDate] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockAllDay, setBlockAllDay] = useState(true);
  const [blockReason, setBlockReason] = useState("");
  const [blockError, setBlockError] = useState("");

  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [selectedAgendaCategory, setSelectedAgendaCategory] = useState<AgendaCategory>(agendaCategory === "all" ? "geral" : agendaCategory);
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState("reuniao");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notifyClient, setNotifyClient] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [responsible, setResponsible] = useState("");
  const [professional, setProfessional] = useState("");
  const [date, setDate] = useState("");
  const [recurrenceDays, setRecurrenceDays] = useState("none");
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [leadFields,setLeadFields] = useState<MeetingLeadFields>(emptyMeetingLeadFields);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [service, setService] = useState("");
  const [modality, setModality] = useState<Meeting["modality"]>("presencial");
  const [closingStatus, setClosingStatus] = useState<"pending" | "closed" | "not_closed">("pending");
  const [objection, setObjection] = useState("");
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  // Filters
  const [filterResponsible, setFilterResponsible] = useState("");
  const [filterParticipant, setFilterParticipant] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const metricsMonth = filterMonth || format(new Date(), "yyyy-MM");
  const { data: monthlyMetrics } = useMeetingMonthlyMetrics(metricsMonth);
  const saveMonthlyMetrics = useSaveMeetingMonthlyMetrics();
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);
  const [metricsForm, setMetricsForm] = useState({ scheduling_goal: 0, cost_per_scheduling: 0, meetings_scheduled: 0, meetings_held: 0 });

  useEffect(() => {
    if (!monthlyMetrics) return;
    setMetricsForm({
      scheduling_goal: Number(monthlyMetrics.scheduling_goal || 0),
      cost_per_scheduling: Number(monthlyMetrics.cost_per_scheduling || 0),
      meetings_scheduled: Number(monthlyMetrics.meetings_scheduled || 0),
      meetings_held: Number(monthlyMetrics.meetings_held || 0),
    });
  }, [monthlyMetrics]);

  const attendanceRate = Number(monthlyMetrics?.meetings_scheduled || 0) > 0
    ? (Number(monthlyMetrics?.meetings_held || 0) / Number(monthlyMetrics?.meetings_scheduled || 0)) * 100
    : 0;

  const saveMetrics = async () => {
    try {
      await saveMonthlyMetrics.mutateAsync({ month: metricsMonth, ...metricsForm });
      setShowMetricsDialog(false);
      toast.success("Métricas de reuniões atualizadas");
    } catch (error) {
      toast.error("Não foi possível salvar as métricas", { description: error instanceof Error ? error.message : String(error) });
    }
  };

  const [calendarMode, setCalendarMode] = useState<"week" | "day">("week");
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const currentWeekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  const visibleDays = calendarMode === "day" ? [selectedDay] : weekDays;
  const moveCalendar = (direction: number) => setSelectedDay(day =>
    calendarMode === "day" ? addDays(day, direction) : addWeeks(day, direction)
  );
  const goToday = () => setSelectedDay(new Date());

  const applyFilters = (list: Meeting[]) => {
    return list.filter((m) => {
      const assignedResponsibles=m.responsibles?.length?m.responsibles:[m.responsible||''];
      if (filterResponsible === "__unassigned" ? assignedResponsibles.some(name=>name.trim()) : filterResponsible && !assignedResponsibles.some(name=>matchesPersonName(name,filterResponsible))) return false;
      if (filterParticipant) {
        const assignedPeople = [m.responsible || "", m.professional || "", ...m.participants];
        if (!assignedPeople.some((person) => matchesPersonName(person, filterParticipant))) return false;
      }
      if (filterOutcome === "positive" && m.outcome !== "positive") return false;
      if (filterOutcome === "negative" && m.outcome !== "negative") return false;
      if (filterOutcome === "closed" && m.closingStatus !== "closed" && !m.hasClosed) return false;
      if (filterOutcome === "not_closed" && m.closingStatus !== "not_closed") return false;
      if (filterOutcome === "pending_closing" && (m.closingStatus || (m.hasClosed ? "closed" : "pending")) !== "pending") return false;
      if (filterMonth) {
        try {
          const mMonth = format(parseISO(m.date), "yyyy-MM");
          if (mMonth !== filterMonth) return false;
        } catch {}
      }
      return true;
    });
  };

  const pendingMeetings = useMemo(() => {
    const filtered = applyFilters(meetings.filter((m) => m.status === "pending"));
    return filtered;
  }, [meetings, filterResponsible, filterParticipant, filterOutcome, filterMonth]);

  const completedMeetings = useMemo(() => {
    const filtered = applyFilters(meetings.filter((m) => m.status === "completed"));
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [meetings, filterResponsible, filterParticipant, filterOutcome, filterMonth]);

  const cancelledMeetings = useMemo(() => {
    const filtered = applyFilters(meetings.filter((m) => m.status === "cancelled"));
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [meetings, filterResponsible, filterParticipant, filterOutcome, filterMonth]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    weekDays.forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      map.set(key, []);
    });
    applyFilters(meetings).forEach((m) => {
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
  }, [meetings, currentWeekStart, filterResponsible, filterParticipant, filterOutcome, filterMonth]);

  const blocksByDay = useMemo(() => {
    const map = new Map<string, AgendaBlock[]>();
    weekDays.forEach((day) => map.set(format(day, "yyyy-MM-dd"), []));
    blocks.forEach((block) => {
      if (filterResponsible === "__unassigned" ? Boolean(block.responsible?.trim()) : filterResponsible && !matchesPersonName(block.responsible || "", filterResponsible)) return;
      weekDays.forEach((day) => {
        const key = format(day, "yyyy-MM-dd");
        if (key >= block.startDate && key <= block.endDate) map.get(key)?.push(block);
      });
    });
    return map;
  }, [blocks, currentWeekStart, filterResponsible]);

  const openBlock = () => {
    setBlockCategory(agendaCategory === "all" ? "geral" : agendaCategory);
    setBlockResponsible(""); setBlockStartDate(""); setBlockEndDate("");
    setBlockStartTime(""); setBlockEndTime(""); setBlockAllDay(true); setBlockReason(""); setBlockError("");
    setShowBlockDialog(true);
  };

  const saveBlock = () => {
    const endDate = blockEndDate || blockStartDate;
    if (!blockResponsible || !blockStartDate) { setBlockError("Informe o responsável e a data."); return; }
    if (endDate < blockStartDate) { setBlockError("A data final deve ser igual ou posterior à inicial."); return; }
    if (!blockAllDay && (!blockStartTime || !blockEndTime)) { setBlockError("Informe o horário inicial e final."); return; }
    if (!blockAllDay && endDate === blockStartDate && blockEndTime <= blockStartTime) { setBlockError("O horário final deve ser posterior ao inicial."); return; }
    onAddBlock?.({ agendaCategory: blockCategory, startDate: blockStartDate, endDate, startTime: blockStartTime, endTime: blockEndTime, allDay: blockAllDay, responsible: blockResponsible, reason: blockReason.trim() });
    setShowBlockDialog(false);
  };

  const openAdd = () => {
    setRecurrenceDays("none"); setRecurrenceUntil("");
    setEditingMeeting(null);
    setTitle(""); setMeetingType(agendaCategory === "captacao" ? "captacao" : agendaCategory === "reunioes" ? "reuniao_vendas" : "reuniao"); setClientName(""); setClientPhone(""); setNotifyClient(true); setDate(""); setTime(""); setDurationMinutes(60);
    setResponsible(""); setProfessional(""); setDescription(""); setLeadFields(emptyMeetingLeadFields());
    setSelectedParticipants([]); setOrigin(""); setService(""); setModality("presencial");
    setClosingStatus("pending"); setObjection("");
    setSelectedAgendaCategory(agendaCategory === "all" ? "geral" : agendaCategory);
    setConflictMsg(null);
    setShowDialog(true);
  };

  const openEdit = (m: Meeting) => {
    if(isCourseMeeting(m)){navigate("/tasks");return;}if(isSupportMeeting(m)){navigate("/agenda-suporte");return;}
    setRecurrenceDays("none"); setRecurrenceUntil("");
    setEditingMeeting(m);
    setTitle(m.title); setMeetingType(m.meetingType || "reuniao"); setClientName(m.clientName || m.title); setClientPhone(m.clientPhone || ""); setNotifyClient(m.notifyClient !== false);
    setDate(m.date); setTime(m.time); setDurationMinutes(m.durationMinutes || 60);
    setResponsible(m.responsible || ""); setProfessional(m.professional || "");
    const lead=readMeetingLeadFields(m.description); setDescription(lead.notes); setLeadFields(lead.fields); setSelectedParticipants(m.participants);
    setOrigin(m.origin); setService(m.service || ""); setModality(m.modality);
    setClosingStatus(m.closingStatus || (m.hasClosed ? "closed" : "pending")); setObjection(m.objection || "");
    setSelectedAgendaCategory(m.agendaCategory || "reunioes");
    setConflictMsg(null);
    setShowDialog(true);
  };

  const updateAgendaMeeting=(m:Meeting)=>{if(isCourseMeeting(m)){navigate("/tasks");return;}if(isSupportMeeting(m)){navigate("/agenda-suporte");return;}onUpdate(m);};
  const deleteAgendaMeeting=(id:string)=>{if(id.startsWith("course-")){navigate("/tasks");return;}if(id.startsWith("support-")){navigate("/agenda-suporte");return;}onDelete(id);};
  const completeMeeting = (m: Meeting, outcome: "positive" | "negative") => {
    updateAgendaMeeting({ ...m, status: "completed", outcome });
  };

  const checkConflict = (dateToCheck = date): string | null => {
    if (!time) return null;
    const assignedPeople = [responsible, professional, ...selectedParticipants].filter(Boolean);
    const meetingStart = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    const meetingEnd = meetingStart + durationMinutes;
    for (const block of blocks) {
      if ((block.agendaCategory !== "geral" && block.agendaCategory !== selectedAgendaCategory) || dateToCheck < block.startDate || dateToCheck > block.endDate) continue;
      if (!assignedPeople.some((person) => matchesPersonName(person, block.responsible))) continue;
      const blockStart = Number(block.startTime.slice(0, 2)) * 60 + Number(block.startTime.slice(3, 5));
      const blockEnd = Number(block.endTime.slice(0, 2)) * 60 + Number(block.endTime.slice(3, 5));
      if (block.allDay || (meetingStart < blockEnd && meetingEnd > blockStart)) {
        return block.responsible + " está com a agenda bloqueada" + (block.reason ? ": " + block.reason : ".");
      }
    }
    if (assignedPeople.length === 0) return null;
    const assignedNames = (meeting: Meeting) => [meeting.responsible, meeting.professional, ...(meeting.responsibles || []), ...meeting.participants].filter(Boolean);
    const newMinutes = meetingStart;
    const newEnd = meetingStart + durationMinutes;
    const otherMeetings = meetings.filter((mt) => {
      if (editingMeeting && mt.id === editingMeeting.id) return false;
      if (mt.status === "completed" || mt.status === "cancelled") return false;
      return mt.date === dateToCheck && mt.time;
    });
    for (const mt of otherMeetings) {
      const [oh, om] = mt.time.split(":").map(Number);
      const otherMinutes = oh * 60 + om;
      const diff = Math.abs(newMinutes - otherMinutes);
      const otherEnd = otherMinutes + (mt.durationMinutes || 60);
      const overlaps = meetingStart < otherEnd && newEnd > otherMinutes;
      const conflicting = assignedPeople.filter((person) => assignedNames(mt).some((other) => matchesPersonName(person, other)));
      if (conflicting.length > 0 && (overlaps || diff < 60)) {
        return `${conflicting.join(", ")} já ${conflicting.length > 1 ? "têm" : "tem"} reunião "${mt.title}" às ${mt.time} (mínimo 1h de intervalo)`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!title.trim() || !date) return;
    if(selectedAgendaCategory==="reunioes"&&responsible.trim()&&!isCloserResponsible(responsible)){setConflictMsg("A Agenda Closer é de Leonardo Webster. Para outro responsável, use Agenda Geral.");return;}
    const destination = editingMeeting?.externalId || editingMeeting?.source === 'crm' ? crmMeetingAgenda(responsible, meetingType) : localMeetingAgenda(selectedAgendaCategory, responsible, meetingType);
    if (notifyClient && clientPhone.trim() && destination === "reunioes") {
      let digits = clientPhone.replace(/\D/g, "");
      if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
      if (!/^55[1-9][0-9]{9,10}$/.test(digits)) { setConflictMsg("Informe um WhatsApp válido, com DDD."); return; }
    }

    if ((destination==="reunioes"||editingMeeting?.origin==="CRM") && closingStatus === "not_closed" && !objection.trim()) { setConflictMsg("Informe a objeção ou o motivo pelo qual a venda não fechou."); return; }
    const recurrence = !editingMeeting && selectedAgendaCategory === "captacao" && recurrenceDays !== "none" ? { intervalDays: Number(recurrenceDays) as 7 | 15, until: recurrenceUntil } : undefined;
    try {
      for (const occurrence of captureDates(date, recurrence)) {
        const conflict = checkConflict(occurrence);
        if (conflict) { setConflictMsg(`${occurrence.split("-").reverse().join("/")}: ${conflict}`); return; }
      }
    } catch (error) { setConflictMsg((error as Error).message); return; }
    const savedDescription = writeMeetingLeadFields(description, leadFields);
    setConflictMsg(null);
    setSaving(true);
    try {
    if (editingMeeting) {
      await onUpdate({ ...editingMeeting, agendaCategory: destination, title: title.trim(), meetingType, clientName, clientPhone, notifyClient, date, time, durationMinutes, responsible, professional, participants: selectedParticipants, description: savedDescription, origin, service, modality, hasClosed: closingStatus === "closed", closingStatus, objection: objection.trim() });
    } else {
      await onAdd({ recurrence, agendaCategory: destination, title: title.trim(), meetingType, clientName, clientPhone, notifyClient, date, time, durationMinutes, responsible, professional, participants: selectedParticipants, description: savedDescription, status: "pending", outcome: null, origin, service, modality, hasClosed: closingStatus === "closed", closingStatus, objection: objection.trim() });
    }
    setShowDialog(false);
    } catch (error) {
      setConflictMsg(String((error as { message?: string })?.message || "Não foi possível salvar. Tente novamente."));
    } finally { setSaving(false); }
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

  const responsibleOptions = useMemo(() => {
    const names = new Map<string,string>();
    [...members.map(member => member.name), ...meetings.flatMap(meeting => meeting.responsibles?.length?meeting.responsibles:[meeting.responsible || ""]), ...blocks.map(block => block.responsible || "")].forEach(name => {
      const normalized = normalizePersonName(name);
      if (normalized && !names.has(normalized)) names.set(normalized, name.trim());
    });
    return [...names.values()].sort((a,b) => a.localeCompare(b,"pt-BR"));
  }, [members,meetings,blocks]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    meetings.forEach((m) => {
      try {
        set.add(format(parseISO(m.date), "yyyy-MM"));
      } catch {}
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [meetings]);

  const formatMonthLabel = (value: string) => {
    try {
      return format(parseISO(`${value}-01`), "MMMM yyyy", { locale: ptBR });
    } catch {
      return value;
    }
  };

  const isToday = (day: Date) => isSameDay(day, new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-semibold">{agendaTitle}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <Select value={filterResponsible || "all"} onValueChange={(value) => setFilterResponsible(value === "all" ? "" : value)}>
            <SelectTrigger className="w-[180px] h-8 text-xs" aria-label="Filtrar por responsável"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os responsáveis</SelectItem><SelectItem value="__unassigned">Sem responsável</SelectItem>{responsibleOptions.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
          </Select>
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
              <SelectItem value="closed">Fechou na call</SelectItem>
              <SelectItem value="not_closed">Não fechou</SelectItem>
              <SelectItem value="pending_closing">A verificar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={(v) => setFilterMonth(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {onAddBlock && <Button variant="outline" size="sm" onClick={openBlock} className="border-amber-500/50 text-amber-500 hover:text-amber-400"><LockKeyhole className="h-4 w-4 mr-1" /> Bloquear agenda</Button>}
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Agendar
          </Button>
          {onRefresh && <Button variant="outline" size="sm" onClick={onRefresh} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} /> Atualizar CRM
          </Button>}
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
          <TabsTrigger value="cancelled" className="gap-1.5">
            Canceladas ({cancelledMeetings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1" role="group" aria-label="Visão do calendário">
              <Button size="sm" variant={calendarMode === "week" ? "default" : "outline"} aria-pressed={calendarMode === "week"} onClick={() => setCalendarMode("week")}>Semana</Button>
              <Button size="sm" variant={calendarMode === "day" ? "default" : "outline"} aria-pressed={calendarMode === "day"} onClick={() => setCalendarMode("day")}>Dia</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" aria-label={calendarMode === "day" ? "Dia anterior" : "Semana anterior"} onClick={() => moveCalendar(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium">
                {calendarMode === "day" ? format(selectedDay, "dd/MM/yyyy", { locale: ptBR }) : `${format(currentWeekStart, "dd/MM")} - ${format(weekEnd, "dd/MM/yyyy")}`}
              </span>
              <Button variant="outline" size="sm" aria-label={calendarMode === "day" ? "Próximo dia" : "Próxima semana"} onClick={() => moveCalendar(1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={goToday}>Hoje</Button>
              <Input type="date" aria-label="Data da agenda" className="w-40" value={format(selectedDay, "yyyy-MM-dd")} onChange={event => {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) return;
                const date = parseISO(event.target.value);
                if (!Number.isNaN(date.getTime())) setSelectedDay(date);
              }} />
            </div>
          </div>
          <div className={calendarMode === "day" ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 md:grid-cols-7 gap-2"}>
            {visibleDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayMeetings = meetingsByDay.get(key) || [];
              const dayBlocks = blocksByDay.get(key) || [];
              const weekdayIdx = (day.getDay() + 6) % 7;
              return (
                <div key={key} className={`rounded-md border p-2 space-y-2 min-h-[120px] ${isToday(day) ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="text-[11px] font-medium text-muted-foreground">
                    {WEEKDAY_NAMES[weekdayIdx]} {formatDateShort(key)}
                  </div>
                  <div className="space-y-1.5">
                    {dayBlocks.map((block) => (
                      <div key={block.id} className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                        <div className="flex items-start justify-between gap-1">
                          <span className="flex items-center gap-1 font-medium text-amber-400"><LockKeyhole className="h-3 w-3" /> Agenda bloqueada</span>
                          {block.ownerId === currentUserId && onDeleteBlock && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDeleteBlock(block.id)}><Trash2 className="h-3 w-3" /></Button>}
                        </div>
                        <p className="mt-1">{block.responsible}</p>
                        <p className="text-muted-foreground">{block.allDay ? "Dia inteiro" : block.startTime + " – " + block.endTime}</p>
                        {block.reason && <p className="mt-1 text-muted-foreground">{block.reason}</p>}
                      </div>
                    ))}
                    {calendarMode === "day" && dayMeetings.length === 0 && dayBlocks.length === 0 && <p className="py-6 text-sm text-muted-foreground">Nenhum compromisso ou bloqueio neste dia.</p>}
                    {dayMeetings.map((m) => (
                      <MeetingCard
                        key={m.id}
                        m={m}
                        compact={calendarMode === "week"}
                        onEdit={openEdit}
                        onDelete={deleteAgendaMeeting}
                        onComplete={completeMeeting}
                        onUpdate={updateAgendaMeeting}
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
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateAgendaMeeting({ ...m, status: "pending", outcome: null })}>
                        <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteAgendaMeeting(m.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                   <div className="flex items-center gap-3 text-xs text-muted-foreground">
                     <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateWithWeekday(m.date)}</span>
                     {meetingScheduleLabel(m) && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{meetingScheduleLabel(m)}</span>}
                   </div>
                   <div className="flex flex-wrap gap-1">
                     {m.modality && (
                       <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
                         {m.modality === "online" ? <Video className="h-2.5 w-2.5" /> : <MapPin className="h-2.5 w-2.5" />}
                         {m.modality === "online" ? "Online" : m.modality === "presencial" ? "Presencial" : "Modalidade não informada"}
                       </Badge>
                     )}
                     {m.origin && <Badge variant="secondary" className="text-[10px] h-5">{m.origin}</Badge>}
                     {m.hasClosed && (
                       <Badge variant="default" className="text-[10px] h-5 gap-0.5 bg-green-600">
                         <Handshake className="h-2.5 w-2.5" /> Fechou
                       </Badge>
                     )}
                   </div>
                   {!isCourseMeeting(m)&&!isSupportMeeting(m)&&((m.agendaCategory || 'reunioes') === 'reunioes' || m.origin === 'CRM') && <MeetingClosingSelect meeting={m} onUpdate={updateAgendaMeeting}/>}
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

        <TabsContent value="cancelled">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cancelledMeetings.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4 space-y-2 opacity-75">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-sm">{m.title}</h4>
                    <Badge variant="destructive" className="text-[10px]">Cancelada</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDateWithWeekday(m.date)}</span>
                    {m.time && <span>{m.time}</span>}
                  </div>
                  {m.participants.length > 0 && <p className="text-xs text-muted-foreground">{m.participants.join(", ")}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent data-lenis-prevent className="agenda-block-dialog max-h-[90dvh] overflow-y-auto overscroll-contain touch-pan-y sm:max-w-lg">
          <DialogHeader><DialogTitle>Bloquear agenda</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {agendaCategory === "all" && <div className="sm:col-span-2"><Label>Aplicar bloqueio em</Label><Select value={blockCategory} onValueChange={(value) => setBlockCategory(value as AgendaCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="geral">Bloqueio geral · todas as categorias</SelectItem><SelectItem value="reunioes">Agenda Closer</SelectItem><SelectItem value="captacao">Agenda de Captação</SelectItem><SelectItem value="social_media">Agenda Social Media</SelectItem></SelectContent></Select></div>}
            <div className="sm:col-span-2"><Label>Responsável *</Label><Select value={blockResponsible} onValueChange={setBlockResponsible}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Data inicial *</Label><Input type="date" value={blockStartDate} onChange={(event) => { setBlockStartDate(event.target.value); if (!blockEndDate) setBlockEndDate(event.target.value); }} /></div>
            <div><Label>Data final</Label><Input type="date" value={blockEndDate} min={blockStartDate} onChange={(event) => setBlockEndDate(event.target.value)} /></div>
            <div className="sm:col-span-2 flex items-center gap-2 rounded-md border p-3"><Checkbox id="block-all-day" checked={blockAllDay} onCheckedChange={(checked) => setBlockAllDay(checked === true)} /><Label htmlFor="block-all-day" className="cursor-pointer">Bloquear o dia inteiro</Label></div>
            {!blockAllDay && <><div><Label>Horário inicial *</Label><Input type="time" value={blockStartTime} onChange={(event) => setBlockStartTime(event.target.value)} /></div><div><Label>Horário final *</Label><Input type="time" value={blockEndTime} onChange={(event) => setBlockEndTime(event.target.value)} /></div></>}
            <div className="sm:col-span-2"><Label>Motivo</Label><Input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Ex.: viagem, compromisso, indisponível" /></div>
            {blockError && <p className="sm:col-span-2 text-sm text-destructive">{blockError}</p>}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setShowBlockDialog(false)}>Cancelar</Button><Button onClick={saveBlock}>Bloquear</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Métricas de reuniões — <span className="capitalize">{formatMonthLabel(metricsMonth)}</span></DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Meta de agendamentos</Label><Input type="number" min="0" value={metricsForm.scheduling_goal} onChange={(event) => setMetricsForm((current) => ({ ...current, scheduling_goal: Math.max(0, Number(event.target.value) || 0) }))} /></div>
            <div><Label>Custo por agendamento (R$)</Label><Input type="number" min="0" step="0.01" value={metricsForm.cost_per_scheduling} onChange={(event) => setMetricsForm((current) => ({ ...current, cost_per_scheduling: Math.max(0, Number(event.target.value) || 0) }))} /></div>
            <div><Label>Reuniões marcadas no mês</Label><Input type="number" min="0" value={metricsForm.meetings_scheduled} onChange={(event) => setMetricsForm((current) => ({ ...current, meetings_scheduled: Math.max(0, Number(event.target.value) || 0) }))} /></div>
            <div><Label>Reuniões realizadas no mês</Label><Input type="number" min="0" value={metricsForm.meetings_held} onChange={(event) => setMetricsForm((current) => ({ ...current, meetings_held: Math.max(0, Number(event.target.value) || 0) }))} /></div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:col-span-2"><p className="text-xs text-muted-foreground">Taxa de comparecimento em call</p><p className="mt-1 text-2xl font-bold text-primary">{metricsForm.meetings_scheduled > 0 ? ((metricsForm.meetings_held / metricsForm.meetings_scheduled) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "0"}%</p><p className="mt-1 text-xs text-muted-foreground">Calculada automaticamente: realizadas ÷ marcadas.</p></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowMetricsDialog(false)}>Cancelar</Button><Button onClick={() => void saveMetrics()} disabled={saveMonthlyMetrics.isPending}>{saveMonthlyMetrics.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar métricas</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-lenis-prevent className="max-h-[90dvh] overflow-y-auto overscroll-contain touch-pan-y sm:max-w-2xl" style={{ WebkitOverflowScrolling: "touch" }}>
          <DialogHeader>
            <DialogTitle>{editingMeeting ? "Editar horário" : "Novo horário"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {agendaCategory === "all" && (
              <div className="sm:col-span-2">
                <Label htmlFor="agenda-destination">Destino do compromisso</Label>
                <Select value={selectedAgendaCategory} onValueChange={value=>{
                  const destination=AGENDA_DESTINATIONS.find(item=>item.value===value);
                  if(destination?.path){setShowDialog(false);navigate(destination.path);return;}
                  setSelectedAgendaCategory(value as AgendaCategory);setConflictMsg(null);
                }}>
                  <SelectTrigger id="agenda-destination"><SelectValue /></SelectTrigger>
                  <SelectContent>{AGENDA_DESTINATIONS.map(item=><SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">{AGENDA_DESCRIPTIONS[selectedAgendaCategory]}</p>
                <p className="mt-1 text-xs text-muted-foreground">Suporte e cursos abrem as telas próprias, com suas regras de disponibilidade e avisos.</p>
              </div>
            )}
            {agendaCategory!=='all'&&<p className="sm:col-span-2 text-sm text-muted-foreground">Destino: <strong>{AGENDA_LABELS[selectedAgendaCategory]}</strong>. {AGENDA_DESCRIPTIONS[selectedAgendaCategory]}</p>}
            <div className="sm:col-span-2">
              <Label>Tipo de compromisso</Label>
              <Select value={meetingType} onValueChange={value => {
                setMeetingType(value);
                if (selectedAgendaCategory === 'geral' || selectedAgendaCategory === 'reunioes') {
                  setSelectedAgendaCategory(value === 'reuniao_vendas' ? 'reunioes' : 'geral');
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="captacao">Captação</SelectItem>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="reuniao_vendas">Reunião de vendas</SelectItem>
                  <SelectItem value="reuniao_cliente">Reunião cliente</SelectItem>
                  <SelectItem value="alinhamento">Alinhamento interno</SelectItem>
                  {editingMeeting?.meetingType==="suporte"&&<SelectItem value="suporte">Suporte (registro de compromisso)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">Somente Reunião de vendas de Leonardo Webster vai para a Agenda Closer. Reunião comum fica na Agenda Geral.</p>
            <div className="sm:col-span-2">
              <Label>Cliente</Label>
              <Select
                value={clientName ? (clientNames.includes(clientName) ? clientName : "__manual") : "__none"}
                onValueChange={(value) => {
                  const nextClient = value === "__none" || value === "__manual" ? "" : value;
                  setClientName(nextClient);
                  setClientPhone("");
                  if (nextClient) setTitle(nextClient);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sem cliente vinculado</SelectItem>
                  <SelectItem value="__manual">Digitar cliente manualmente</SelectItem>
                  {clientNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                value={clientName}
                onChange={(event) => {
                  const nextClient = event.target.value;
                  setClientName(nextClient);
                  setClientPhone("");
                  setTitle(nextClient);
                }}
                placeholder="Ou digite o nome do cliente"
                aria-label="Digitar nome do cliente manualmente"
              />
            </div>
            {clientName && selectedAgendaCategory === "reunioes" && (
              <div className="sm:col-span-2 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={notifyClient} onChange={event => setNotifyClient(event.target.checked)} />
                  Avisar o cliente pelo WhatsApp 1 hora antes
                </label>
                {notifyClient && <>
                  <Label htmlFor="meeting-client-phone">WhatsApp do cliente</Label>
                  <Input id="meeting-client-phone" type="tel" value={clientPhone} onChange={event => setClientPhone(event.target.value)} placeholder="+55 (51) 99999-9999" />
                  <p className="text-xs text-muted-foreground">Deixe vazio para usar o telefone do cadastro do cliente. Para um cliente digitado manualmente, informe o WhatsApp.</p>
                </>}
              </div>
            )}
            {!clientName && (
              <div className="sm:col-span-2">
                <Label>Nome ou título *</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome da pessoa ou assunto" />
              </div>
            )}
            <div>
              <Label>Data *</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="grid grid-cols-[1fr_110px] gap-2">
              <div>
                <Label>Hora</Label>
                <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </div>
              <div>
                {selectedAgendaCategory !== "captacao" ? <><Label>Duração (min)</Label><Input type="number" min={5} step={5} value={durationMinutes} onChange={(event) => setDurationMinutes(Math.max(5, Number(event.target.value) || 60))} /></> : <><Label>Período (turno)</Label>
                <Select value={durationMinutes >= 480 ? "dia_todo" : durationMinutes >= 360 ? "tarde" : "manha"} onValueChange={(value) => setDurationMinutes(value === "dia_todo" ? 480 : value === "tarde" ? 360 : 240)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="manha">Turma da manhã</SelectItem><SelectItem value="tarde">Turma da tarde</SelectItem><SelectItem value="dia_todo">Dia todo</SelectItem></SelectContent>
                </Select></>}
              </div>
            </div>
            {selectedAgendaCategory === "captacao" && !editingMeeting && <div className="sm:col-span-2 rounded-lg border p-3 space-y-3">
              <div><Label>Repetir captação</Label><Select value={recurrenceDays} onValueChange={setRecurrenceDays}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não repetir</SelectItem><SelectItem value="7">Toda semana</SelectItem><SelectItem value="15">A cada 15 dias</SelectItem></SelectContent></Select></div>
              {recurrenceDays !== "none" && <><div><Label>Repetir até *</Label><Input type="date" min={date} value={recurrenceUntil} onChange={(event) => setRecurrenceUntil(event.target.value)} /></div><p className="text-xs text-muted-foreground">Cria as captações desde a data inicial até a data final, mantendo horário, turno e equipe. Cada ocorrência poderá ser editada ou cancelada separadamente.</p></>}
            </div>}
            {editingMeeting?.recurrence && <p className="sm:col-span-2 text-xs text-muted-foreground">Captação recorrente: {editingMeeting.recurrence.intervalDays === 7 ? "toda semana" : "a cada 15 dias"}, até {editingMeeting.recurrence.until.split("-").reverse().join("/")}. A edição altera somente esta ocorrência.</p>}
            <div>
              <Label>Responsável</Label>
              <Select value={responsible || "__none"} onValueChange={(value) => setResponsible(value === "__none" ? "" : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sem responsável</SelectItem>
                  {members.map((member) => <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Profissional</Label>
              <Select value={professional || "__none"} onValueChange={(value) => setProfessional(value === "__none" ? "" : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Não definido</SelectItem>
                  {members.map((member) => <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Serviço</Label>
              <Input value={service} onChange={(event) => setService(event.target.value)} placeholder="Ex.: Google Ads, Site, CRM" />
            </div>
            <div>
              <Label>Modalidade</Label>
              <Select value={modality} onValueChange={(value) => setModality(value as Meeting["modality"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="nao_informado">Não informado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Membros envolvidos</Label>
                {members.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedParticipants(members.map((member) => member.name))}>
                    Marcar todos
                  </Button>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {members.map((member) => (
                  <Button key={member.id} type="button" variant={selectedParticipants.includes(member.name) ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => toggleParticipant(member.name)}>
                    {member.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Origem</Label>
              <Input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Ex.: indicação, anúncio, WhatsApp" />
            </div>
            {(selectedAgendaCategory === 'reunioes' || meetingType === 'reuniao_vendas') && <fieldset className="sm:col-span-2 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
              <legend className="px-1 text-sm font-semibold">Resumo do lead</legend>
              <p className="sm:col-span-2 text-xs text-muted-foreground">Estas informações entram no resumo da mensagem interna de nova reunião. Campos em branco ficam como não informados.</p>
              <div><Label htmlFor="lead-partners">Tem sócios?</Label>
                <Select value={leadFields.partners || '__none'} onValueChange={value=>setLeadFields(fields=>({...fields,partners:value==='__none'?'':value}))}>
                  <SelectTrigger id="lead-partners"><SelectValue /></SelectTrigger><SelectContent>
                    <SelectItem value="__none">Não informado</SelectItem><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem>
                    {leadFields.partners && !['Sim','Não'].includes(leadFields.partners) && <SelectItem value={leadFields.partners}>{leadFields.partners}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="lead-business">Tipo de negócio</Label><Input id="lead-business" value={leadFields.business} maxLength={500} placeholder="Ex.: clínica veterinária" onChange={event=>setLeadFields(fields=>({...fields,business:event.target.value}))}/></div>
              <div><Label htmlFor="lead-revenue">Faturamento mensal</Label><Input id="lead-revenue" value={leadFields.revenue} maxLength={500} placeholder="Ex.: R$ 30.000 ou de R$ 20 mil a R$ 50 mil" onChange={event=>setLeadFields(fields=>({...fields,revenue:event.target.value}))}/></div>
              <div><Label htmlFor="lead-interest">Interesse (curso/assessoria)</Label><Input id="lead-interest" value={leadFields.interest} maxLength={500} placeholder="Curso, assessoria ou ambos" onChange={event=>setLeadFields(fields=>({...fields,interest:event.target.value}))}/></div>
            </fieldset>}
            <div className="sm:col-span-2">
              <Label>Observação</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
            </div>
            {(selectedAgendaCategory==="reunioes"||editingMeeting?.origin==="CRM")&&<div className="sm:col-span-2">
              <Label>Fechou na call? (reunião comercial)</Label>
              <Select value={closingStatus} onValueChange={(value) => { const next = value as "pending" | "closed" | "not_closed"; setClosingStatus(next); if (next !== "not_closed") setObjection(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">A verificar</SelectItem>
                  <SelectItem value="closed">Sim, fechou</SelectItem>
                  <SelectItem value="not_closed">Não fechou</SelectItem>
                </SelectContent>
              </Select>
            </div>}
            {(selectedAgendaCategory==="reunioes"||editingMeeting?.origin==="CRM")&&closingStatus === "not_closed" && (
              <div className="sm:col-span-2">
                <Label>Objeção / motivo de não fechar *</Label>
                <Textarea value={objection} onChange={(event) => setObjection(event.target.value)} rows={3} placeholder="Registre a objeção para mapear no fechamento do mês" />
              </div>
            )}
            {conflictMsg && <p className="sm:col-span-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{conflictMsg}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!title.trim() || !date || syncing || saving}>
              {editingMeeting ? "Salvar" : "Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { captureDates } from "@/lib/captureRecurrence";


