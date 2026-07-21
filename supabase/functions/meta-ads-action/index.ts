const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_VERSION = "v25.0";

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Falta configurar o segredo ${name} no Supabase.`);
  }
  return value;
}

function buildUrl(path: string, token: string) {
  const url = new URL(`https://graph.facebook.com/${Deno.env.get("META_API_VERSION") || DEFAULT_VERSION}/${path}`);
  url.searchParams.set("access_token", token);
  return url.toString();
}

async function postMeta(path: string, body: Record<string, string>, token: string) {
  const response = await fetch(buildUrl(path, token), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.error) {
    const details = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Meta Ads: ${details}`);
  }

  return payload;
}

function normalizeCampaignId(value: unknown) {
  if (typeof value !== "string" || !/^\d{8,}$/.test(value.trim())) {
    throw new Error("Campanha invalida.");
  }
  return value.trim();
}

function normalizeStatus(value: unknown) {
  if (value !== "ACTIVE" && value !== "PAUSED") {
    throw new Error("Status invalido. Use ACTIVE ou PAUSED.");
  }
  return value;
}

function budgetToCents(value: unknown) {
  const budget = Number(value);
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new Error("Informe um orcamento maior que zero.");
  }
  return String(Math.round(budget * 100));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = getRequiredEnv("META_ACCESS_TOKEN");
    const body = await req.json().catch(() => ({}));
    const campaignId = normalizeCampaignId(body.campaignId);

    if (body.action === "set_campaign_status") {
      const status = normalizeStatus(body.status);
      const result = await postMeta(campaignId, { status }, token);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "set_campaign_daily_budget") {
      const dailyBudget = budgetToCents(body.dailyBudget);
      const result = await postMeta(campaignId, { daily_budget: dailyBudget }, token);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Acao invalida.");
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro ao alterar campanha.",
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
