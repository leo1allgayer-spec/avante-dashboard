import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface FechamentoDiario {
  id: string;
  user_id: string;
  data: string;
  cliente: string;
  vendedor: string;
  produto_servico: string;
  categoria: string | null;
  valor_sinal: number;
  valor_a_entrar: number;
  valor_recorrente: number;
  parcelas_total: number | null;
  valor_parcela: number;
  previsao_entrada: string | null;
  status: string;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export type FechamentoPayload = Omit<FechamentoDiario, "id" | "created_at" | "updated_at">;

export function useFechamentosDiarios() {
  return useQuery({
    queryKey: ["fechamentos_diarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fechamentos_diarios")
        .select("*")
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as FechamentoDiario[]) || [];
    },
  });
}

export function useCreateFechamentoDiario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fechamento: FechamentoPayload) => {
      const { data, error } = await supabase
        .from("fechamentos_diarios")
        .insert(fechamento)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fechamentos_diarios"] }),
  });
}

export function useUpdateFechamentoDiario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FechamentoDiario> & { id: string }) => {
      const { data, error } = await supabase
        .from("fechamentos_diarios")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fechamentos_diarios"] }),
  });
}

export function useDeleteFechamentoDiario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fechamentos_diarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fechamentos_diarios"] }),
  });
}
