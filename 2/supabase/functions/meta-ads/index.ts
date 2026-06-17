import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API_BASE = "https://graph.facebook.com/v21.0";

const sanitizeSecret = (value: string | undefined, stripBearer = false) => {
  if (!value) return "";
  let cleaned = value.trim().replace(/^['"]|['"]$/g, "");
  if (stripBearer) cleaned = cleaned.replace(/^Bearer\s+/i, "");
  return cleaned.trim();
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fetchMeta = async (path: string, params: Record<string, string>) => {
  const url = new URL(`${META_API_BASE}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString());
  const payload = await response.json();

  if (!response.ok || payload?.error) {
    const metaError = payload?.error;
    const message = metaError?.message || `HTTP ${response.status}`;
    const isTokenError = metaError?.code === 190;

    if (isTokenError) {
      throw new Error("Meta API error: Invalid OAuth access token. Update META_ACCESS_TOKEN in project secrets.");
    }

    throw new Error(`Meta API error: ${message}`);
  }

  return payload;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawToken = Deno.env.get("META_ACCESS_TOKEN");
    console.log("META_ACCESS_TOKEN raw length:", rawToken?.length ?? "undefined", "first 10 chars:", rawToken?.substring(0, 10) ?? "N/A");
    const accessToken = sanitizeSecret(rawToken, true);
    console.log("META_ACCESS_TOKEN sanitized length:", accessToken.length);
    if (!accessToken || accessToken.length < 30) {
      throw new Error(`META_ACCESS_TOKEN is invalid or not configured (length: ${accessToken.length})`);
    }

    const rawAccountId = sanitizeSecret(Deno.env.get("META_AD_ACCOUNT_ID"));
    if (!rawAccountId) {
      throw new Error("META_AD_ACCOUNT_ID not configured");
    }

    const normalizedAccountId = rawAccountId.replace(/^act_/i, "");
    if (!/^\d+$/.test(normalizedAccountId)) {
      throw new Error("META_AD_ACCOUNT_ID is invalid. Use only numeric ad account id or act_<id>");
    }

    const actId = `act_${normalizedAccountId}`;

    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const until = now.toISOString().split("T")[0];
    const timeRange = JSON.stringify({ since, until });

    const campaignsData = await fetchMeta(`${actId}/campaigns`, {
      fields: "id,name,status,objective,daily_budget,lifetime_budget",
      access_token: accessToken,
      limit: "50",
    });

    const insightsData = await fetchMeta(`${actId}/insights`, {
      fields: "spend,impressions,clicks,cpc,cpm,ctr,reach,actions,cost_per_action_type",
      time_range: timeRange,
      access_token: accessToken,
    });

    const dailyData = await fetchMeta(`${actId}/insights`, {
      fields: "spend,impressions,clicks,cpc,ctr,reach,actions",
      time_range: timeRange,
      time_increment: "1",
      access_token: accessToken,
    });

    const campaignInsightsData = await fetchMeta(`${actId}/insights`, {
      fields: "campaign_name,campaign_id,spend,impressions,clicks,cpc,ctr,reach,actions,cost_per_action_type",
      time_range: timeRange,
      level: "campaign",
      access_token: accessToken,
      limit: "50",
    });

    return jsonResponse({
      campaigns: campaignsData.data || [],
      accountInsights: insightsData.data?.[0] || null,
      dailyInsights: dailyData.data || [],
      campaignInsights: campaignInsightsData.data || [],
    });
  } catch (error: unknown) {
    console.error("Meta Ads error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
