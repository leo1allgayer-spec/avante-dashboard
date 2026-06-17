import { Task, TeamMember } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  tasks: Task[];
  members: TeamMember[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  currentUserId?: string;
}

const statusOrder: Record<string, number> = { "Pendente": 0, "Em andamento": 1, "Concluída": 2 };
const priorityColors: Record<string, string> = {
  Alta: "bg-destructive/20 text-destructive border-destructive/30",
  Média: "bg-status-warn text-foreground border-status-warn",
  Baixa: "bg-status-ok text-foreground border-status-ok",
};

const columns = ["Pendente", "Em andamento", "Concluída"] as const;

export function TaskKanban({ tasks, members, onUpdateTask, onDeleteTask, currentUserId }: Props) {
  const getMemberName = (id: string | null) => members.find((m) => m.id === id)?.name || "—";

  const nextStatus = (status: string): Task["status"] => {
    if (status === "Pendente") return "Em andamento";
    if (status === "Em andamento") return "Concluída";
    return "Pendente";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((col) => (
        <div key={col} className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-2 h-2 rounded-full ${col === "Pendente" ? "bg-muted-foreground" : col === "Em andamento" ? "bg-primary" : "bg-[hsl(var(--status-ok))]"}`} />
            <h3 className="font-semibold text-sm">{col}</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              {tasks.filter((t) => t.status === col).length}
            </span>
          </div>
          <div className="space-y-2 min-h-[100px]">
            {tasks
              .filter((t) => t.status === col)
              .map((task) => (
                <div
                  key={task.id}
                  className="bg-background border border-border rounded-md p-3 space-y-2 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium leading-tight">{task.title}</span>
                    {currentUserId === task.userId && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onDeleteTask(task.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{getMemberName(task.assigneeId)}</span>
                    {task.isDaily && <Badge variant="secondary" className="text-[10px]">Diária</Badge>}
                  </div>
                  {task.dueDate && <p className="text-[10px] text-muted-foreground">📅 {task.dueDate}</p>}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-7 mt-1"
                    onClick={() => onUpdateTask({ ...task, status: nextStatus(task.status) })}
                  >
                    {task.status === "Pendente" ? "▶ Iniciar" : task.status === "Em andamento" ? "✓ Concluir" : "↩ Reabrir"}
                  </Button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
