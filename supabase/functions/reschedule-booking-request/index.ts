import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.0/cors";

const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://dashboard-avante.pages.dev";

function normalizePhone(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

function formatShiftTime(shift: string) {
  if (shift === "Manhã" || shift === "ManhÃ£") return "08:30";
  if (shift === "Tarde") return "14:00";
  return shift;
}

function formatDateBR(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const courseName = String(body.courseName || "").trim();
    const date = String(body.date || "").trim();
    const shift = String(body.shift || "").trim();
    const studentName = String(body.studentName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = normalizePhone(String(body.phone || ""));
    const instagram = String(body.instagram || "").trim();
    const certificateName = String(body.certificateName || "").trim() || studentName;
    const dryRun = body.dryRun !== false;

    if (!courseName || !date || !shift || !studentName || !email || phone.length < 12) {
      return new Response(JSON.stringify({ error: "Dados incompletos para remarcação." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error: bookingError } = await supabase
      .from("course_bookings")
      .select("id,student_name,course_name,email,phone,date,time,status,course_status")
      .eq("course_name", courseName)
      .eq("status", "confirmed")
      .eq("email", email)
      .eq("phone", phone)
      .not("course_status", "in", "(cancelado,concluido,concluído)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bookingError) throw bookingError;

    if (!booking) {
      return new Response(JSON.stringify({ exists: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (dryRun) {
      return new Response(JSON.stringify({ exists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("course_reschedule_requests")
      .insert({
        booking_id: booking.id,
        course_name: courseName,
        date,
        time: shift,
        student_name: studentName,
        email,
        phone,
        instagram,
        certificate_name: certificateName,
      })
      .select("token")
      .single();

    if (requestError) throw requestError;

    const confirmationLink = `${SITE_URL}/confirmar-remarcacao?token=${requestRow.token}`;
    const text = [
      `Olá, ${studentName}!`,
      "",
      "Recebemos uma solicitação para remarcar seu curso:",
      "",
      `Curso: ${courseName}`,
      `Nova data: ${formatDateBR(date)} às ${formatShiftTime(shift)}`,
      "",
      "Para confirmar a remarcação, clique aqui:",
      confirmationLink,
      "",
      "Se você não pediu isso, pode ignorar esta mensagem.",
    ].join("\n");

    const sendUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`;
    const sendResponse = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        phone,
        messageType: "reschedule_request",
        customText: text,
        studentName,
        courseName,
      }),
    });

    const sendResult = await sendResponse.json().catch(() => ({}));
    if (!sendResponse.ok || sendResult?.success === false) {
      return new Response(JSON.stringify({ exists: true, sent: false, error: "Não foi possível enviar o WhatsApp." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ exists: true, sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Reschedule request error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
