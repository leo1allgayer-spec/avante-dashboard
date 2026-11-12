import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await request.json().catch(() => ({}));
    const surveyId = String(body.surveyId || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(surveyId)) {
      throw new Error("Pesquisa inválida.");
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Share the database trigger's guarded matching rules with legacy forms.
    const candidate = await supabase.rpc("survey_booking_candidate", { p_survey_id: surveyId });
    if (candidate.error) throw candidate.error;
    if (!candidate.data) return new Response(JSON.stringify({ updated: false, reason: "booking_not_found_or_ambiguous" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const completion = await supabase.rpc("complete_booking_for_survey", { p_survey_id: surveyId });
    if (completion.error) throw completion.error;
    return new Response(JSON.stringify({ updated: Boolean(completion.data), bookingId: candidate.data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
