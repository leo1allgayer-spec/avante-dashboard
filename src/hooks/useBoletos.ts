import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BoletoRecebimento {
  id: string;
  fechamento_id: string;
  parcela_numero: number;
  vencimento: string;
  valor: number;
  status: "pendente" | "pago" | "cancelado";
  pago_em: string | null;
  forma_pagamento: string | null;
  fechamento: {
    cliente: string;
    categoria: string | null;
    produto_servico: string;
    vendedor: string;
    valor_sinal: number;
    valor_a_entrar: number;
    parcelas_total: number | null;
  } | null;
}

export function useBoletos() {
  return useQuery({
    queryKey: ["boletos-recebimentos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("boletos_recebimentos")
        .select("*, fechamento:fechamentos_diarios(cliente,categoria,produto_servico,vendedor,valor_sinal,valor_a_entrar,parcelas_total)")
        .neq("status", "cancelado")
        .order("vencimento", { ascending: true });
      if (error) throw error;
      return (data || []) as BoletoRecebimento[];
    },
  });
}

export function useConfirmarBoleto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pagoEm }: { id: string; pagoEm: string }) => {
      const { data, error } = await (supabase as any).rpc("confirmar_pagamento_boleto", {
        p_boleto_id: id,
        p_pago_em: pagoEm,
        p_forma_pagamento: "Boleto",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["boletos-recebimentos"] }),
        queryClient.invalidateQueries({ queryKey: ["fechamentos_diarios"] }),
        queryClient.invalidateQueries({ queryKey: ["vendas"] }),
      ]);
    },
  });
}
