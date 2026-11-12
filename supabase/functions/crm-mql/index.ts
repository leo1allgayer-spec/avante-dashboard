const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CrmLead = {
  id: string;
  quality_stars?: number | null;
  created_at?: string | null;
  name?: string | null;
  full_name?: string | null;
  lead_name?: string | null;
  contact_name?: string | null;
  customer_name?: string | null;
  client_name?: string | null;
  nome?: string | null;
};

type CrmResponse = {
  data?: CrmLead[];
  pagination?: { page?: number; total_pages?: number };
  error?: { message?: string };
};

type MqlResult = { total: number; daily: Record<string, number>; leadsDaily: Record<string, number>; leadsComplete: boolean; crmReportLeads: number | null; crmReportError: string | null; stars: { three: number; four: number; five: number } };
const CRM_BASE_URL = "https://crm.solairew.com.br/api/v1";
const CACHE_TTL_MS = 15 * 60 * 1000;
const responseCache = new Map<string, { expiresAt: number; value: MqlResult }>();

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

const fetchLeadPage = async (apiKey: string, page: number) => {
  const query = new URLSearchParams({ page: String(page), per_page: "100", limit: "100" });
  const response = await fetch(CRM_BASE_URL + "/leads?" + query.toString(), {
    headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" },
  });
  const payload = await response.json().catch(() => null) as CrmResponse | null;
  if (!response.ok || !payload) throw new Error(payload?.error?.message || "CRM HTTP " + response.status);
  return payload;
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const reportCountKeys = ["total", "total_leads", "totalLeads", "leads_total", "leadsTotal", "leads_count", "leadsCount", "emoi_leads", "emoiLeads", "count", "quantidade", "total_registros"];
const reportArrayKeys = ["data", "leads", "items", "results", "rows", "records", "result"];

const readReportLeadCount = (payload: unknown): number | null => {
  const visited = new Set<unknown>();
  const visit = (value: unknown, depth: number): number | null => {
    if (Array.isArray(value)) return value.length;
    const object = asObject(value);
    if (!object || visited.has(object) || depth > 5) return null;
    visited.add(object);
    for (const key of reportCountKeys) {
      const candidate = object[key];
      if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
      if (typeof candidate === "string" && candidate.trim() !== "" && Number.isFinite(Number(candidate))) return Number(candidate);
    }
    for (const key of reportArrayKeys) if (Array.isArray(object[key])) return (object[key] as unknown[]).length;
    for (const [key, candidate] of Object.entries(object)) {
      if (key === "pagination" || key === "meta") continue;
      const nested = visit(candidate, depth + 1);
      if (nested !== null) return nested;
    }
    return null;
  };
  return visit(payload, 0);
};

const fetchEmoiLeadReport = async (apiKey: string, since: string, until: string): Promise<number | null> => {
  const endExclusive = new Date(`${until}T12:00:00Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const query = new URLSearchParams({ from: since, to: endExclusive.toISOString().slice(0, 10) });
  const response = await fetch(`${CRM_BASE_URL}/reports/emoi-leads?${query.toString()}`, {
    headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new Error("CRM_REPORT_HTTP_" + response.status);
  const count = readReportLeadCount(payload);
  if (count === null) throw new Error("CRM_REPORT_UNRECOGNIZED_RESPONSE");
  return count;
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

    const cacheKey = since + ":" + until;
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(JSON.stringify(cached.value), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-CRM-MQL-Cache": "HIT" },
      });
    }

    const [firstPage, reportResult] = await Promise.all([
      fetchLeadPage(apiKey, 1),
      fetchEmoiLeadReport(apiKey, since, until)
        .then((value) => ({ value, error: null as string | null }))
        .catch((error) => ({ value: null, error: error instanceof Error ? error.message : "CRM_REPORT_ERROR" })),
    ]);
    const crmReportLeads = reportResult.value;
    const totalPages = Math.min(100, Math.max(1, Number(firstPage.pagination?.total_pages || 1)));
    const rows: CrmLead[] = [...(firstPage.data || [])];
    for (let startPage = 2; startPage <= totalPages; startPage += 20) {
      const endPage = Math.min(totalPages, startPage + 19);
      const pages = await Promise.all(
        Array.from({ length: endPage - startPage + 1 }, (_, index) => fetchLeadPage(apiKey, startPage + index)),
      );
      pages.forEach((payload) => rows.push(...(payload.data || [])));
    }

    const daily: Record<string, number> = {};
    const leadsDaily: Record<string, number> = {};
    const stars = { three: 0, four: 0, five: 0 };
    [...new Map(rows.map(lead => [lead.id, lead])).values()].forEach((lead) => {
      const date = crmLocalDate(lead.created_at);
      if (date >= since && date <= until) leadsDaily[date] = (leadsDaily[date] || 0) + 1;
      const rating = Number(lead.quality_stars || 0);
      if (date < since || date > until || rating < 3) return;
      daily[date] = (daily[date] || 0) + 1;
      if (rating === 3) stars.three += 1;
      if (rating === 4) stars.four += 1;
      if (rating >= 5) stars.five += 1;
    });

    const result: MqlResult = { total: stars.three + stars.four + stars.five, daily, leadsDaily, leadsComplete: Number(firstPage.pagination?.total_pages || 1) <= 100 && rows.every(lead => Boolean(lead.created_at)), crmReportLeads, crmReportError: reportResult.error, stars };
    responseCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: result });
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-CRM-MQL-Cache": "MISS" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});





