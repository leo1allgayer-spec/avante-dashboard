import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CursoDado {
  id: string;
  user_id: string;
  data: string;
  instrutor: string;
  tipo_curso: string;
  nome_aluno: string;
  comissao_extra: number;
  created_at: string;
  updated_at: string;
}

export function useCursosDados() {
  return useQuery({
    queryKey: ["cursos_dados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos_dados")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data as CursoDado[]) || [];
    },
  });
}

export function useCreateCursoDado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (curso: Omit<CursoDado, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("cursos_dados")
        .insert(curso)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cursos_dados"] }),
  });
}

export function useUpdateCursoDado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CursoDado> & { id: string }) => {
      const { data, error } = await supabase
        .from("cursos_dados")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cursos_dados"] }),
  });
}

export function useDeleteCursoDado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cursos_dados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cursos_dados"] }),
  });
}
