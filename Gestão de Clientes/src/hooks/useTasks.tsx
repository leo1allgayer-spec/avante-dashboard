import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Task } from "@/types/task";
import { toast } from "sonner";

function rowToTask(r: any): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description || "",
    assigneeId: r.assignee_id,
    dueDate: r.due_date || "",
    priority: r.priority,
    status: r.status,
    isDaily: r.is_daily || false,
    createdAt: r.created_at,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    userId: r.user_id,
  };
}

export function useTasks() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("tasks" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar tarefas");
      console.error(error);
    } else {
      setTasks((data as any[]).map(rowToTask));
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, fetchTasks]);

  const addTask = async (task: Omit<Task, "id" | "createdAt" | "startedAt" | "completedAt" | "userId">) => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("tasks" as any)
      .insert({
        title: task.title,
        description: task.description,
        assignee_id: task.assigneeId,
        due_date: task.dueDate,
        priority: task.priority,
        status: task.status,
        is_daily: task.isDaily,
        user_id: session.user.id,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar tarefa");
    } else {
      setTasks((prev) => [rowToTask(data), ...prev]);
      toast.success("Tarefa criada!");
    }
  };

  const updateTask = async (task: Task) => {
    const now = new Date().toISOString();
    const updates: any = {
      title: task.title,
      description: task.description,
      assignee_id: task.assigneeId,
      due_date: task.dueDate,
      priority: task.priority,
      status: task.status,
      is_daily: task.isDaily,
    };

    // Auto-track started_at and completed_at
    if (task.status === "Em andamento" && !task.startedAt) {
      updates.started_at = now;
      task = { ...task, startedAt: now };
    }
    if (task.status === "Concluída" && !task.completedAt) {
      updates.completed_at = now;
      if (!task.startedAt) updates.started_at = now;
      task = { ...task, completedAt: now, startedAt: task.startedAt || now };
    }
    // Reset if going back to Pendente
    if (task.status === "Pendente") {
      updates.started_at = null;
      updates.completed_at = null;
      task = { ...task, startedAt: null, completedAt: null };
    }

    const { error } = await supabase
      .from("tasks" as any)
      .update(updates)
      .eq("id", task.id);

    if (error) {
      toast.error("Erro ao atualizar tarefa");
    } else {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir tarefa");
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tarefa excluída!");
    }
  };

  return { tasks, loading, addTask, updateTask, deleteTask, refetch: fetchTasks };
}
