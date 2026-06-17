import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { TeamMember } from "@/types/task";
import { toast } from "sonner";

export function useTeamMembers() {
  const { session } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("team_members" as any)
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar equipe");
      console.error(error);
    } else {
      setMembers(
        (data as any[]).map((r) => ({
          id: r.id,
          name: r.name,
          dailyTaskGoal: r.daily_task_goal,
          weeklyTaskGoal: r.weekly_task_goal,
          maxTaskMinutes: r.max_task_minutes,
        }))
      );
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel("team-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => fetchMembers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, fetchMembers]);

  const addMember = async (name: string) => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("team_members" as any)
      .insert({ name, user_id: session.user.id } as any)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao adicionar membro");
    } else {
      const r = data as any;
      setMembers((prev) => [
        ...prev,
        { id: r.id, name: r.name, dailyTaskGoal: r.daily_task_goal, weeklyTaskGoal: r.weekly_task_goal, maxTaskMinutes: r.max_task_minutes },
      ]);
      toast.success("Membro adicionado!");
    }
  };

  const updateMember = async (member: TeamMember) => {
    const { error } = await supabase
      .from("team_members" as any)
      .update({
        name: member.name,
        daily_task_goal: member.dailyTaskGoal,
        weekly_task_goal: member.weeklyTaskGoal,
        max_task_minutes: member.maxTaskMinutes,
      } as any)
      .eq("id", member.id);

    if (error) {
      toast.error("Erro ao atualizar membro");
    } else {
      setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
    }
  };

  const deleteMember = async (id: string) => {
    const { error } = await supabase.from("team_members" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir membro");
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success("Membro removido!");
    }
  };

  return { members, loading, addMember, updateMember, deleteMember, refetch: fetchMembers };
}
