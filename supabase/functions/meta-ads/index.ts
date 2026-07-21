const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MetaListResponse<T> = {
  data?: T[];
  paging?: {
    next?: string;
  };
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

type GraphParams = Record<string, string | number | boolean | undefined>;

const DEFAULT_VERSION = "v25.0";
const ALLOWED_PRESETS = new Set(["today", "yesterday", "last_7d", "last_30d", "this_month"]);

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Falta configurar o segredo ${name} no Supabase.`);
  }
  return value;
}

function normalizeAdAccountId(value: string) {
  const clean = value.trim();
  return clean.startsWith("act_") ? clean : `act_${clean}`;
}

function buildUrl(path: string, params: GraphParams, token: string) {
  const url = new URL(`https://graph.facebook.com/${Deno.env.get("META_API_VERSION") || DEFAULT_VERSION}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });
  url.searchParams.set("access_token", token);
  return url.toString();
}

async function fetchMeta<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.error) {
    const metaError = payload?.error;
    const details = metaError?.message || `HTTP ${response.status}`;
    throw new Error(`Meta Ads: ${details}`);
  }

  return payload as T;
}

async function fetchAllMetaPages<T>(url: string): Promise<T[]> {
  const rows: T[] = [];
  let nextUrl: string | undefined = url;

  while (nextUrl) {
    const payload = await fetchMeta<MetaListResponse<T>>(nextUrl);
    rows.push(...(payload.data || []));
    nextUrl = payload.paging?.next;
  }

  return rows;
}

async function getSingleInsight<T>(url: string): Promise<T | null> {
  const payload = await fetchMeta<MetaListResponse<T>>(url);
  return payload.data?.[0] || null;
}

function normalizeDateInput(value: unknown) {
  if (typeof value !== "string") return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function buildDateParams(body: any): GraphParams {
  const datePreset = typeof body?.datePreset === "string" ? body.datePreset : "this_month";
  const since = normalizeDateInput(body?.since);
  const until = normalizeDateInput(body?.until);

  if (datePreset === "custom" && since && until) {
    return {
      time_range: JSON.stringify({ since, until }),
    };
  }

  return {
    date_preset: ALLOWED_PRESETS.has(datePreset) ? datePreset : "this_month",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const accessToken = getRequiredEnv("META_ACCESS_TOKEN");
    const adAccountId = normalizeAdAccountId(getRequiredEnv("META_AD_ACCOUNT_ID"));
    const dateParams = buildDateParams(body);

    const insightFields = [
      "spend",
      "impressions",
      "clicks",
      "cpc",
      "cpm",
      "ctr",
      "reach",
      "actions",
      "cost_per_action_type",
    ].join(",");

    const campaignFields = [
      "id",
      "name",
      "status",
      "effective_status",
      "objective",
      "daily_budget",
      "lifetime_budget",
    ].join(",");

    const accountInsightsUrl = buildUrl(`${adAccountId}/insights`, {
      fields: insightFields,
      ...dateParams,
    }, accessToken);

    const dailyInsightsUrl = buildUrl(`${adAccountId}/insights`, {
      fields: insightFields,
      ...dateParams,
      time_increment: 1,
      limit: 100,
    }, accessToken);

    const campaignInsightsUrl = buildUrl(`${adAccountId}/insights`, {
      fields: `campaign_name,campaign_id,${insightFields}`,
      level: "campaign",
      ...dateParams,
      limit: 100,
    }, accessToken);

    const campaignsUrl = buildUrl(`${adAccountId}/campaigns`, {
      fields: campaignFields,
      limit: 100,
    }, accessToken);

    const [accountInsights, dailyInsights, campaignInsights, campaigns] = await Promise.all([
      getSingleInsight(accountInsightsUrl),
      fetchAllMetaPages(dailyInsightsUrl),
      fetchAllMetaPages(campaignInsightsUrl),
      fetchAllMetaPages<any>(campaignsUrl),
    ]);

    const normalizedCampaigns = campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.effective_status || campaign.status,
      objective: campaign.objective || "",
      daily_budget: campaign.daily_budget,
      lifetime_budget: campaign.lifetime_budget,
    }));

    return new Response(JSON.stringify({
      campaigns: normalizedCampaigns,
      accountInsights,
      dailyInsights,
      campaignInsights,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro ao consultar dados da Meta Ads.",
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
