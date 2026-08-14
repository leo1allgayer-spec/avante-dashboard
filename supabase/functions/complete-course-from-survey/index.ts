import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const digits = (value: unknown) => String(value || "").replace(/\D/g, "");
const normalize = (value: unknown) => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const sameCourse = (bookingCourse: unknown, surveyCourse: unknown) => {
  const booking = normalize(bookingCourse);
  const survey = normalize(surveyCourse);
  const keys = ["meta ads", "google ads", "social media", "inteligencia artificial", "canva", "captacao"];
  const surveyKey = keys.find((key) => survey.includes(key));
  return surveyKey ? booking.includes(surveyKey) : booking === survey;
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
    const surveyResult = await supabase.from("survey_responses")
      .select("id,email,whatsapp,curso_realizado,data_curso")
      .eq("id", surveyId).maybeSingle();
    if (surveyResult.error) throw surveyResult.error;
    if (!surveyResult.data) throw new Error("Pesquisa não encontrada.");

    const email = String(surveyResult.data.email || "").trim().toLowerCase();
    const phone = digits(surveyResult.data.whatsapp);
    const course = String(surveyResult.data.curso_realizado || "").trim();
    const date = String(surveyResult.data.data_curso || "").trim();
    if (!course || !date || (!email && phone.length < 10)) throw new Error("Pesquisa sem dados suficientes para localizar o agendamento.");
    let query = supabase
      .from("course_bookings")
      .select("id,course_name,email,phone,date,course_status,created_at")
      .eq("date", date)
      .order("created_at", { ascending: false })
      .limit(50);
    if (email) query = query.eq("email", email);

    let { data: bookings, error } = await query;
    if (error) throw error;
    let booking = (bookings || []).find((item) => sameCourse(item.course_name, course) && (!phone || digits(item.phone) === phone));

    if (!booking && phone) {
      const fallback = await supabase.from("course_bookings")
        .select("id,course_name,email,phone,date,course_status,created_at")
        .eq("date", date).eq("phone", phone).order("created_at", { ascending: false }).limit(20);
      if (fallback.error) throw fallback.error;
      booking = (fallback.data || []).find((item) => sameCourse(item.course_name, course));
    }

    if (!booking) return new Response(JSON.stringify({ updated: false, reason: "booking_not_found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const update = await supabase.from("course_bookings").update({ course_status: "concluído", updated_at: new Date().toISOString() }).eq("id", booking.id);
    if (update.error) throw update.error;
    return new Response(JSON.stringify({ updated: true, bookingId: booking.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
