import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CrmMqlData {
  total: number;
  daily: Record<string, number>;
  stars: { three: number; four: number; five: number };
}

export function useCrmMql(since: string, until: string) {
  return useQuery<CrmMqlData>({
    queryKey: ["crm-mql", since, until],
    queryFn: async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada. Entre novamente para atualizar o MQL.");

      const { data, error } = await supabase.functions.invoke("crm-mql", {
        body: { since, until },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as CrmMqlData;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}
