import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CircleDollarSign, GripVertical, Loader2, Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import {
  SOCIAL_MEDIA_OWNERS,
  SITES_OWNERS,
  CRM_OWNERS,
  SOCIAL_MEDIA_PRIORITIES,
  SOCIAL_MEDIA_STATUSES,
  SocialMediaStatus,
  SocialMediaTask,
  SocialMediaTaskInput,
  KanbanBoardType,
  useSocialMediaKanban,
} from "@/hooks/useSocialMediaKanban";

const emptyTask: SocialMediaTaskInput = {
  title: "", client: "", description: "", owner: "Ana", priority: "Média", status: "Solicitado", dueDate: "", commissionPaid: false,
};

const columnStyles: Record<SocialMediaStatus, string> = {
  "Solicitado": "bg-blue-500",
  "Em produção": "bg-violet-500",
  "Aguardando aprovação": "bg-amber-500",
  "Ajustes": "bg-orange-500",
  "Concluído": "bg-emerald-500",
};

const priorityStyles = {
  Alta: "border-red-500/30 bg-red-500/10 text-red-400",
  Média: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  Baixa: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

const boardLabels: Record<KanbanBoardType, { title: string; subtitle: string; newTask: string }> = {
  social_media: { title: "Kanban Social Media", subtitle: "Fluxo de produção, responsáveis e prioridades", newTask: "Nova tarefa de Social Media" },
  sites: { title: "Kanban Sites", subtitle: "Fluxo de desenvolvimento e entrega de sites", newTask: "Nova tarefa de Site" },
  crm: { title: "Kanban CRM", subtitle: "Fluxo de implantação e acompanhamento de CRM", newTask: "Nova tarefa de CRM" },
  video_photo: { title: "Kanban Edição de Foto/Vídeo", subtitle: "Fluxo de edição, aprovação e entrega de conteúdos", newTask: "Nova tarefa de Foto/Vídeo" },
};

const boardOwners = {
  social_media: SOCIAL_MEDIA_OWNERS,
  sites: SITES_OWNERS,
  crm: CRM_OWNERS,
  video_photo: SOCIAL_MEDIA_OWNERS,
} satisfies Record<KanbanBoardType, readonly string[]>;

interface Props { boardType?: KanbanBoardType }

export default function SocialMediaKanbanPage({ boardType = "social_media" }: Props) {
  const labels = boardLabels[boardType];
  const owners = boardOwners[boardType];
  const defaultOwner = owners[0] as SocialMediaTaskInput["owner"];
  const { tasks, loading, addTask, updateTask, deleteTask } = useSocialMediaKanban(boardType);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SocialMediaTask | null>(null);
  const [form, setForm] = useState<SocialMediaTaskInput>(emptyTask);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("Todos");

  const filtered = useMemo(() => tasks.filter((task) => {
    const term = search.trim().toLowerCase();
    const matchesText = !term || `${task.title} ${task.client} ${task.description}`.toLowerCase().includes(term);
    return matchesText && (ownerFilter === "Todos" || task.owner === ownerFilter);
  }), [tasks, search, ownerFilter]);

  const showCreate = (status: SocialMediaStatus = "Solicitado") => {
    setEditing(null);
    setForm({ ...emptyTask, owner: defaultOwner, status });
    setOpen(true);
  };

  const showEdit = (task: SocialMediaTask) => {
    setEditing(task);
    setForm({ title: task.title, client: task.client, description: task.description, owner: task.owner, priority: task.priority, status: task.status, dueDate: task.dueDate, commissionPaid: task.commissionPaid });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    if (editing) await updateTask(editing.id, form);
    else await addTask(form);
    setOpen(false);
  };

  return (
    <DashboardLayout title={labels.title} subtitle={labels.subtitle} contentClassName="max-w-[110rem]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tarefa ou cliente..." className="pl-9" />
          </div>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Todos">Todos os responsáveis</SelectItem>{owners.map((owner) => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => showCreate()}><Plus className="mr-2 h-4 w-4" />Nova tarefa</Button>
        </div>

        {loading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            {SOCIAL_MEDIA_STATUSES.map((status) => {
              const columnTasks = filtered.filter((task) => task.status === status);
              return (
                <section key={status} className="min-h-[32rem] rounded-xl border border-border/70 bg-card/60 p-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("text/task-id"); if (id) updateTask(id, { status }); }}>
                  <header className="mb-3 flex items-center gap-2 px-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${columnStyles[status]}`} />
                    <h2 className="font-semibold">{status}</h2>
                    <Badge variant="secondary" className="ml-auto">{columnTasks.length}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => showCreate(status)}><Plus className="h-4 w-4" /></Button>
                  </header>
                  <div className="space-y-3">
                    {columnTasks.map((task) => (
                      <article key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)} className="group cursor-grab rounded-lg border border-border bg-background p-3 shadow-sm transition hover:border-primary/40 active:cursor-grabbing">
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                          <div className="min-w-0 flex-1"><h3 className="font-semibold leading-snug">{task.title}</h3>{task.client && <p className="mt-1 text-xs text-primary">{task.client}</p>}</div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => showEdit(task)}><Pencil className="h-3.5 w-3.5" /></Button>
                        </div>
                        {task.description && <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{task.description}</p>}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={priorityStyles[task.priority]}>{task.priority}</Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><UserRound className="h-3.5 w-3.5" />{task.owner}</span>
                          {task.dueDate && <span className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{new Date(`${task.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}</span>}
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); void updateTask(task.id, { commissionPaid: !task.commissionPaid }); }}
                            className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition ${task.commissionPaid ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}
                            title="Esta informação é somente um controle e não depende do prazo"
                          >
                            <CircleDollarSign className="h-3 w-3" />{task.commissionPaid ? "Comissão paga" : "Comissão pendente"}
                          </button>
                        </div>
                      </article>
                    ))}
                    {!columnTasks.length && <button onClick={() => showCreate(status)} className="w-full rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary">+ Adicionar tarefa</button>}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Editar tarefa" : labels.newTask}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Tarefa *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Criar carrossel da campanha" autoFocus /></div>
            <div className="space-y-2"><Label>Cliente</Label><Input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Nome do cliente" /></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label>Responsável</Label><Select value={form.owner} onValueChange={(owner: any) => setForm({ ...form, owner })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{owners.map((owner) => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Prioridade</Label><Select value={form.priority} onValueChange={(priority: any) => setForm({ ...form, priority })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SOCIAL_MEDIA_PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Fase</Label><Select value={form.status} onValueChange={(status: any) => setForm({ ...form, status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SOCIAL_MEDIA_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Controle da comissão</Label><Select value={form.commissionPaid ? "paga" : "pendente"} onValueChange={(value) => setForm({ ...form, commissionPaid: value === "paga" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Comissão pendente</SelectItem><SelectItem value="paga">Comissão paga</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Controle informativo, sem vínculo com a data da tarefa.</p></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes, formato, referências e observações..." rows={4} /></div>
          </div>
          <div className="flex items-center gap-2">
            {editing && <Button variant="destructive" onClick={async () => { await deleteTask(editing.id); setOpen(false); }}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>}
            <Button variant="outline" className="ml-auto" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!form.title.trim()}>{editing ? "Salvar alterações" : "Criar tarefa"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
