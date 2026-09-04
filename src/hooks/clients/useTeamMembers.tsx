import { useState, useEffect, useCallback } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { useAuth } from "./useGestaoAuth";
import { TeamMember } from "@/types/clients/task";
import { toast } from "sonner";

export function useTeamMembers() {
  const { session } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    const [{ data: ownData, error: ownError }, { data: directoryData, error: directoryError }] = await Promise.all([
      supabase.from("team_members" as any).select("*").order("created_at", { ascending: true }),
      (supabase as any).rpc("list_team_members_for_assignment"),
    ]);

    if (ownError || directoryError) {
      toast.error("Erro ao carregar equipe");
      console.error(ownError || directoryError);
    } else {
      const ownMembers = new Map<string, TeamMember>(
        ((ownData || []) as any[]).map((r) => [
          r.id,
          {
            id: r.id,
            name: r.name,
            phone: r.phone || "",
            dailyTaskGoal: r.daily_task_goal,
            weeklyTaskGoal: r.weekly_task_goal,
            maxTaskMinutes: r.max_task_minutes,
          },
        ])
      );
      const uniqueMembers = new Map<string, TeamMember>();
      ((directoryData || []) as any[]).forEach((r) => {
        const member = ownMembers.get(r.id) || {
          id: r.id,
          name: r.name,
          phone: "",
          dailyTaskGoal: 0,
          weeklyTaskGoal: 0,
          maxTaskMinutes: 120,
        };
        const key = member.name.trim().toLocaleLowerCase("pt-BR");
        if (key && !uniqueMembers.has(key)) uniqueMembers.set(key, member);
      });
      setMembers(
        [...uniqueMembers.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
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

  const addMember = async (name: string, phone = "") => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("team_members" as any)
      .insert({ name, phone, user_id: session.user.id } as any)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao adicionar membro");
    } else {
      const r = data as any;
      setMembers((prev) => [
        ...prev,
        { id: r.id, name: r.name, phone: r.phone || "", dailyTaskGoal: r.daily_task_goal, weeklyTaskGoal: r.weekly_task_goal, maxTaskMinutes: r.max_task_minutes },
      ]);
      toast.success("Membro adicionado!");
    }
  };

  const updateMember = async (member: TeamMember) => {
    const { error } = await supabase
      .from("team_members" as any)
      .update({
        name: member.name,
        phone: member.phone,
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
