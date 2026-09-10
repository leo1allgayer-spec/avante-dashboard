import { useCallback, useEffect, useState } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { useAuth } from "./useGestaoAuth";
import { AgendaBlock } from "@/types/clients/task";
import { toast } from "sonner";

export function useAgendaBlocks() {
  const { session } = useAuth();
  const [blocks, setBlocks] = useState<AgendaBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlocks = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    const { data, error } = await supabase.from("agenda_blocks" as any).select("*").order("start_date");
    if (error) toast.error("N�o foi poss�vel carregar os bloqueios da agenda");
    else setBlocks(((data || []) as any[]).map((row) => ({
      id: row.id,
      agendaCategory: row.agenda_category,
      startDate: row.start_date,
      endDate: row.end_date,
      startTime: row.start_time?.slice(0, 5) || "",
      endTime: row.end_time?.slice(0, 5) || "",
      allDay: row.all_day,
      responsible: row.responsible,
      reason: row.reason || "",
      ownerId: row.user_id,
    })));
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { void fetchBlocks(); }, [fetchBlocks]);
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase.channel("agenda-blocks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agenda_blocks" }, () => void fetchBlocks())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [session?.user?.id, fetchBlocks]);

  const addBlock = async (block: Omit<AgendaBlock, "id" | "ownerId">) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from("agenda_blocks" as any).insert({
      agenda_category: block.agendaCategory,
      start_date: block.startDate,
      end_date: block.endDate,
      start_time: block.allDay ? null : block.startTime,
      end_time: block.allDay ? null : block.endTime,
      all_day: block.allDay,
      responsible: block.responsible,
      reason: block.reason,
      user_id: session.user.id,
    } as any);
    if (error) toast.error("N�o foi poss�vel bloquear a agenda");
    else { toast.success("Agenda bloqueada"); await fetchBlocks(); }
  };

  const deleteBlock = async (id: string) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from("agenda_blocks" as any).delete().eq("id", id).eq("user_id", session.user.id);
    if (error) toast.error("N�o foi poss�vel remover o bloqueio");
    else { toast.success("Bloqueio removido"); await fetchBlocks(); }
  };

  return { blocks, loading, currentUserId: session?.user?.id || "", addBlock, deleteBlock };
}
