import { useCallback, useEffect, useState } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { toast } from "sonner";

export const SOCIAL_MEDIA_STATUSES = ["Solicitado", "Em produção", "Aguardando aprovação", "Concluído"] as const;
export const SOCIAL_MEDIA_OWNERS = ["Ana", "Luana", "Andrei"] as const;
export const SOCIAL_MEDIA_PRIORITIES = ["Alta", "Média", "Baixa"] as const;

export type SocialMediaStatus = (typeof SOCIAL_MEDIA_STATUSES)[number];
export type SocialMediaOwner = (typeof SOCIAL_MEDIA_OWNERS)[number];
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
  createdAt: string;
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
  createdAt: row.created_at,
});

export function useSocialMediaKanban() {
  const [tasks, setTasks] = useState<SocialMediaTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("social_media_kanban_tasks" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar o Kanban de Social Media");
    } else {
      setTasks((data || []).map(fromRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    const channel = supabase
      .channel("social-media-kanban-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_media_kanban_tasks" }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  const addTask = async (task: SocialMediaTaskInput) => {
    const { error } = await supabase.from("social_media_kanban_tasks" as any).insert({
      title: task.title,
      client: task.client,
      description: task.description,
      owner: task.owner,
      priority: task.priority,
      status: task.status,
      due_date: task.dueDate || null,
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

  return { tasks, loading, addTask, updateTask, deleteTask };
}
