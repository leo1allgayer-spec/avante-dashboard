import { Task, TeamMember, formatDuration, getSpeedIndicator } from "@/types/clients/task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

interface Props {
  tasks: Task[];
  members: TeamMember[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  filterAssignee: string;
  filterStatus: string;
  filterPriority: string;
  search: string;
  currentUserId?: string;
}

const priorityColors: Record<string, string> = {
  Alta: "bg-destructive/20 text-destructive border-destructive/30",
  Média: "bg-status-warn text-foreground border-status-warn",
  Baixa: "bg-status-ok text-foreground border-status-ok",
};

const speedEmoji: Record<string, string> = { fast: "🟢", normal: "🟡", slow: "🔴" };

export function TaskListView({ tasks, members, onUpdateTask, onDeleteTask, filterAssignee, filterStatus, filterPriority, search, currentUserId }: Props) {
  const getMemberName = (id: string | null) => members.find((m) => m.id === id)?.name || "—";

  const filtered = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAssignee && t.assigneeId !== filterAssignee) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  const getTimeInfo = (task: Task) => {
    if (!task.completedAt || !task.createdAt) return null;
    const total = new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime();
    const maxMinutes = members.find((m) => m.id === task.assigneeId)?.maxTaskMinutes || 120;
    const speed = getSpeedIndicator(total, maxMinutes);
    return { duration: formatDuration(total), speed };
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarefa</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Tempo</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Nenhuma tarefa encontrada
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((task) => {
              const timeInfo = getTimeInfo(task);
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium text-sm">{task.title}</span>
                      {task.isDaily && <Badge variant="secondary" className="ml-2 text-[10px]">Diária</Badge>}
                      {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{getMemberName(task.assigneeId)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.status}
                      onValueChange={(v) => onUpdateTask({ ...task, status: v as Task["status"] })}
                    >
                      <SelectTrigger className="h-7 text-xs w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Em andamento">Em andamento</SelectItem>
                        <SelectItem value="Concluída">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{task.dueDate || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {timeInfo ? (
                      <span>{speedEmoji[timeInfo.speed]} {timeInfo.duration}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {currentUserId === task.userId && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteTask(task.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
