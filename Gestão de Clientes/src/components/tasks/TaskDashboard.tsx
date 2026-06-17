import { useMemo, useState } from "react";
import { Task, TeamMember, formatDuration } from "@/types/task";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Clock, Target, AlertTriangle, TrendingUp, User, CalendarIcon, Repeat } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

interface Props {
  tasks: Task[];
  members: TeamMember[];
}

type Period = "today" | "week" | "month" | "all" | "custom";
type TaskTypeFilter = "all" | "normal" | "daily";

function getPeriodRange(period: Period, custom?: DateRange): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (period === "today") {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    return { start: d, end: null };
  }
  if (period === "week") {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    return { start: d, end: null };
  }
  if (period === "month") {
    const d = new Date(now); d.setMonth(d.getMonth() - 1);
    return { start: d, end: null };
  }
  if (period === "custom" && custom?.from) {
    const start = new Date(custom.from); start.setHours(0, 0, 0, 0);
    const end = custom.to ? new Date(custom.to) : new Date(custom.from);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  return { start: null, end: null };
}

function computeStats(tasks: Task[]) {
  const today = new Date().toISOString().split("T")[0];
  // "Hoje" = tarefas com prazo HOJE (não futuras, não passadas)
  const todayTasks = tasks.filter((t) => t.dueDate === today);
  const completed = tasks.filter((t) => t.status === "Concluída");
  const pending = tasks.filter((t) => t.status === "Pendente");
  const inProgress = tasks.filter((t) => t.status === "Em andamento");
  // "Atrasadas" = prazo anterior a hoje E não concluídas
  const overdue = tasks.filter(
    (t) => t.dueDate && t.dueDate !== "" && t.dueDate < today && t.status !== "Concluída"
  );

  const completionTimes = completed
    .filter((t) => t.completedAt && t.createdAt)
    .map((t) => new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime());
  const avgTime = completionTimes.length > 0 ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length : 0;
  const efficiency = tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0;

  return { todayTasks, completed, pending, inProgress, overdue, avgTime, efficiency, total: tasks.length };
}

export function TaskDashboard({ tasks, members }: Props) {
  const [period, setPeriod] = useState<Period>("all");
  const [taskType, setTaskType] = useState<TaskTypeFilter>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const filteredByType = useMemo(() => {
    if (taskType === "normal") return tasks.filter((t) => !t.isDaily);
    if (taskType === "daily") return tasks.filter((t) => t.isDaily);
    return tasks;
  }, [tasks, taskType]);

  const filteredByPeriod = useMemo(() => {
    const { start, end } = getPeriodRange(period, customRange);
    if (!start) return filteredByType;
    return filteredByType.filter((t) => {
      const ref = t.createdAt ? new Date(t.createdAt) : null;
      if (!ref) return false;
      if (ref < start) return false;
      if (end && ref > end) return false;
      return true;
    });
  }, [filteredByType, period, customRange]);

  const overall = useMemo(() => computeStats(filteredByPeriod), [filteredByPeriod]);

  const perMember = useMemo(() => {
    return members.map((m) => ({
      member: m,
      stats: computeStats(filteredByPeriod.filter((t) => t.assigneeId === m.id)),
    }));
  }, [filteredByPeriod, members]);

  const unassigned = useMemo(
    () => computeStats(filteredByPeriod.filter((t) => !t.assigneeId)),
    [filteredByPeriod]
  );

  const customLabel = customRange?.from
    ? customRange.to
      ? `${format(customRange.from, "dd/MM/yy", { locale: ptBR })} - ${format(customRange.to, "dd/MM/yy", { locale: ptBR })}`
      : format(customRange.from, "dd/MM/yy", { locale: ptBR })
    : "Selecionar datas";

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Últimos 7 dias</SelectItem>
            <SelectItem value="month">Últimos 30 dias</SelectItem>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="custom">Período personalizado</SelectItem>
          </SelectContent>
        </Select>

        {/* Task Type Filter */}
        <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskTypeFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de tarefa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tarefas</SelectItem>
            <SelectItem value="normal">Tarefas normais</SelectItem>
            <SelectItem value="daily">Tarefas diárias</SelectItem>
          </SelectContent>
        </Select>

        {period === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {customLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={setCustomRange}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        )}

        <span className="text-xs text-muted-foreground">
          Filtro aplicado a todos os cards abaixo
        </span>
      </div>

      {/* Overall Summary */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Geral da equipe</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs">Total Hoje</span>
              </div>
              <p className="text-2xl font-bold">{overall.todayTasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Concluídas</span>
              </div>
              <p className="text-2xl font-bold text-[hsl(var(--status-ok))]">{overall.completed.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Em Andamento</span>
              </div>
              <p className="text-2xl font-bold text-primary">{overall.inProgress.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Atrasadas</span>
              </div>
              <p className="text-2xl font-bold text-destructive">{overall.overdue.length}</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tempo Médio</span>
              </div>
              <p className="text-lg font-semibold">{overall.avgTime ? formatDuration(overall.avgTime) : "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Eficiência</span>
              </div>
              <p className="text-lg font-semibold">{overall.efficiency.toFixed(0)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total de Tarefas</span>
              </div>
              <p className="text-lg font-semibold">{overall.total}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Per-member breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Por membro da equipe</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {perMember.map(({ member, stats }) => (
            <Card key={member.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{member.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{stats.total} tarefas</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground">Hoje</p>
                    <p className="text-base font-bold">{stats.todayTasks.length}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground">Concluídas</p>
                    <p className="text-base font-bold text-[hsl(var(--status-ok))]">{stats.completed.length}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground">Em andam.</p>
                    <p className="text-base font-bold text-primary">{stats.inProgress.length}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground">Atrasadas</p>
                    <p className="text-base font-bold text-destructive">{stats.overdue.length}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>⏱ Tempo médio: <strong className="text-foreground">{stats.avgTime ? formatDuration(stats.avgTime) : "—"}</strong></span>
                  <span>📈 Eficiência: <strong className="text-foreground">{stats.efficiency.toFixed(0)}%</strong></span>
                </div>
              </CardContent>
            </Card>
          ))}
          {unassigned.total > 0 && (
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-muted-foreground">Sem responsável</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{unassigned.total} tarefas</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground">Hoje</p>
                    <p className="text-base font-bold">{unassigned.todayTasks.length}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground">Concluídas</p>
                    <p className="text-base font-bold text-[hsl(var(--status-ok))]">{unassigned.completed.length}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground">Em andam.</p>
                    <p className="text-base font-bold text-primary">{unassigned.inProgress.length}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground">Atrasadas</p>
                    <p className="text-base font-bold text-destructive">{unassigned.overdue.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-8">
              Nenhum membro cadastrado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
