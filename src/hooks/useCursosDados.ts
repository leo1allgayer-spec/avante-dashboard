import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CursoDado {
  id: string;
  user_id: string | null;
  data: string;
  instrutor: string;
  tipo_curso: string;
  nome_aluno: string;
  comissao_extra: number;
  survey_response_id?: string | null;
  created_at: string;
  updated_at: string;
}

const normalizeCourseKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const COURSE_NAME_ALIASES: Record<string, string> = {
  "curso meta ads": "Curso de Meta Ads",
  "curso de meta ads": "Curso de Meta Ads",
  "curso google ads": "Curso de Google Ads",
  "curso de google ads": "Curso de Google Ads",
  "curso de social midia": "Curso de Social Media",
  "curso de social media": "Curso de Social Media",
  "curso de ia": "Curso de Inteligência Artificial",
  "curso de inteligencia artificial": "Curso de Inteligência Artificial",
  "curso canva para empreendedores": "Curso Canva para Empreendedores",
  "curso captacao edicao": "Curso de Edição e Captação de Vídeos",
  "curso de edicao e captacao de videos": "Curso de Edição e Captação de Vídeos",
};

export const canonicalizeCourseName = (value?: string | null) => {
  const courseName = (value || "").trim();
  return COURSE_NAME_ALIASES[normalizeCourseKey(courseName)] || courseName;
};

export const getCourseInstructor = (courseName?: string | null, fallback = "Leonardo") => {
  const key = normalizeCourseKey(courseName || "");
  if (key.includes("google ads")) return "Henrique";
  if (key.includes("social media") || key.includes("social midia")) return "Luana";
  if (key.includes("meta ads")) return "Leonardo";
  return fallback;
};

export function useCursosDados() {
  return useQuery({
    queryKey: ["cursos_dados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos_dados")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return ((data as CursoDado[]) || []).map((curso) => ({
        ...curso,
        instrutor: getCourseInstructor(
          curso.tipo_curso,
          !curso.instrutor.trim() || normalizeCourseKey(curso.instrutor) === "nao informado" ? "Leonardo" : curso.instrutor,
        ),
        tipo_curso: canonicalizeCourseName(curso.tipo_curso),
      }));
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
