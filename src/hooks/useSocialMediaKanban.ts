import { useCallback, useEffect, useState } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { toast } from "sonner";

export const SOCIAL_MEDIA_STATUSES = ["Solicitado", "Em produção", "Aguardando aprovação", "Ajustes", "Concluído"] as const;
export const SOCIAL_MEDIA_OWNERS = ["Ana", "Luana", "Andrei"] as const;
export const SITES_OWNERS = ["Leonardo"] as const;
export const CRM_OWNERS = ["Matheus"] as const;
export const SOCIAL_MEDIA_PRIORITIES = ["Alta", "Média", "Baixa"] as const;
export type KanbanBoardType = "social_media" | "sites" | "crm" | "video_photo";

export type SocialMediaStatus = string;
export type SocialMediaOwner = (typeof SOCIAL_MEDIA_OWNERS)[number] | (typeof SITES_OWNERS)[number] | (typeof CRM_OWNERS)[number];
export type SocialMediaPriority = (typeof SOCIAL_MEDIA_PRIORITIES)[number];

export interface SocialMediaTask {
  id: string;
  title: string;
  client: string;
  description: string;
  owner: SocialMediaOwner;
  priority: SocialMediaPriority;
  status: SocialMediaStatus;
  dueDate: string;
  commissionPaid: boolean;
  createdAt: string;
}

export interface KanbanStage {
  id: string;
  name: string;
  position: number;
}

export type SocialMediaTaskInput = Omit<SocialMediaTask, "id" | "createdAt">;

const fromRow = (row: any): SocialMediaTask => ({
  id: row.id,
  title: row.title,
  client: row.client || "",
  description: row.description || "",
  owner: row.owner,
  priority: row.priority,
  status: row.status,
  dueDate: row.due_date || "",
  commissionPaid: Boolean(row.commission_paid),
  createdAt: row.created_at,
});

export function useSocialMediaKanban(boardType: KanbanBoardType = "social_media") {
  const [tasks, setTasks] = useState<SocialMediaTask[]>([]);
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStages = useCallback(async () => {
    const { data, error } = await supabase
      .from("operational_kanban_stages" as any)
      .select("id,name,position")
      .eq("board_type", boardType)
      .order("position", { ascending: true });
    if (error) console.error(error);
    else setStages((data || []) as unknown as KanbanStage[]);
  }, [boardType]);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("social_media_kanban_tasks" as any)
      .select("*")
      .eq("board_type", boardType)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar o Kanban");
    } else {
      setTasks((data || []).map(fromRow));
    }
    setLoading(false);
  }, [boardType]);

  useEffect(() => { void Promise.all([fetchTasks(), fetchStages()]); }, [fetchTasks, fetchStages]);

  useEffect(() => {
    const channel = supabase
      .channel(`operational-kanban-${boardType}-realtime`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_media_kanban_tasks" }, fetchTasks)
      .on("postgres_changes", { event: "*", schema: "public", table: "operational_kanban_stages" }, fetchStages)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [boardType, fetchTasks, fetchStages]);

  const addStage = async (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return false;
    const { error } = await supabase.from("operational_kanban_stages" as any).insert({ board_type: boardType, name: cleanName, position: stages.length } as any);
    if (error) { toast.error(error.code === "23505" ? "Essa etapa já existe" : "Erro ao criar etapa"); return false; }
    await fetchStages();
    toast.success("Etapa criada");
    return true;
  };

  const renameStage = async (stage: KanbanStage, name: string) => {
    const cleanName = name.trim();
    if (!cleanName || cleanName === stage.name) return false;
    const { error } = await supabase.rpc("rename_operational_kanban_stage" as any, { p_stage_id: stage.id, p_new_name: cleanName } as any);
    if (error) { toast.error("Erro ao renomear etapa"); return false; }
    await Promise.all([fetchStages(), fetchTasks()]);
    toast.success("Etapa renomeada");
    return true;
  };

  const deleteStage = async (stage: KanbanStage) => {
    if (tasks.some((task) => task.status === stage.name)) { toast.error("Mova os cartões antes de excluir esta etapa"); return false; }
    if (stages.length <= 1) { toast.error("O Kanban precisa ter pelo menos uma etapa"); return false; }
    const { error } = await supabase.from("operational_kanban_stages" as any).delete().eq("id", stage.id);
    if (error) { toast.error("Erro ao excluir etapa"); return false; }
    await fetchStages();
    toast.success("Etapa excluída");
    return true;
  };

  const moveStage = async (stageId: string, direction: -1 | 1) => {
    const index = stages.findIndex((stage) => stage.id === stageId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= stages.length) return;
    const current = stages[index];
    const target = stages[targetIndex];
    setStages((items) => { const next = [...items]; [next[index], next[targetIndex]] = [next[targetIndex], next[index]]; return next; });
    const [first, second] = await Promise.all([
      supabase.from("operational_kanban_stages" as any).update({ position: target.position } as any).eq("id", current.id),
      supabase.from("operational_kanban_stages" as any).update({ position: current.position } as any).eq("id", target.id),
    ]);
    if (first.error || second.error) { toast.error("Erro ao reorganizar etapas"); await fetchStages(); }
  };

  const addTask = async (task: SocialMediaTaskInput) => {
    const { error } = await supabase.from("social_media_kanban_tasks" as any).insert({
      title: task.title,
      client: task.client,
      description: task.description,
      owner: task.owner,
      priority: task.priority,
      status: task.status,
      due_date: task.dueDate || null,
      commission_paid: task.commissionPaid,
      board_type: boardType,
    } as any);
    if (error) return toast.error("Erro ao criar tarefa");
    toast.success("Tarefa criada");
    await fetchTasks();
  };

  const updateTask = async (id: string, task: Partial<SocialMediaTaskInput>) => {
    const payload: Record<string, unknown> = {};
    if (task.title !== undefined) payload.title = task.title;
    if (task.client !== undefined) payload.client = task.client;
    if (task.description !== undefined) payload.description = task.description;
    if (task.owner !== undefined) payload.owner = task.owner;
    if (task.priority !== undefined) payload.priority = task.priority;
    if (task.status !== undefined) payload.status = task.status;
    if (task.dueDate !== undefined) payload.due_date = task.dueDate || null;
    if (task.commissionPaid !== undefined) payload.commission_paid = task.commissionPaid;
    const { error } = await supabase.from("social_media_kanban_tasks" as any).update(payload as any).eq("id", id);
    if (error) return toast.error("Erro ao atualizar tarefa");
    setTasks((current) => current.map((item) => item.id === id ? { ...item, ...task } : item));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("social_media_kanban_tasks" as any).delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir tarefa");
    setTasks((current) => current.filter((item) => item.id !== id));
    toast.success("Tarefa excluída");
  };

  return { tasks, stages, loading, addTask, updateTask, deleteTask, addStage, renameStage, deleteStage, moveStage };
}
