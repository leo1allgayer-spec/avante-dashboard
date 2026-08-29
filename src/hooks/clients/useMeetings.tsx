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
  const [syncing, setSyncing] = useState(false);

  const fetchMeetings = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("meetings" as any)
      .select("*")
      .order("date", { ascending: true });

    let localMeetings: Meeting[] = [];
    if (error) {
      toast.error("Erro ao carregar reuniões");
    } else {
      localMeetings = (data as any[]).map((r) => ({
          id: r.id,
          title: r.title,
          date: r.date,
          time: r.time || "",
          participants: r.participants || [],
          description: r.description || "",
          status: r.status || "pending",
          outcome: r.outcome || null,
          origin: r.origin || "",
          service: r.service || "",
          modality: r.modality || "presencial",
          hasClosed: r.has_closing || false,
          source: "local",
          externalId: r.external_id || undefined,
        }));
    }

    setSyncing(true);
    const today = new Date();
    const since = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().slice(0, 10);
    const until = new Date(today.getFullYear(), today.getMonth() + 7, 0).toISOString().slice(0, 10);
    const { data: crmData, error: crmError } = await supabase.functions.invoke("crm-agenda", {
      body: { since, until },
    });
    if (crmError || crmData?.error) {
      console.warn("Agenda do CRM indisponível:", crmError || crmData?.error);
      setMeetings(localMeetings);
    } else {
      const crmMeetings = Array.isArray(crmData?.appointments) ? crmData.appointments as Meeting[] : [];
      const localExternalIds = new Set(localMeetings.map((meeting) => meeting.externalId).filter(Boolean));
      setMeetings([...localMeetings, ...crmMeetings.filter((meeting) => !localExternalIds.has(meeting.externalId))]);
    }
    setSyncing(false);
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
    setSyncing(true);
    const { hasClosed, source: _source, externalId: _externalId, ...rest } = meeting;
    const { data: localData, error: localError } = await supabase
      .from("meetings" as any)
      .insert({ ...rest, has_closing: hasClosed, user_id: session.user.id } as any)
      .select()
      .single();

    if (localError || !localData) {
      setSyncing(false);
      toast.error("Não foi possível registrar a reunião no dashboard");
      return;
    }

    const { data: crmData, error: crmError } = await supabase.functions.invoke("crm-agenda", {
      body: { action: "create", meeting },
    });
    if (!crmError && !crmData?.error) {
      const appointment = crmData?.appointment || {};
      const crmId = String(appointment?.id || appointment?.data?.id || appointment?.appointment?.id || "");
      if (crmId) {
        await supabase.from("meetings" as any).update({ external_id: crmId } as any).eq("id", (localData as any).id);
      }
      toast.success("Reunião registrada no dashboard e no CRM!");
    } else {
      toast.warning("Reunião salva no dashboard, mas o CRM não confirmou a sincronização");
    }
    await fetchMeetings();
    setSyncing(false);
  };
  const updateMeeting = async (meeting: Meeting) => {
    if (meeting.source === "crm") {
      setSyncing(true);
      const { data, error } = await supabase.functions.invoke("crm-agenda", {
        body: { action: "update", meeting },
      });
      setSyncing(false);
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Erro ao atualizar reunião no CRM");
      } else {
        toast.success("Reunião atualizada no CRM!");
        await fetchMeetings();
      }
      return;
    }
    const { id, hasClosed, source: _source, externalId: _externalId, ...rest } = meeting;
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
    if (id.startsWith("crm:")) {
      toast.info("Compromissos do CRM devem ser cancelados diretamente no CRM.");
      return;
    }
    const { error } = await supabase.from("meetings" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir reunião");
    } else {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      toast.success("Reunião excluída!");
    }
  };

  return { meetings, loading, syncing, refreshMeetings: fetchMeetings, addMeeting, updateMeeting, deleteMeeting };
}
