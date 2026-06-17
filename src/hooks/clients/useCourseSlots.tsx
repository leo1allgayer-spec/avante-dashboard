import { useState, useCallback, useEffect } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { toast } from "sonner";

export interface CourseSlot {
  id: string;
  courseName: string;
  date: string;
  time: string;
  maxStudents: number;
}

function rowToSlot(r: any): CourseSlot {
  return {
    id: r.id,
    courseName: r.course_name,
    date: r.date,
    time: r.time,
    maxStudents: r.max_students,
  };
}

export function useCourseSlots(courseName?: string) {
  const [slots, setSlots] = useState<CourseSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("course_slots").select("*").order("date", { ascending: true }).order("time", { ascending: true });
    if (courseName) query = query.eq("course_name", courseName);
    const { data, error } = await query;
    if (error) toast.error("Erro ao carregar horários");
    else setSlots((data || []).map(rowToSlot));
    setLoading(false);
  }, [courseName]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const addSlot = async (s: Omit<CourseSlot, "id">) => {
    const { data, error } = await supabase
      .from("course_slots")
      .insert({ course_name: s.courseName, date: s.date, time: s.time, max_students: s.maxStudents })
      .select().single();
    if (error) { toast.error("Erro ao criar horário"); return; }
    setSlots(prev => [...prev, rowToSlot(data)]);
    toast.success("Horário criado");
  };

  const updateSlot = async (s: CourseSlot) => {
    const { error } = await supabase.from("course_slots")
      .update({ course_name: s.courseName, date: s.date, time: s.time, max_students: s.maxStudents })
      .eq("id", s.id);
    if (error) { toast.error("Erro ao atualizar horário"); return; }
    setSlots(prev => prev.map(x => x.id === s.id ? s : x));
    toast.success("Horário atualizado");
  };

  const deleteSlot = async (id: string) => {
    const { error } = await supabase.from("course_slots").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir horário"); return; }
    setSlots(prev => prev.filter(x => x.id !== id));
    toast.success("Horário excluído");
  };

  return { slots, loading, addSlot, updateSlot, deleteSlot, refetch: fetchSlots };
}
