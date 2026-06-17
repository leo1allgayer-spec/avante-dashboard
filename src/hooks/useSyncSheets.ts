import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSyncSheets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase.functions.invoke("sync-sheets", {
        body: { user_id: user.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; imported: number; errors: number; total: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["planilha-metrics"] });
    },
  });
}
