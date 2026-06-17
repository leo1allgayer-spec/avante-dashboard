import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Venda {
  id: string;
  user_id: string;
  data: string;
  vendedor: string;
  cliente: string;
  produto: string;
  valor: number;
  pagamento: string;
  parcelas: string | null;
  valor_com_juros: number | null;
  comissao: number;
  status: string;
  servico: string;
  origem: string;
  created_at: string;
  updated_at: string;
}

export function useVendas() {
  return useQuery({
    queryKey: ["vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data as Venda[]) || [];
    },
  });
}

export function useCreateVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (venda: Omit<Venda, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("vendas")
        .insert(venda)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendas"] }),
  });
}

export function useUpdateVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Venda> & { id: string }) => {
      const { data, error } = await supabase
        .from("vendas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendas"] }),
  });
}

export function useDeleteVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendas"] }),
  });
}

export function useClearVendas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vendas").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendas"] }),
  });
}
