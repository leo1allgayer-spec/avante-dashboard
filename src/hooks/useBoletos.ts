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
  origem_manual?: boolean;
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
      const [salesResult, manualResult] = await Promise.all([
        (supabase as any)
          .from("boletos_recebimentos")
          .select("*, fechamento:fechamentos_diarios(cliente,categoria,produto_servico,vendedor,valor_sinal,valor_a_entrar,parcelas_total)")
          .neq("status", "cancelado")
          .order("vencimento", { ascending: true }),
        (supabase as any)
          .from("recorrencias_manuais")
          .select("*")
          .neq("status", "cancelado")
          .order("vencimento", { ascending: true }),
      ]);
      if (salesResult.error) throw salesResult.error;
      if (manualResult.error) throw manualResult.error;

      const manual = (manualResult.data || []).map((row: any): BoletoRecebimento => ({
        id: row.id,
        fechamento_id: `manual-${row.grupo_id}`,
        parcela_numero: row.parcela_numero,
        vencimento: row.vencimento,
        valor: Number(row.valor),
        status: row.status,
        pago_em: row.pago_em,
        forma_pagamento: "Boleto",
        origem_manual: true,
        fechamento: {
          cliente: row.cliente,
          categoria: row.tipo === "crm" ? "CRM recorrência" : "Site recorrência",
          produto_servico: row.servico,
          vendedor: "Cadastro recorrente",
          valor_sinal: 0,
          valor_a_entrar: Number(row.valor) * row.parcelas_total,
          parcelas_total: row.parcelas_total,
        },
      }));
      return ([...(salesResult.data || []), ...manual] as BoletoRecebimento[])
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    },
  });
}

export function useConfirmarBoleto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pagoEm, manual }: { id: string; pagoEm: string; manual?: boolean }) => {
      if (manual) {
        const { data, error } = await (supabase as any)
          .from("recorrencias_manuais")
          .update({ status: "pago", pago_em: pagoEm, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
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

export function useCriarRecorrenciaManual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tipo: "crm" | "sites"; cliente: string; servico: string; valor: number; primeiroVencimento: string; meses: number }) => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Usuário não autenticado");
      const grupoId = crypto.randomUUID();
      const start = new Date(`${input.primeiroVencimento}T12:00:00`);
      const rows = Array.from({ length: input.meses }, (_, index) => {
        const due = new Date(start);
        due.setMonth(start.getMonth() + index);
        return {
          user_id: authData.user!.id,
          grupo_id: grupoId,
          tipo: input.tipo,
          cliente: input.cliente.trim(),
          servico: input.servico.trim(),
          parcela_numero: index + 1,
          parcelas_total: input.meses,
          vencimento: due.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
          valor: input.valor,
        };
      });
      const { error } = await (supabase as any).from("recorrencias_manuais").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boletos-recebimentos"] }),
  });
}
