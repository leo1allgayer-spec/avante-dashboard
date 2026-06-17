import { useState, useCallback, useEffect } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { toast } from "sonner";

export interface BlockedDate {
  id: string;
  date: string;
  courseName: string | null; // null = all courses
  shift: string | null; // null = both shifts
}

function rowToBlocked(r: any): BlockedDate {
  return {
    id: r.id,
    date: r.date,
    courseName: r.course_name,
    shift: r.shift,
  };
}

export function useBlockedDates() {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("course_blocked_dates")
      .select("*")
      .order("date", { ascending: true });
    if (error) toast.error("Erro ao carregar bloqueios");
    else setBlockedDates((data || []).map(rowToBlocked));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const blockDate = async (date: string, courseName: string | null, shift: string | null) => {
    const { data, error } = await supabase
      .from("course_blocked_dates")
      .insert({ date, course_name: courseName, shift })
      .select()
      .single();
    if (error) { toast.error("Erro ao bloquear data"); return; }
    setBlockedDates(prev => [...prev, rowToBlocked(data)]);
    toast.success("Data bloqueada");
  };

  const unblockDate = async (id: string) => {
    const { error } = await supabase.from("course_blocked_dates").delete().eq("id", id);
    if (error) { toast.error("Erro ao desbloquear data"); return; }
    setBlockedDates(prev => prev.filter(x => x.id !== id));
    toast.success("Data desbloqueada");
  };

  const isDateBlocked = (date: string, courseName: string, shift?: string): boolean => {
    return blockedDates.some(b => {
      if (b.date !== date) return false;
      if (b.courseName !== null && b.courseName !== courseName) return false;
      if (shift && b.shift !== null && b.shift !== shift) return false;
      return true;
    });
  };

  const getBlocksForDate = (date: string, courseName?: string): BlockedDate[] => {
    return blockedDates.filter(b => {
      if (b.date !== date) return false;
      if (courseName && b.courseName !== null && b.courseName !== courseName) return false;
      return true;
    });
  };

  return { blockedDates, loading, blockDate, unblockDate, isDateBlocked, getBlocksForDate, refetch: fetch };
}
