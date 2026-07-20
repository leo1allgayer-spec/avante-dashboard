import { useState, useEffect, useCallback } from "react";
// Realtime enabled
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { useAuth } from "./useGestaoAuth";
import { Meeting } from "@/types/clients/task";
import { toast } from "sonner";

export function useMeetings() {
  const { session } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("meetings" as any)
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar reuniões");
    } else {
      setMeetings(
        (data as any[]).map((r) => ({
          id: r.id,
          title: r.title,
          date: r.date,
          time: r.time || "",
          participants: r.participants || [],
          description: r.description || "",
          status: r.status || "pending",
          outcome: r.outcome || null,
          origin: r.origin || "",
          modality: r.modality || "presencial",
          hasClosed: r.has_closing || false,
        }))
      );
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel("meetings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => fetchMeetings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, fetchMeetings]);

  const addMeeting = async (meeting: Omit<Meeting, "id">) => {
    if (!session?.user?.id) return;
    const { hasClosed, ...rest } = meeting;
    const { data, error } = await supabase
      .from("meetings" as any)
      .insert({ ...rest, has_closing: hasClosed, user_id: session.user.id } as any)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar reunião");
    } else {
      const r = data as any;
      setMeetings((prev) => [
        ...prev,
        { id: r.id, title: r.title, date: r.date, time: r.time || "", participants: r.participants || [], description: r.description || "", status: r.status || "pending", outcome: r.outcome || null, origin: r.origin || "", modality: r.modality || "presencial", hasClosed: r.has_closing || false },
      ]);
      toast.success("Reunião agendada!");
    }
  };

  const updateMeeting = async (meeting: Meeting) => {
    const { id, hasClosed, ...rest } = meeting;
    const { error } = await supabase
      .from("meetings" as any)
      .update({ ...rest, has_closing: hasClosed } as any)
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar reunião");
    } else {
      setMeetings((prev) => prev.map((m) => (m.id === id ? meeting : m)));
    }
  };

  const deleteMeeting = async (id: string) => {
    const { error } = await supabase.from("meetings" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir reunião");
    } else {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      toast.success("Reunião excluída!");
    }
  };

  return { meetings, loading, addMeeting, updateMeeting, deleteMeeting };
}
