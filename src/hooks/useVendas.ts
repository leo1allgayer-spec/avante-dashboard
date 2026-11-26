import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {saleCourseDisplayName,saleCourseFinancialName} from '@/constants/courseCatalog';

const saleRead=(sale:Venda)=>({...sale,produto:saleCourseFinancialName(sale.produto),servico:saleCourseFinancialName(sale.servico)});
const saleWrite=<T extends Partial<Venda>>(sale:T)=>{
 const result={...sale};
 if(typeof result.produto==='string')result.produto=saleCourseDisplayName(result.produto);
 if(typeof result.servico==='string')result.servico=saleCourseDisplayName(result.servico);
 return result;
};

export interface Venda {
  id: string;
  user_id: string;
  data: string;
  vendedor: string;
  cliente: string;
  produto: string;
  valor: number;
  saldo_recorrente_sem_comissao?: boolean;
  pagamento: string;
  pagamento_saldo?: string | null;
  parcelas: string | null;
  valor_com_juros: number | null;
  comissao: number;
  comissao_paga_valor?: number;
  data_ultimo_pagamento_comissao?: string | null;
  status_comissao?: string;
  status: string;
  servico: string;
  origem: string;
  forma_venda?: string | null;
  created_at: string;
  updated_at: string;
  aluno_futuro_id?: string | null;
  aluno_futuro_item?: string | null;
}

export function useVendas() {
  return useQuery({
    queryKey: ["vendas"],
    refetchOnReconnect: "always",
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as Venda[]) || []).map(saleRead);
    },
  });
}

export function useCreateVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (venda: Omit<Venda, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("vendas")
        .insert(saleWrite(venda))
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
        .update(saleWrite(updates))
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (updated) => {
      qc.setQueryData<Venda[]>(["vendas"], (current = []) =>
        current.map((sale) => sale.id === updated.id ? saleRead({ ...sale, ...updated } as Venda) : sale),
      );
      await Promise.all([
        qc.refetchQueries({ queryKey: ["vendas"] }),
        qc.invalidateQueries({ queryKey: ["future-students"] }),
        qc.invalidateQueries({ queryKey: ["student-data"] }),
      ]);
    },
  });
}

export function useDeleteVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<{ id: string; closingId?: string | null; creativeId?: string | null; expectedUpdatedAt?: string | null }>) => {
      const { error } = await supabase.rpc("delete_sale_items" as any, {
        p_items: items.map((item) => ({
          sale_id: item.id,
          closing_id: item.closingId || null,
          creative_id: item.creativeId || null,
          expected_updated_at: item.expectedUpdatedAt || null,
        })) as any,
      });
      if (error) throw new Error(error.message || "Não foi possível remover a venda.");
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["vendas"] }),
        qc.invalidateQueries({ queryKey: ["fechamentos_diarios"] }),
        qc.invalidateQueries({ queryKey: ["criativos_vendas"] }),
      ]);
    },
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
