import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface PagamentoVariavel {
  id: string;
  user_id: string;
  pessoa: string;
  cliente: string;
  valor: number;
  tipo: string;
  dia_pagamento: number;
  mes_ano: string;
  created_at: string;
  updated_at: string;
}

export function usePagamentosVariaveis() {
  return useQuery({
    queryKey: ["pagamentos_variaveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos_variaveis")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as PagamentoVariavel[]) || [];
    },
  });
}

export function useCreatePagamentoVariavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pv: Omit<PagamentoVariavel, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("pagamentos_variaveis")
        .insert(pv)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagamentos_variaveis"] }),
  });
}

export function useCreatePagamentosVariaveisRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      base,
      meses,
    }: {
      base: Omit<PagamentoVariavel, "id" | "created_at" | "updated_at" | "mes_ano">;
      meses: string[];
    }) => {
      const rows = meses.map((m) => ({ ...base, mes_ano: m }));
      const { data, error } = await supabase
        .from("pagamentos_variaveis")
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagamentos_variaveis"] }),
  });
}

export function useDeletePagamentoVariavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pagamentos_variaveis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagamentos_variaveis"] }),
  });
}

export function useDeletePagamentoVariavelRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pessoa,
      cliente,
      tipo,
      dia_pagamento,
      valor,
      from_mes_ano,
    }: {
      pessoa: string;
      cliente: string;
      tipo: string;
      dia_pagamento: number;
      valor: number;
      from_mes_ano: string;
    }) => {
      const { error } = await supabase
        .from("pagamentos_variaveis")
        .delete()
        .eq("pessoa", pessoa)
        .eq("cliente", cliente)
        .eq("tipo", tipo)
        .eq("dia_pagamento", dia_pagamento)
        .eq("valor", valor)
        .gte("mes_ano", from_mes_ano);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagamentos_variaveis"] }),
  });
}
