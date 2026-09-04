import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { AddTaskDialog } from "@/components/clients/tasks/AddTaskDialog";
import { TaskListView } from "@/components/clients/tasks/TaskListView";
import { useAuth } from "@/hooks/clients/useGestaoAuth";
import { useTasks } from "@/hooks/clients/useTasks";
import { useTeamMembers } from "@/hooks/clients/useTeamMembers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Loader2, Plus, Search } from "lucide-react";

export default function TaskManagerPage() {
  const { session } = useAuth();
  const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask } = useTasks();
  const { members, loading: membersLoading } = useTeamMembers();
  const [showAddTask, setShowAddTask] = useState(false);
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  if (tasksLoading || membersLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return <PageTransition><DashboardLayout title="Gestor de Tarefas" subtitle="A Fazer → Em Andamento → Revisão → Concluído" contentClassName="max-w-[96rem]">
    <div className="rounded-xl border border-border/40 bg-card/70 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-2 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /><span className="font-semibold">Tabela de tarefas</span></div>
        <div className="relative min-w-[220px] flex-1 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tarefas..." className="pl-9" /></div>
        <Select value={filterAssignee} onValueChange={(value) => setFilterAssignee(value === "all" ? "" : value)}><SelectTrigger className="w-[170px]"><SelectValue placeholder="Responsável" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os responsáveis</SelectItem>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select>
        <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value === "all" ? "" : value)}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="Pendente">A Fazer</SelectItem><SelectItem value="Em andamento">Em Andamento</SelectItem><SelectItem value="Revisão">Revisão</SelectItem><SelectItem value="Concluída">Concluído</SelectItem></SelectContent></Select>
        <Select value={filterPriority} onValueChange={(value) => setFilterPriority(value === "all" ? "" : value)}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="Alta">Alta</SelectItem><SelectItem value="Média">Média</SelectItem><SelectItem value="Baixa">Baixa</SelectItem></SelectContent></Select>
        <Button onClick={() => setShowAddTask(true)} className="ml-auto"><Plus className="mr-1 h-4 w-4" /> Nova Tarefa</Button>
      </div>
    </div>

    <TaskListView tasks={tasks.filter((task) => !task.isDaily)} members={members} onUpdateTask={updateTask} onDeleteTask={deleteTask} filterAssignee={filterAssignee} filterStatus={filterStatus} filterPriority={filterPriority} search={search} currentUserId={session?.user?.id} />
    <AddTaskDialog open={showAddTask} onClose={() => setShowAddTask(false)} onAdd={addTask} members={members} />
  </DashboardLayout></PageTransition>;
}