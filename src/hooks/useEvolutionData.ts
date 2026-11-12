import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseClients } from "@/integrations/supabase/clientsClient";
import { useVendas } from "@/hooks/useVendas";
import { useFechamentosDiarios } from "@/hooks/useFechamentosDiarios";
import { usePagamentosVariaveis } from "@/hooks/usePagamentosVariaveis";
import { useCrmMql } from "@/hooks/useCrmMql";
import type { DailyMetrics } from "@/hooks/useMetrics";
import type { MetaAdsData } from "@/hooks/useMetaAds";
import { inRange, previousRange, type DateRange, type EvolutionClient } from "@/lib/evolutionMetrics";

type AgendaRow = { id: string; external_id?: string; date: string; agenda_category: string; meeting_type: string; status: string };
type RemoteRow = { id: string; externalId?: string; date: string; agendaCategory: string; meetingType: string; status: string };
export function useEvolutionData(range: DateRange) {
  const previous = previousRange(range);
  const since = previous.start, until = range.end;
  const sales = useVendas();
  const closings = useFechamentosDiarios();
  const payments = usePagamentosVariaveis();
  const crm = useCrmMql(since, until);
  const metrics = useQuery({ queryKey: ["daily-metrics", "evolution", since, until], staleTime: 60_000, queryFn: async () => {
    const { data, error } = await supabase.from("daily_metrics").select("*").gte("date", `${since.slice(0,7)}-01`).lte("date", until);
    if (error) throw error;
    return data as DailyMetrics[];
  }});
  const clients = useQuery({ queryKey: ["evolution-clients"], staleTime: 60_000, queryFn: async () => {
    const { data, error } = await supabase.from("gestao_clients" as never).select("id,status,start_date,contract_value,payment_status,notes");
    if (error) throw error;
    return data as unknown as EvolutionClient[];
  }});
  const meta = useQuery({ queryKey: ["evolution-meta", since, until], staleTime: 120_000, retry: 1, queryFn: async () => {
    const { data, error } = await supabase.functions.invoke("meta-ads", { body: { datePreset: "custom", since, until } });
    if (error || data?.error) throw new Error("Anúncios indisponíveis");
    return data as MetaAdsData;
  }});
  const agenda = useQuery({ queryKey: ["evolution-agenda", since, until], staleTime: 60_000, retry: 1, queryFn: async () => {
    const [local, remote, deleted] = await Promise.all([
      supabaseClients.from("meetings").select("id,external_id,date,agenda_category,meeting_type,status"),
      supabase.functions.invoke("crm-agenda", { body: { since, until } }),
      supabase.from("deleted_crm_meetings" as never).select("external_id"),
    ]);
    if (local.error || remote.error || remote.data?.error || deleted.error) throw new Error("Agenda indisponível");
    const locals = (local.data || []) as unknown as AgendaRow[];
    const linked = new Set(locals.map(row => row.external_id).filter(Boolean));
    const hidden = new Set(((deleted.data || []) as unknown as { external_id: string }[]).map(row => row.external_id));
    const rows = [...locals, ...((remote.data?.appointments || []) as RemoteRow[])
      .filter(row => !linked.has(row.externalId) && !hidden.has(row.externalId || ""))
      .map(row => ({ id: row.id, external_id: row.externalId, date: row.date, agenda_category: row.agendaCategory, meeting_type: row.meetingType, status: row.status }))];
    return [...new Map(rows.filter(row => row.agenda_category === "reunioes" && (row.meeting_type === "reuniao_vendas" || Boolean(row.external_id) && ["reuniao", "call", "comercial"].includes(row.meeting_type))).map(row => [row.external_id || row.id, row])).values()];
  }});
  const meetingCounts = (r: DateRange) => {
    if (!agenda.data) return { scheduled: null, held: null };
    const rows = agenda.data.filter(row => inRange(row.date, r));
    return { scheduled: rows.length, held: rows.filter(row => row.status === "completed").length };
  };
  const investment = (r: DateRange) => {
    if (meta.data) return meta.data.dailyInsights.filter(row => inRange(row.date_start, r)).reduce((sum, row) => sum + Number(row.spend || 0) * 1.1225, 0);
    // Manual entries do not establish coverage for all days; never imply a full period total.
    return null;
  };
  const leads = (r: DateRange) => crm.data?.leadsComplete && crm.data.leadsDaily
    ? Object.entries(crm.data.leadsDaily).filter(([date]) => inRange(date, r)).reduce((sum, [,count]) => sum + count, 0) : null;
  return { sales, closings, payments, clients, metrics, meta, crm, agenda, previous, meetingCounts, investment, leads };
}
