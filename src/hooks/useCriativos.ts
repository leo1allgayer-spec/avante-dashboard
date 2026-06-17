import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CriativoVenda {
  id: string;
  user_id: string;
  nome_aluno: string;
  data: string;
  criativo: string;
  valor_curso: number;
  valor_ads: number;
  roas: number;
  sinal: number;
  status: string;
  quantidade_cursos: number;
  created_at: string;
  updated_at: string;
}

export interface CriativoResumo {
  id: string;
  user_id: string;
  mes_ano: string;
  criativo: string;
  status: string;
  leads_recebidos: number;
  custo_por_lead: number;
  quantidade_fechamentos: number;
  valor_fechado: number;
  valor_gasto: number;
  roas: number;
  cac: number;
  taxa_conversao: number;
  quantidade_cursos: number;
  created_at: string;
  updated_at: string;
}

export function useCriativosVendas(mesAno?: string) {
  return useQuery({
    queryKey: ["criativos_vendas", mesAno],
    queryFn: async () => {
      let query = supabase
        .from("criativos_vendas")
        .select("*")
        .order("data", { ascending: false });

      if (mesAno) {
        const [y, m] = mesAno.split("-");
        const start = `${y}-${m}-01`;
        const end = new Date(Number(y), Number(m), 0).toISOString().split("T")[0];
        query = query.gte("data", start).lte("data", end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as CriativoVenda[]) || [];
    },
  });
}

export function useCriativosResumo(mesAno?: string) {
  return useQuery({
    queryKey: ["criativos_resumo", mesAno],
    queryFn: async () => {
      let query = supabase
        .from("criativos_resumo")
        .select("*")
        .order("criativo", { ascending: true });

      if (mesAno) {
        query = query.eq("mes_ano", mesAno);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as CriativoResumo[]) || [];
    },
  });
}

export function useCreateCriativoVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (venda: Omit<CriativoVenda, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("criativos_vendas")
        .insert(venda)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criativos_vendas"] }),
  });
}

export function useDeleteCriativoVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("criativos_vendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criativos_vendas"] }),
  });
}

export function useUpdateCriativoVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<CriativoVenda, "id" | "created_at" | "updated_at">>) => {
      const { data, error } = await supabase
        .from("criativos_vendas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criativos_vendas"] }),
  });
}

export function useUpsertCriativoResumo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resumo: Omit<CriativoResumo, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("criativos_resumo")
        .upsert(resumo, { onConflict: "user_id,mes_ano,criativo" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criativos_resumo"] }),
  });
}

export function useUpdateCriativoResumo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<CriativoResumo, "id" | "created_at" | "updated_at">>) => {
      const { data, error } = await supabase
        .from("criativos_resumo")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criativos_resumo"] }),
  });
}

export function useDeleteCriativoResumo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("criativos_resumo").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criativos_resumo"] }),
  });
}
