import { useMemo } from "react";
import { useMetaAds } from "@/hooks/useMetaAds";
import { useCrmMql } from "@/hooks/useCrmMql";
import SalesFunnel from "./SalesFunnel";

type Action = { action_type: string; value: string };
const firstAction = (actions: Action[], types: string[]) => {
  for (const type of types) {
    const action = actions.find((item) => item.action_type.toLowerCase() === type);
    if (action) return Number(action.value || 0);
  }
  return 0;
};

export default function MeetingSalesFunnel({ since, until, investment }: { since: string; until: string; investment: number | null }) {
  const filters = useMemo(() => ({ datePreset: "custom" as const, since, until }), [since, until]);
  const meta = useMetaAds(filters);
  const mql = useCrmMql(since, until);
  // Mesma base de leads e conversas utilizada pela Visão Geral.
  const rows = meta.data?.campaignInsights?.length ? meta.data.campaignInsights : meta.data?.dailyInsights || [];
  const leads = meta.data ? rows.reduce((total, row) => {
    const actions = row.actions || [];
    const received = firstAction(actions, ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "offsite_complete_registration_add_meta_leads", "offsite_content_view_add_meta_leads"]);
    const preferred = firstAction(actions, ["onsite_conversion.messaging_conversation_started_7d", "onsite_conversion.total_messaging_connection", "onsite_conversion.messaging_first_reply"]);
    const conversations = preferred > 0 ? preferred : actions.reduce((sum, action) => {
      const type = action.action_type.toLowerCase();
      return type.includes("conversation_started") || type.includes("whatsapp") ? sum + Number(action.value || 0) : sum;
    }, 0);
    return total + received + conversations;
  }, 0) : null;
  return <>
    {(meta.isError || mql.isError) && <p role="alert" className="text-xs text-amber-500">Não foi possível atualizar todos os dados de leads e MQL do funil.</p>}
    <SalesFunnel since={since} until={until} investment={investment} leads={leads} mql={mql.data?.total ?? null} />
  </>;
}
