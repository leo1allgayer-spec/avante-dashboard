import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface MetaInsights {
  spend: string;
  impressions: string;
  clicks: string;
  cpc: string;
  cpm: string;
  ctr: string;
  reach: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
}

export interface MetaDailyInsight {
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  cpc: string;
  ctr: string;
  reach: string;
  actions?: Array<{ action_type: string; value: string }>;
}

export interface MetaCampaignInsight {
  campaign_name: string;
  campaign_id: string;
  spend: string;
  impressions: string;
  clicks: string;
  cpc: string;
  ctr: string;
  reach: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
}

export interface MetaAdsData {
  campaigns: MetaCampaign[];
  accountInsights: MetaInsights | null;
  dailyInsights: MetaDailyInsight[];
  campaignInsights: MetaCampaignInsight[];
}

export interface MetaAdsFilters {
  datePreset: "today" | "yesterday" | "last_7d" | "last_30d" | "this_month" | "custom";
  since?: string;
  until?: string;
}

export interface MetaAdCreative {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  campaignName: string;
}

export function useMetaAds(filters: MetaAdsFilters = { datePreset: "this_month" }) {
  return useQuery<MetaAdsData>({
    queryKey: ["meta-ads", filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: filters,
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as MetaAdsData;
    },
    retry: false,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
    staleTime: 2 * 60 * 1000,
  });
}

export function useMetaAdCreatives() {
  return useQuery<MetaAdCreative[]>({
    queryKey: ["meta-ad-creatives"],
    queryFn: async () => {
      const { data: metaData, error: metaError } = await supabase.functions.invoke("meta-ads", {
        body: { datePreset: "this_month" },
      });
      if (metaError) throw metaError;
      if (metaData?.error) throw new Error(metaData.error);

      const campaigns = (metaData?.campaigns || []) as MetaCampaign[];
      const results = await Promise.allSettled(campaigns.map(async (campaign) => {
        const { data, error } = await supabase.functions.invoke("meta-ads-action", {
          body: { action: "get_campaign_details", campaignId: campaign.id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return ((data?.ads || []) as Array<Record<string, unknown>>).map((ad) => ({
          id: String(ad.id || ""),
          name: String(ad.name || "Anúncio sem nome"),
          status: String(ad.status || "UNKNOWN"),
          campaignId: campaign.id,
          campaignName: campaign.name,
        }));
      }));

      const creatives = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
      return [...new Map(creatives.filter((creative) => creative.id).map((creative) => [creative.id, creative])).values()]
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
