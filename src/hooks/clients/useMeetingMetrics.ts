import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { useAuth } from "@/hooks/clients/useGestaoAuth";

export interface MeetingMonthlyMetrics {
  id?: string;
  month: string;
  scheduling_goal: number;
  cost_per_scheduling: number;
  meetings_scheduled: number;
  meetings_held: number;
}

const emptyMetrics = (month: string): MeetingMonthlyMetrics => ({
  month,
  scheduling_goal: 0,
  cost_per_scheduling: 0,
  meetings_scheduled: 0,
  meetings_held: 0,
});

export function useMeetingMonthlyMetrics(month: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["meeting-monthly-metrics", session?.user?.id, month],
    enabled: Boolean(session?.user?.id && month),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_monthly_metrics" as any)
        .select("*")
        .eq("user_id", session!.user.id)
        .eq("month", month)
        .maybeSingle();
      if (error) throw error;
      return data ? data as unknown as MeetingMonthlyMetrics : emptyMetrics(month);
    },
  });
}

export function useSaveMeetingMonthlyMetrics() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (metrics: MeetingMonthlyMetrics) => {
      if (!session?.user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("meeting_monthly_metrics" as any)
        .upsert({ ...metrics, user_id: session.user.id, updated_at: new Date().toISOString() } as any, { onConflict: "user_id,month" })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MeetingMonthlyMetrics;
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ["meeting-monthly-metrics", session?.user?.id, data.month] }),
  });
}