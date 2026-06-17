import { useState, useMemo } from "react";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSaturday, isSunday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Task, TeamMember } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Trash2, CalendarIcon, Copy, CalendarDays, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  members: TeamMember[];
  onAddTask: (task: Omit<Task, "id" | "createdAt" | "startedAt" | "completedAt" | "userId">) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  currentUserId?: string;
}

const priorityColors: Record<string, string> = {
  Alta: "bg-destructive/20 text-destructive border-destructive/30",
  Média: "bg-status-warn text-foreground border-status-warn",
  Baixa: "bg-status-ok text-foreground border-status-ok",
};

export function DailyTasksSection({ tasks, members, onAddTask, onUpdateTask, onDeleteTask, currentUserId }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState<string>("Média");
  const [recurrence, setRecurrence] = useState<string>("none");
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Get filtered tasks based on view mode
  const filteredTasks = useMemo(() => {
    const daily = tasks.filter((t) => t.isDaily);
    if (viewMode === "day") {
      return daily.filter((t) => t.dueDate === dateStr);
    }
    // week view: Mon-Sun of selected date's week
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const startStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(weekEnd, "yyyy-MM-dd");
    return daily.filter((t) => t.dueDate >= startStr && t.dueDate <= endStr);
  }, [tasks, viewMode, dateStr, selectedDate]);

  // Group tasks by member
  const tasksByMember = useMemo(() => {
    const groups: Record<string, { member: TeamMember | null; tasks: Task[] }> = {};

    // Initialize groups for all members
    for (const m of members) {
      groups[m.id] = { member: m, tasks: [] };
    }
    groups["unassigned"] = { member: null, tasks: [] };

    for (const task of filteredTasks) {
      const key = task.assigneeId || "unassigned";
      if (!groups[key]) {
        groups[key] = { member: members.find((m) => m.id === key) || null, tasks: [] };
      }
      groups[key].tasks.push(task);
    }

    // Only return groups that have tasks or are assigned members
    return Object.entries(groups)
      .filter(([_, g]) => g.tasks.length > 0)
      .sort((a, b) => {
        if (a[0] === "unassigned") return 1;
        if (b[0] === "unassigned") return -1;
        return (a[1].member?.name || "").localeCompare(b[1].member?.name || "");
      });
  }, [filteredTasks, members]);

  const weekDays = useMemo(() => {
    if (viewMode !== "week") return [];
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
      (d) => !isSaturday(d) && !isSunday(d)
    );
  }, [viewMode, selectedDate]);

  const handleCopyToNextDay = () => {
    const dayTasks = tasks.filter((t) => t.isDaily && t.dueDate === dateStr);
    if (dayTasks.length === 0) {
      toast.info("Nenhuma tarefa para copiar neste dia");
      return;
    }
    const nextDateStr = format(addDays(selectedDate, 1), "yyyy-MM-dd");
    const existingNextDay = tasks.filter((t) => t.isDaily && t.dueDate === nextDateStr);
    let copied = 0;
    for (const task of dayTasks) {
      const alreadyExists = existingNextDay.some((t) => t.title === task.title && t.assigneeId === task.assigneeId);
      if (!alreadyExists) {
        onAddTask({
          title: task.title,
          description: task.description,
          assigneeId: task.assigneeId,
          dueDate: nextDateStr,
          priority: task.priority,
          status: "Pendente",
          isDaily: true,
        });
        copied++;
      }
    }
    if (copied > 0) {
      toast.success(`${copied} tarefa(s) copiada(s) para ${format(addDays(selectedDate, 1), "dd/MM/yyyy")}`);
    } else {
      toast.info("Todas as tarefas já existem no dia seguinte");
    }
  };

  const getDatesForRecurrence = (start: Date, mode: string): string[] => {
    const dates: string[] = [];
    let current = startOfDay(start);
    const end = addDays(current, 28);
    let index = 0;
    while (current <= end) {
      const isWeekday = !isSaturday(current) && !isSunday(current);
      if (mode === "every-day" && isWeekday) {
        dates.push(format(current, "yyyy-MM-dd"));
      } else if (mode === "every-other" && isWeekday) {
        if (index % 2 === 0) dates.push(format(current, "yyyy-MM-dd"));
        index++;
      } else if (mode === "once-week" && isWeekday) {
        if (current.getDay() === start.getDay()) {
          dates.push(format(current, "yyyy-MM-dd"));
        }
      }
      current = addDays(current, 1);
    }
    return dates;
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;

    if (recurrence !== "none") {
      const days = getDatesForRecurrence(selectedDate, recurrence);
      const existingDueDates = tasks
        .filter((t) => t.isDaily && t.title === newTitle.trim() && t.assigneeId === (newAssignee || null))
        .map((t) => t.dueDate);

      let created = 0;
      for (const day of days) {
        if (!existingDueDates.includes(day)) {
          onAddTask({
            title: newTitle.trim(),
            description: "",
            assigneeId: newAssignee || null,
            dueDate: day,
            priority: newPriority as Task["priority"],
            status: "Pendente",
            isDaily: true,
          });
          created++;
        }
      }
      toast.success(`Tarefa criada para ${created} dias`);
    } else {
      onAddTask({
        title: newTitle.trim(),
        description: "",
        assigneeId: newAssignee || null,
        dueDate: dateStr,
        priority: newPriority as Task["priority"],
        status: "Pendente",
        isDaily: true,
      });
    }

    setNewTitle("");
    setNewAssignee("");
    setNewPriority("Média");
    setRecurrence("none");
  };

  const toggleDone = (task: Task) => {
    if (task.status === "Concluída") {
      onUpdateTask({ ...task, status: "Pendente" });
    } else {
      onUpdateTask({ ...task, status: "Concluída" });
    }
  };

  const handleDeleteSingle = () => {
    if (!taskToDelete) return;
    onDeleteTask(taskToDelete.id);
    setTaskToDelete(null);
  };

  const handleDeleteAll = () => {
    if (!taskToDelete) return;
    const matching = tasks.filter(
      (t) => t.isDaily && t.title === taskToDelete.title && t.assigneeId === taskToDelete.assigneeId
    );
    for (const t of matching) {
      onDeleteTask(t.id);
    }
    toast.success(`${matching.length} tarefa(s) excluída(s)`);
    setTaskToDelete(null);
  };

  const getWeekLabel = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM/yyyy")}`;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "day" | "week")} className="border border-border rounded-md">
          <ToggleGroupItem value="day" className="gap-1.5 text-xs px-3">
            <CalendarIcon className="h-3.5 w-3.5" /> Dia
          </ToggleGroupItem>
          <ToggleGroupItem value="week" className="gap-1.5 text-xs px-3">
            <CalendarDays className="h-3.5 w-3.5" /> Semana
          </ToggleGroupItem>
        </ToggleGroup>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {viewMode === "day"
                ? format(selectedDate, "PPP", { locale: ptBR })
                : getWeekLabel()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {viewMode === "day" && (
          <Button variant="outline" onClick={handleCopyToNextDay}>
            <Copy className="h-4 w-4 mr-2" /> Copiar para dia seguinte
          </Button>
        )}
      </div>

      {/* Quick add row */}
      <div className="flex flex-wrap items-end gap-3 p-4 border border-border rounded-lg bg-card">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">Nome da tarefa</label>
          <Input
            placeholder="Nova tarefa diária..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <div className="w-[150px]">
          <label className="text-xs text-muted-foreground mb-1 block">Responsável</label>
          <Select value={newAssignee} onValueChange={setNewAssignee}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[120px]">
          <label className="text-xs text-muted-foreground mb-1 block">Prioridade</label>
          <Select value={newPriority} onValueChange={setNewPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Alta">Alta</SelectItem>
              <SelectItem value="Média">Média</SelectItem>
              <SelectItem value="Baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[180px]">
          <label className="text-xs text-muted-foreground mb-1 block">Repetição</label>
          <Select value={recurrence} onValueChange={setRecurrence}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Apenas este dia</SelectItem>
              <SelectItem value="every-day">Todos os dias úteis</SelectItem>
              <SelectItem value="every-other">Dia sim, dia não</SelectItem>
              <SelectItem value="once-week">1x por semana</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={!newTitle.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {/* Tasks grouped by member */}
      {tasksByMember.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma tarefa diária para {viewMode === "day" ? format(selectedDate, "dd/MM/yyyy") : getWeekLabel()}
        </Card>
      ) : (
        <div className="space-y-4">
          {tasksByMember.map(([key, group]) => {
            const memberName = group.member?.name || "Sem responsável";
            const completedCount = group.tasks.filter((t) => t.status === "Concluída").length;
            const totalCount = group.tasks.length;

            return (
              <Card key={key} className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{memberName}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {completedCount}/{totalCount} concluídas
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Feito</TableHead>
                      <TableHead>Tarefa</TableHead>
                      {viewMode === "week" && <TableHead>Data</TableHead>}
                      <TableHead>Prioridade</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.tasks
                      .sort((a, b) => {
                        // Sort by date first (week view), then pending first
                        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
                        if (a.status === "Concluída" && b.status !== "Concluída") return 1;
                        if (a.status !== "Concluída" && b.status === "Concluída") return -1;
                        return 0;
                      })
                      .map((task) => (
                        <TableRow key={task.id} className={task.status === "Concluída" ? "opacity-60" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={task.status === "Concluída"}
                              onCheckedChange={() => toggleDone(task)}
                            />
                          </TableCell>
                          <TableCell className={cn("font-medium text-sm", task.status === "Concluída" && "line-through")}>
                            {task.title}
                          </TableCell>
                          {viewMode === "week" && (
                            <TableCell className="text-sm text-muted-foreground">
                              {format(parseISO(task.dueDate), "EEE dd/MM", { locale: ptBR })}
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {currentUserId === task.userId && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTaskToDelete(task)}>
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir apenas esta tarefa ou todas as ocorrências de "{taskToDelete?.title}" em todos os dias?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSingle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apenas este dia
            </AlertDialogAction>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Todos os dias
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
