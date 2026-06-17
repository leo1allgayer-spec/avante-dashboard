import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DisabledDay {
  id: string;
  courseName: string;
  dayOfWeek: number; // 0=Dom, 1=Seg, ..., 6=Sáb
  shift: string | null; // null = both shifts disabled
}

export const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function useDisabledDays() {
  const [disabledDays, setDisabledDays] = useState<DisabledDay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("course_disabled_days").select("*");
    if (error) toast.error("Erro ao carregar dias desativados");
    else setDisabledDays((data || []).map((r: any) => ({
      id: r.id,
      courseName: r.course_name,
      dayOfWeek: r.day_of_week,
      shift: r.shift ?? null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleDay = async (courseName: string, dayOfWeek: number, shift?: string | null) => {
    // If shift is undefined, toggle the whole day (legacy behavior)
    const targetShift = shift === undefined ? null : shift;
    
    const existing = disabledDays.find(d =>
      d.courseName === courseName &&
      d.dayOfWeek === dayOfWeek &&
      d.shift === targetShift
    );

    if (existing) {
      const { error } = await supabase.from("course_disabled_days").delete().eq("id", existing.id);
      if (error) { toast.error("Erro ao ativar"); return; }
      setDisabledDays(prev => prev.filter(d => d.id !== existing.id));
    } else {
      const insertData: any = { course_name: courseName, day_of_week: dayOfWeek };
      if (targetShift !== null) insertData.shift = targetShift;
      const { data, error } = await supabase
        .from("course_disabled_days")
        .insert(insertData)
        .select().single();
      if (error) { toast.error("Erro ao desativar"); return; }
      setDisabledDays(prev => [...prev, {
        id: data.id,
        courseName: data.course_name,
        dayOfWeek: data.day_of_week,
        shift: data.shift ?? null,
      }]);
    }
  };

  /** Check if a specific shift on a day is disabled */
  const isShiftDisabled = (courseName: string, dayOfWeek: number, shift: string): boolean => {
    return disabledDays.some(d =>
      d.courseName === courseName &&
      d.dayOfWeek === dayOfWeek &&
      (d.shift === null || d.shift === shift)
    );
  };

  /** Check if entire day is disabled (both shifts) */
  const isDayDisabled = (courseName: string, dayOfWeek: number): boolean => {
    return disabledDays.some(d =>
      d.courseName === courseName &&
      d.dayOfWeek === dayOfWeek &&
      d.shift === null
    );
  };

  /** Check if a specific shift-only entry exists */
  const isShiftOnlyDisabled = (courseName: string, dayOfWeek: number, shift: string): boolean => {
    return disabledDays.some(d =>
      d.courseName === courseName &&
      d.dayOfWeek === dayOfWeek &&
      d.shift === shift
    );
  };

  return { disabledDays, loading, toggleDay, isDayDisabled, isShiftDisabled, isShiftOnlyDisabled, refetch: fetchAll };
}
