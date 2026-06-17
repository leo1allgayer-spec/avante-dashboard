import { useState } from "react";
import { useAuth } from "@/hooks/clients/useGestaoAuth";
import { useTasks } from "@/hooks/clients/useTasks";
import { useTeamMembers } from "@/hooks/clients/useTeamMembers";
import { useMeetings } from "@/hooks/clients/useMeetings";
import { TaskKanban } from "@/components/clients/tasks/TaskKanban";
import { TaskListView } from "@/components/clients/tasks/TaskListView";
import { TaskDashboard } from "@/components/clients/tasks/TaskDashboard";
import { MeetingsSection } from "@/components/clients/tasks/MeetingsSection";
import { DailyTasksSection } from "@/components/clients/tasks/DailyTasksSection";
import { TeamSection } from "@/components/clients/tasks/TeamSection";
import { AddTaskDialog } from "@/components/clients/tasks/AddTaskDialog";
import { CourseSection } from "@/components/clients/tasks/CourseSection";
import { AllCoursesSection } from "@/components/clients/tasks/AllCoursesSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard, KanbanSquare, List, CalendarDays, Users2, Plus, Search, Loader2, ClipboardList, RefreshCw, GraduationCap,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";

const Tasks = () => {
  const { session, signOut } = useAuth();
  const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask } = useTasks();
  const { members, loading: membersLoading, addMember, updateMember, deleteMember } = useTeamMembers();
  const { meetings, loading: meetingsLoading, addMeeting, updateMeeting, deleteMeeting } = useMeetings();

  const [showAddTask, setShowAddTask] = useState(false);
  const [taskView, setTaskView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const loading = tasksLoading || membersLoading || meetingsLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Carregando tarefas...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Gestão de Tarefas"
      subtitle="Organização de tarefas, equipe e reuniões"
    >
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5">
              <KanbanSquare className="h-3.5 w-3.5" /> Tarefas
            </TabsTrigger>
            <TabsTrigger value="daily" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Diárias
            </TabsTrigger>
            <TabsTrigger value="meetings" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> Reuniões
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users2 className="h-3.5 w-3.5" /> Equipe
            </TabsTrigger>
            <TabsTrigger value="curso-todos" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Todos
            </TabsTrigger>
            <TabsTrigger value="curso-google" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Google Ads
            </TabsTrigger>
            <TabsTrigger value="curso-social" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Social Media
            </TabsTrigger>
            <TabsTrigger value="curso-meta" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Meta Ads
            </TabsTrigger>
            <TabsTrigger value="curso-meta-avancado" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Meta Avançado
            </TabsTrigger>
            <TabsTrigger value="curso-ia" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> IA
            </TabsTrigger>
            <TabsTrigger value="curso-video" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Vídeo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <TaskDashboard tasks={tasks} members={members} />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tarefas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterAssignee} onValueChange={(v) => setFilterAssignee(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 border border-border rounded-md">
                <Button
                  variant={taskView === "kanban" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setTaskView("kanban")}
                >
                  <KanbanSquare className="h-4 w-4" />
                </Button>
                <Button
                  variant={taskView === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setTaskView("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setShowAddTask(true)} className="ml-auto">
                <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
              </Button>
            </div>

            {/* Views */}
            {taskView === "kanban" ? (
              <TaskKanban
                tasks={tasks.filter((t) => {
                  if (t.isDaily) return false;
                  if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
                  if (filterAssignee && t.assigneeId !== filterAssignee) return false;
                  if (filterStatus && t.status !== filterStatus) return false;
                  if (filterPriority && t.priority !== filterPriority) return false;
                  return true;
                })}
                members={members}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                currentUserId={session?.user?.id}
              />
            ) : (
              <TaskListView
                tasks={tasks.filter(t => !t.isDaily)}
                members={members}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                filterAssignee={filterAssignee}
                filterStatus={filterStatus}
                filterPriority={filterPriority}
                search={search}
                currentUserId={session?.user?.id}
              />
            )}
          </TabsContent>

          <TabsContent value="daily">
            <DailyTasksSection
              tasks={tasks}
              members={members}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              currentUserId={session?.user?.id}
            />
          </TabsContent>

          <TabsContent value="meetings">
            <MeetingsSection
              meetings={meetings}
              members={members}
              onAdd={addMeeting}
              onUpdate={updateMeeting}
              onDelete={deleteMeeting}
            />
          </TabsContent>

          <TabsContent value="team">
            <TeamSection
              members={members}
              onAdd={addMember}
              onUpdate={updateMember}
              onDelete={deleteMember}
            />
          </TabsContent>

          <TabsContent value="curso-todos">
            <AllCoursesSection />
          </TabsContent>
          <TabsContent value="curso-google">
            <CourseSection courseType="google" />
          </TabsContent>
          <TabsContent value="curso-social">
            <CourseSection courseType="social_media" />
          </TabsContent>
          <TabsContent value="curso-meta">
            <CourseSection courseType="meta_ads" />
          </TabsContent>
          <TabsContent value="curso-meta-avancado">
            <CourseSection courseType="meta_ads_advanced" />
          </TabsContent>
          <TabsContent value="curso-ia">
            <CourseSection courseType="ia" />
          </TabsContent>
          <TabsContent value="curso-video">
            <CourseSection courseType="video" />
          </TabsContent>
        </Tabs>

      <AddTaskDialog
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        onAdd={addTask}
        members={members}
      />
    </DashboardLayout>
  );
};

export default Tasks;
