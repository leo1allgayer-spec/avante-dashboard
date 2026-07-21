const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  url = url.replace(/\/manager$/i, "");
  return url;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
  const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME")!;
  const EVOLUTION_API_TOKEN = Deno.env.get("EVOLUTION_API_TOKEN")!;

  const baseUrl = normalizeBaseUrl(EVOLUTION_API_URL);
  const url = `${baseUrl}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE_NAME)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_TOKEN },
    body: JSON.stringify({ number: "5551999692480", text: "Teste Avante Digital ✅" }),
  });
  return new Response(JSON.stringify({ instance: EVOLUTION_INSTANCE_NAME, url, status: r.status, body: await r.text() }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
