const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CrmLead = {
  id: string;
  quality_stars?: number | null;
  created_at?: string | null;
};

type CrmResponse = {
  data?: CrmLead[];
  pagination?: { page?: number; total_pages?: number };
  error?: { message?: string };
};

const validDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";

const crmLocalDate = (value?: string | null) => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("CRM_API_KEY")?.trim();
    if (!apiKey) throw new Error("CRM_API_KEY não configurada.");
    const body = await request.json().catch(() => ({}));
    const since = validDate(body?.since);
    const until = validDate(body?.until);
    if (!since || !until) throw new Error("Período inválido.");

    const rows: CrmLead[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const response = await fetch(`https://crm.solairew.com.br/api/v1/leads?page=${page}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const payload = await response.json().catch(() => null) as CrmResponse | null;
      if (!response.ok || !payload) throw new Error(payload?.error?.message || `CRM HTTP ${response.status}`);
      rows.push(...(payload.data || []));
      totalPages = Math.max(1, Number(payload.pagination?.total_pages || 1));
      page += 1;
    } while (page <= totalPages && page <= 100);

    const daily: Record<string, number> = {};
    const stars = { four: 0, five: 0 };
    rows.forEach((lead) => {
      const date = crmLocalDate(lead.created_at);
      const rating = Number(lead.quality_stars || 0);
      if (date < since || date > until || rating < 4) return;
      daily[date] = (daily[date] || 0) + 1;
      if (rating === 4) stars.four += 1;
      if (rating >= 5) stars.five += 1;
    });

    return new Response(JSON.stringify({ total: stars.four + stars.five, daily, stars }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
