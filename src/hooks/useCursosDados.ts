import {courseDisplayName} from '@/constants/courseCatalog';
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useVendas } from "@/hooks/useVendas";
import { isDisparoCourseSale } from "@/lib/courseSaleOrigin";

export interface CursoDado {
  id: string;
  user_id: string | null;
  data: string;
  instrutor: string;
  tipo_curso: string;
  nome_aluno: string;
  comissao_extra: number;
  comissao_paga_valor?: number;
  data_pagamento_comissao?: string | null;
  survey_response_id?: string | null;
  created_at: string;
  updated_at: string;
  comissao_extra_base?: number;
  origem_disparo?: boolean;
}

const normalizeCourseKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const canonicalizeCourseName=courseDisplayName;

export const getCourseInstructor = (courseName?: string | null, fallback = "") => {
  const key = normalizeCourseKey(courseName || "");
  const hasMetaAssignment = key.includes("meta ads");
  const allowsHenrique = hasMetaAssignment || key.includes("google ads");
  if (allowsHenrique && (fallback === "Nicolas" || fallback === "Henrique")) return fallback;
  if (key.includes("google ads")) return "Henrique";
  return "Nicolas";
};

export const getCourseInstructorOptions = (courseName?: string | null) =>
  /meta ads|google ads/.test(normalizeCourseKey(courseName || ""))
    ? ["Nicolas", "Henrique"]
    : ["Nicolas"];

export function useCursosDados() {
  const { data: sales = [], isLoading: salesLoading } = useVendas();
  const query = useQuery({
    queryKey: ["cursos_dados"],
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
    queryFn: async () => {
      const [{ data, error }, { data: bookings, error: bookingsError }] = await Promise.all([
        supabase
          .from("cursos_dados")
          .select("*")
          .order("data", { ascending: false }),
        (supabase as any)
          .from("course_bookings")
          .select("course_name,date,student_name,instructor")
          .in("course_name", ["Curso Meta Ads", "Curso Meta Ads Avançado", "Curso Meta Ads Online"])
          .not("instructor", "is", null)
          .eq("status", "confirmed"),
      ]);
      if (error) throw error;
      if (bookingsError) throw bookingsError;
      return ((data as CursoDado[]) || []).map((curso) => ({
        ...curso,
        instrutor: (() => {
          const courseKey = normalizeCourseKey(canonicalizeCourseName(curso.tipo_curso));
          const studentKey = normalizeCourseKey(curso.nome_aluno);
          const assignedBooking = (bookings || []).find((booking: any) =>
            booking.date === curso.data &&
            normalizeCourseKey(canonicalizeCourseName(booking.course_name)) === courseKey &&
            normalizeCourseKey(booking.student_name) === studentKey &&
            (booking.instructor === "Nicolas" || booking.instructor === "Henrique")
          );
          const storedInstructor = curso.instrutor === "Nicolas" || curso.instrutor === "Henrique" ? curso.instrutor : "";
          return getCourseInstructor(curso.tipo_curso, assignedBooking?.instructor || storedInstructor);
        })(),
        tipo_curso: canonicalizeCourseName(curso.tipo_curso),
      }));
    },
  });
  const data = useMemo(() => (query.data || []).map((curso) => {
    const disparo = isDisparoCourseSale(sales, curso.nome_aluno, curso.tipo_curso, curso.data);
    const base = Number(curso.comissao_extra || 0);
    return {
      ...curso,
      comissao_extra_base: base,
      origem_disparo: disparo,
      comissao_extra: disparo ? +(base / 2).toFixed(2) : base,
    };
  }), [query.data, sales]);
  return { ...query, data, isLoading: query.isLoading || salesLoading };
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
