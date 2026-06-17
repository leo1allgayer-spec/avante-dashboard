import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useSurveyResponses() {
  return useQuery({
    queryKey: ["survey-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSurveyInsights() {
  return useQuery({
    queryKey: ["survey-insights"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("survey-insights");
      if (error) throw error;
      return data as {
        total_respostas: number;
        nps_medio: number;
        nota_whatsapp_media: number;
        tempo_decisao_distribuicao: Record<string, number>;
        top_dores: string[];
        top_motivos_fechamento: string[];
        top_objetivos: Record<string, number>;
        top_como_conheceu: Record<string, number>;
        valor_opiniao: Record<string, number>;
        resumo_ia: string;
      };
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
