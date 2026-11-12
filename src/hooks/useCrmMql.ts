import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CrmMqlData {
  total: number;
  daily: Record<string, number>;
  stars: { three: number; four: number; five: number };
  leadsDaily?: Record<string, number>;
  leadsComplete?: boolean;
  crmReportLeads?: number | null;
  crmReportError?: string | null;
}

const cacheKey = (since: string, until: string) => "crm-mql-cache-v2:" + since + ":" + until;

const readCachedMql = (since: string, until: string) => {
  if (typeof window === "undefined") return undefined;
  try {
    const cached = JSON.parse(window.localStorage.getItem(cacheKey(since, until)) || "null");
    if (!cached?.data || !cached?.savedAt || Date.now() - Number(cached.savedAt) > 24 * 60 * 60 * 1000) return undefined;
    return cached as { data: CrmMqlData; savedAt: number };
  } catch {
    return undefined;
  }
};

export function useCrmMql(since: string, until: string, enabled = true) {
  const cached = readCachedMql(since, until);
  return useQuery<CrmMqlData>({
    enabled,
    queryKey: ["crm-mql", since, until],
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
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
      const result = data as CrmMqlData;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(cacheKey(since, until), JSON.stringify({ data: result, savedAt: Date.now() }));
        } catch {
          // O dashboard continua funcionando mesmo se o armazenamento local estiver indisponível.
        }
      }
      return result;
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: 1,
  });
}


