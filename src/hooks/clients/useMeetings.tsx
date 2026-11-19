import { shouldSyncMeetingToCrm } from "@/lib/meetingCrmSync";
import { useState, useEffect, useCallback, useRef } from "react";
// Realtime enabled
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { useAuth } from "./useGestaoAuth";
import { Meeting } from "@/types/clients/task";
import { toast } from "sonner";
import { captureDates } from "@/lib/captureRecurrence";
import { reconcileCrmMeetings } from "@/lib/reconcileCrmMeetings";
import { crmMeetingAgenda, localMeetingAgenda } from "@/lib/crmMeetingAgenda";
import { isMeetingClosingOnlyUpdate } from '@/lib/meetingClosingUpdate';

export function useMeetings() {
  const { session } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const globalSyncChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fetchVersion = useRef(0);
  const notifyOtherAccounts = () => globalSyncChannel.current?.send({ type: "broadcast", event: "refresh", payload: {} });

  const fetchMeetings = useCallback(async () => {
    const version = ++fetchVersion.current;
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
          recurrence: r.recurrence || undefined,
          agendaCategory: r.external_id ? crmMeetingAgenda(r.responsible, r.meeting_type) : localMeetingAgenda(r.agenda_category || "reunioes", r.responsible, r.meeting_type),
          title: r.title,
          meetingType: r.meeting_type || "reuniao",
          clientName: r.client_name || r.title || "",
          clientPhone: r.client_phone || "",
          notifyClient: r.notify_client !== false,
          date: r.date,
          time: r.time || "",
          durationMinutes: Number(r.duration_minutes || 60),
          responsible: r.responsible || "",
          professional: r.professional || "",
          participants: r.participants || [],
          description: r.description || "",
          status: r.status || "pending",
          outcome: r.outcome || null,
          origin: r.origin || "",
          service: r.service || "",
          modality: r.modality || "presencial",
          hasClosed: r.has_closing || r.closing_status === "closed" || false,
          closingStatus: r.closing_status || (r.has_closing ? "closed" : "pending"),
          objection: r.objection || "",
          source: "local",
          externalId: r.external_id || undefined,
        }));
    }

    if (version !== fetchVersion.current) return;
    // Keep the reconciled list visible while CRM refreshes instead of restoring stale local copies.
    if (!error) setLoading(false);
    setSyncing(true);
    const today = new Date();
    const since = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().slice(0, 10);
    const until = new Date(today.getFullYear(), today.getMonth() + 7, 0).toISOString().slice(0, 10);
    const [{ data: crmData, error: crmError }, { data: deletedRows }] = await Promise.all([
      supabase.functions.invoke("crm-agenda", { body: { since, until } }),
      supabase.from("deleted_crm_meetings" as any).select("external_id"),
    ]);
    if (version !== fetchVersion.current) return;
    const deletedExternalIds = new Set(((deletedRows || []) as Array<{ external_id: string }>).map((row) => row.external_id));
    if (crmError || crmData?.error) {
      console.warn("Agenda do CRM indisponível:", crmError || crmData?.error);
      setMeetings(localMeetings.filter(meeting => !meeting.externalId || !deletedExternalIds.has(meeting.externalId)));
    } else {
      const crmMeetings = Array.isArray(crmData?.appointments)
        ? (crmData.appointments as Meeting[]).map((meeting) => ({
            ...meeting,
            agendaCategory: crmMeetingAgenda(meeting.responsible, meeting.meetingType),
          }))
        : [];
      const reconciled = reconcileCrmMeetings(localMeetings, crmMeetings, deletedExternalIds, since, until, crmData?.complete === true);
      setMeetings(reconciled);
      const cancelledIds = reconciled.filter(meeting => meeting.source === 'local' && meeting.status === 'cancelled' && localMeetings.some(original => original.id === meeting.id && original.status !== 'cancelled')).map(meeting => meeting.id);
      if (cancelledIds.length) {
        const { error: cancellationError } = await supabase.from('meetings' as any).update({ status: 'cancelled' } as any).in('id', cancelledIds);
        if (cancellationError) console.warn('Não foi possível atualizar as cópias locais canceladas:', cancellationError);
      }
    }
    setSyncing(false);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const timer = window.setInterval(() => fetchMeetings(), 10 * 60_000);
    return () => window.clearInterval(timer);
  }, [session?.user?.id, fetchMeetings]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel("meetings-global-sync")
      .on("broadcast", { event: "refresh" }, () => fetchMeetings())
      .subscribe();
    globalSyncChannel.current = channel;
    return () => {
      globalSyncChannel.current = null;
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, fetchMeetings]);
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel("meetings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => fetchMeetings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, fetchMeetings]);

  const addMeeting = async (meeting: Omit<Meeting, "id">) => {
    meeting = { ...meeting, agendaCategory: meeting.externalId ? crmMeetingAgenda(meeting.responsible, meeting.meetingType) : localMeetingAgenda(meeting.agendaCategory || "reunioes", meeting.responsible, meeting.meetingType) };
    if (!session?.user?.id) throw new Error("Sessão expirada. Entre novamente para agendar.");
    const dates = captureDates(meeting.date, meeting.recurrence);
    setSyncing(true);
    const { hasClosed } = meeting;
    const localPayload = {
      title: meeting.title,
      agenda_category: meeting.agendaCategory || "reunioes",
      meeting_type: meeting.meetingType || "reuniao",
      client_name: meeting.clientName || meeting.title,
      client_phone: meeting.clientPhone?.trim() || null,
      notify_client: meeting.notifyClient !== false,
      date: meeting.date,
      time: meeting.time,
      duration_minutes: meeting.durationMinutes || 60,
      responsible: meeting.responsible || "",
      professional: meeting.professional || "",
      participants: meeting.participants,
      description: meeting.description,
      status: meeting.status,
      outcome: meeting.outcome,
      origin: meeting.origin,
      service: meeting.service,
      modality: meeting.modality,
      has_closing: hasClosed,
      closing_status: meeting.closingStatus || (hasClosed ? "closed" : "pending"),
      objection: meeting.objection || "",
      user_id: session.user.id,
    };
    if (meeting.recurrence && meeting.agendaCategory === "captacao") {
      try {
        const recurrence = { ...meeting.recurrence, seriesId: crypto.randomUUID() };
        const { data, error } = await supabase.from("meetings" as any)
          .insert(dates.map(date => ({ ...localPayload, date, recurrence })) as any).select();
        if (error) throw error;
        setMeetings(current => [...current, ...(data as any[]).map(row => ({ ...meeting, id: row.id, date: row.date, recurrence, source: "local" as const }))]);
        void notifyOtherAccounts();
        toast.success(`${dates.length} captação(ões) agendada(s)!`);
        return;
      } finally { setSyncing(false); }
    }
    const { data: localData, error: localError } = await supabase
      .from("meetings" as any)
      .insert(localPayload as any)
      .select()
      .single();

    if (localError || !localData) {
      setSyncing(false);
      toast.error("Não foi possível registrar a reunião no dashboard");
      throw new Error(localError?.message || "Não foi possível salvar a reunião.");
    }

    setMeetings(current => [...current.filter(item => item.id !== (localData as any).id), { ...meeting, id: (localData as any).id, source: "local" }]);
    if (!shouldSyncMeetingToCrm(meeting)) {
      toast.success("Agendamento salvo apenas no dashboard");
      void notifyOtherAccounts();
      setSyncing(false);
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
      void notifyOtherAccounts();
    } else {
      toast.warning("Reunião salva no dashboard, mas o CRM não confirmou a sincronização");
    }
    await fetchMeetings();
    setSyncing(false);
  };
  const updateMeeting = async (meeting: Meeting) => {
    meeting = { ...meeting, agendaCategory: meeting.externalId ? crmMeetingAgenda(meeting.responsible, meeting.meetingType) : localMeetingAgenda(meeting.agendaCategory || "reunioes", meeting.responsible, meeting.meetingType) };
    if (isMeetingClosingOnlyUpdate(meetings.find(item=>item.id===meeting.id),meeting)) {
      ++fetchVersion.current;
      const {data,error}=await supabase.functions.invoke('crm-agenda',{body:{action:'set_closing',meetingId:meeting.id,externalId:meeting.externalId,closingStatus:meeting.closingStatus||(meeting.hasClosed?'closed':'pending'),objection:meeting.objection||''}});
      if(error||data?.error||!data?.meeting)throw new Error(data?.error||error?.message||'O servidor não confirmou o fechamento.');
      const saved=data.meeting;
      setMeetings(current=>current.map(item=>item.id===meeting.id?{...item,id:saved.id,source:'local',closingStatus:saved.closing_status,hasClosed:saved.has_closing,objection:saved.objection}:item));
      toast.success('Fechamento salvo!');
      void notifyOtherAccounts();
      await fetchMeetings();
      return;
    }
    if (meeting.source === "crm") {
      setSyncing(true);
      const { data, error } = await supabase.functions.invoke("crm-agenda", {
        body: { action: "update", meeting },
      });
      setSyncing(false);
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Erro ao atualizar reunião no CRM");
        throw new Error(data?.error || error?.message || 'O CRM não confirmou a atualização');
      } else {
        const externalId = meeting.externalId;
        if (!externalId || !session?.user?.id) throw new Error("Não foi possível vincular o lembrete à reunião.");
        const existing = await supabase.from("meetings" as any).select("id,user_id").eq("external_id", externalId).maybeSingle();
        if (existing.error) throw existing.error;
        const notificationRow = {
          user_id: (existing.data as any)?.user_id || session.user.id, external_id: externalId,
          title: meeting.title, agenda_category: meeting.agendaCategory || "reunioes",
          meeting_type: meeting.meetingType || "reuniao", client_name: meeting.clientName || meeting.title,
          client_phone: meeting.clientPhone?.trim() || null, notify_client: meeting.notifyClient !== false,
          date: meeting.date, time: meeting.time, duration_minutes: meeting.durationMinutes || 60,
          responsible: meeting.responsible || "", professional: meeting.professional || "",
          participants: meeting.participants, description: meeting.description, status: meeting.status,
          outcome: meeting.outcome, origin: meeting.origin, service: meeting.service, modality: meeting.modality,
          has_closing: meeting.hasClosed, closing_status: meeting.closingStatus || "pending", objection: meeting.objection || "",
        };
        const saved = existing.data
          ? await supabase.from("meetings" as any).update(notificationRow).eq("id", (existing.data as any).id).select("id").maybeSingle()
          : await supabase.from("meetings" as any).insert(notificationRow);
        if (saved.error) throw new Error("CRM atualizado, mas o lembrete não foi salvo: " + saved.error.message);
        if (existing.data && !saved.data) throw new Error("CRM atualizado, mas o lembrete não foi salvo: sua conta não tem permissão para editar esta cópia da reunião.");
        toast.success("Reunião e lembrete atualizados!");
        void notifyOtherAccounts();
        await fetchMeetings();
      }
      return;
    }
    const { id, hasClosed } = meeting;
    const { data: updatedMeeting, error } = await supabase
      .from("meetings" as any)
      .update({
        title: meeting.title,
        agenda_category: meeting.agendaCategory || "reunioes",
        meeting_type: meeting.meetingType || "reuniao",
        client_name: meeting.clientName || meeting.title,
      client_phone: meeting.clientPhone?.trim() || null,
      notify_client: meeting.notifyClient !== false,
        date: meeting.date,
        time: meeting.time,
        duration_minutes: meeting.durationMinutes || 60,
        responsible: meeting.responsible || "",
        professional: meeting.professional || "",
        participants: meeting.participants,
        description: meeting.description,
        status: meeting.status,
        outcome: meeting.outcome,
        origin: meeting.origin,
        service: meeting.service,
        modality: meeting.modality,
        has_closing: hasClosed,
        closing_status: meeting.closingStatus || (hasClosed ? "closed" : "pending"),
        objection: meeting.objection || "",
      } as any)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(`Não foi possível salvar a reunião: ${error.message}`);
    } else if (!updatedMeeting) {
      throw new Error("A reunião não foi alterada. Verifique se sua conta tem permissão para editar reuniões criadas por outra pessoa.");
    } else {
      setMeetings((prev) => prev.map((m) => (m.id === id ? meeting : m)));
      if (meeting.externalId && (meeting.origin === 'CRM' || shouldSyncMeetingToCrm(meeting))) {
        const { data: crmData, error: crmError } = await supabase.functions.invoke("crm-agenda", {
          body: { action: "update", meeting },
        });
        if (crmError || crmData?.error) {
          await fetchMeetings();
          throw new Error(crmData?.error || crmError?.message || 'O CRM não confirmou a atualização');
        } else {
          await fetchMeetings();
          toast.success("Reunião atualizada no dashboard e no CRM!");
          void notifyOtherAccounts();
        }
      }
    }
  };

  const deleteMeeting = async (id: string) => {
    const meeting = meetings.find((item) => item.id === id);
    if (!meeting) return;
    if (!window.confirm(`Excluir a reunião “${meeting.title}”? Esta ação também será aplicada no CRM.`)) return;

    setSyncing(true);
    const externalId = meeting.externalId || (id.startsWith("crm:") ? id.replace(/^crm:/, "") : "");
    ++fetchVersion.current;
    if (externalId) {
      const { data: crmData, error: crmError } = await supabase.functions.invoke("crm-agenda", {
        body: { action: "delete", meeting: { ...meeting, externalId } },
      });
      if (crmError || crmData?.error) {
        setSyncing(false);
        toast.error(crmData?.error || crmError?.message || "O CRM não confirmou a exclusão da reunião");
        return;
      }
    }

    if (externalId) {
      const { error: tombstoneError } = await supabase
        .from("deleted_crm_meetings" as any)
        .upsert({ external_id: externalId, deleted_by: session?.user?.id || null } as any, { onConflict: "external_id" });
      if (tombstoneError) {
        setSyncing(false);
        toast.error("O CRM confirmou a exclusão, mas não foi possível impedir a ressincronização");
        return;
      }
    }
    if (externalId || !id.startsWith("crm:")) {
      const deletion = supabase.from("meetings" as any).delete();
      const { error } = await (externalId ? deletion.eq("external_id", externalId) : deletion.eq("id", id));
      if (error) {
        setSyncing(false);
        toast.error("Reunião excluída no CRM, mas não foi removida do dashboard");
        return;
      }
    }

    setMeetings((prev) => prev.filter((item) => item.id !== id && (!externalId || item.externalId !== externalId)));
    void notifyOtherAccounts();
    setSyncing(false);
    toast.success(externalId ? "Reunião excluída do dashboard e do CRM!" : "Reunião excluída!");
    await fetchMeetings();
  };

  return { meetings, loading, syncing, refreshMeetings: fetchMeetings, addMeeting, updateMeeting, deleteMeeting };
}
