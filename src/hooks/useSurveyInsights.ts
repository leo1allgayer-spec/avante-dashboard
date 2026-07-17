import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SurveyResponse {
  id: string;
  user_id: string | null;
  nome: string;
  cpf: string | null;
  cep: string | null;
  cidade: string | null;
  email: string | null;
  instagram: string | null;
  endereco: string | null;
  whatsapp: string | null;
  data_curso: string | null;
  como_conheceu: string | null;
  tempo_para_fechar: string | null;
  conversou_outras_escolas: string | null;
  objetivo_principal: string | null;
  segmento: string | null;
  fator_determinante: string | null;
  dor_principal: string | null;
  consultor: string | null;
  tempo_atendimento: string | null;
  atendimento_rapido: string | null;
  nota_whatsapp: number | null;
  forma_atendimento: string | null;
  motivacao_fechar: string | null;
  valor_curso_opiniao: string | null;
  sugestao_atendimento: string | null;
  indicaria_alguem: string | null;
  nota_indicacao: number | null;
  created_at: string;
}

export function useSurveyResponses() {
  return useQuery({
    queryKey: ["survey-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as SurveyResponse[]) || [];
    },
  });
}

export function useUpdateSurveyResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SurveyResponse> & { id: string }) => {
      const { data, error } = await supabase
        .from("survey_responses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["survey-responses"] });
      qc.invalidateQueries({ queryKey: ["survey-insights"] });
    },
  });
}

export function useDeleteSurveyResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("survey_responses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["survey-responses"] });
      qc.invalidateQueries({ queryKey: ["survey-insights"] });
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
