import { sendWhatsApp } from "../_shared/whatsapp-router.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const result = await sendWhatsApp("5551999692480", "Teste Avante Digital ✅", "internal");
  return new Response(JSON.stringify(result), { status: result.accepted ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
