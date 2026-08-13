import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface FutureStudent {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  cpf_limpo?: string | null;
  curso: string;
  itens?: Array<{
    tipo: "curso" | "produto" | "servico";
    nome: string;
    valor_sinal: number;
    valor_pendente?: number;
    data: string;
  }> | null;
  valor_sinal: number;
  status: string;
  observacao: string | null;
  survey_response_id: string | null;
  created_at: string;
  updated_at: string;
}

export type FutureStudentInsert = {
  nome: string;
  telefone: string;
  cpf: string;
  valor_sinal: number;
  status?: string;
  observacao?: string | null;
};

function isMissingTableError(error: unknown) {
  const message = String((error as any)?.message || "");
  return message.includes("alunos_futuros") && (message.includes("schema cache") || message.includes("does not exist"));
}

export function useFutureStudents() {
  return useQuery({
    queryKey: ["future-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos_futuros" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (isMissingTableError(error)) return [] as FutureStudent[];
        throw error;
      }

      return (data as FutureStudent[]) || [];
    },
  });
}

export function useCreateFutureStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (student: FutureStudentInsert) => {
      const { error } = await supabase
        .from("alunos_futuros" as any)
        .insert({
          ...student,
          status: student.status || "sinal_pago",
          observacao: student.observacao || "",
        });

      if (error) throw error;
      return null;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["future-students"] }),
  });
}

export function useUpdateFutureStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FutureStudent> & { id: string }) => {
      const { data, error } = await supabase
        .from("alunos_futuros" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FutureStudent;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["future-students"] }),
  });
}

export function useDeleteFutureStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alunos_futuros" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["future-students"] }),
  });
}

export async function findFutureStudentByCpf(cpf: string) {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (!cpfLimpo) return null;

  const { data, error } = await supabase
    .from("alunos_futuros" as any)
    .select("*")
    .eq("cpf_limpo", cpfLimpo)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }

  return (data as FutureStudent | null) || null;
}
