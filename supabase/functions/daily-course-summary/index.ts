import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Booking = {
  id: string;
  course_name: string;
  course_status?: string | null;
  date: string;
  phone: string;
  status?: string | null;
  student_name: string;
  time: string;
};

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "").replace(/\/manager$/i, "");
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  return digits;
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getBrtDate(offsetDays: number): string {
  const now = new Date();
  const brtNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  brtNow.setDate(brtNow.getDate() + offsetDays);
  const y = brtNow.getFullYear();
  const m = String(brtNow.getMonth() + 1).padStart(2, "0");
  const d = String(brtNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeLabel(time: string): string {
  const normalized = time.trim().toLowerCase();
  if (normalized.includes("manh")) return "08:30";
  if (normalized.includes("tarde")) return "14:00";
  return time;
}

function isMetaCourse(booking: Booking): boolean {
  return booking.course_name.toLowerCase().includes("meta");
}

function isActiveBooking(booking: Booking): boolean {
  const values = [booking.status, booking.course_status].map((v) => String(v || "").toLowerCase());
  return !values.some((value) =>
    value.includes("cancel") ||
    value.includes("conclu") ||
    value.includes("done")
  );
}

function buildMessage(recipientName: string, targetDate: string, bookings: Booking[]): string {
  const courseWord = bookings.length === 1 ? "curso" : "cursos";
  const lines = bookings
    .sort((a, b) => timeLabel(a.time).localeCompare(timeLabel(b.time)))
    .map((booking) => `• ${timeLabel(booking.time)} — ${booking.course_name}\nAluno: ${booking.student_name}`);

  return [
    `Olá ${recipientName}! 👋`,
    "",
    `Lembrete: amanhã (${formatDateBR(targetDate)}) você tem ${bookings.length} ${courseWord} de Meta Ads:`,
    "",
    lines.join("\n\n"),
    "",
    "Bom curso! 🚀",
  ].join("\n");
}

let resolvedInstance: string | null = null;

async function resolveInstanceName(baseUrl: string, configuredName: string, token: string): Promise<string> {
  if (resolvedInstance) return resolvedInstance;

  try {
    const direct = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(configuredName)}`, {
      headers: { "apikey": token },
    });
    if (direct.ok) {
      await direct.text();
      resolvedInstance = configuredName;
      return configuredName;
    }
    await direct.text();
  } catch (_) {
    // Falls back to fetchInstances below.
  }

  const listResp = await fetch(`${baseUrl}/instance/fetchInstances`, {
    headers: { "apikey": token },
  });
  const listText = await listResp.text();
  let instances: any[] = [];
  try {
    instances = JSON.parse(listText);
  } catch (_) {
    instances = [];
  }

  const target = configuredName.trim().toLowerCase();
  const match = instances.find((instance: any) =>
    (instance?.name && String(instance.name).trim().toLowerCase() === target) ||
    (instance?.profileName && String(instance.profileName).trim().toLowerCase() === target) ||
    (instance?.token && String(instance.token) === token)
  );

  resolvedInstance = match?.name || configuredName;
  return resolvedInstance;
}

async function sendText(phone: string, text: string) {
  const apiUrl = Deno.env.get("EVOLUTION_API_URL");
  const instanceName = Deno.env.get("EVOLUTION_INSTANCE_NAME");
  const apiToken = Deno.env.get("EVOLUTION_API_TOKEN");

  if (!apiUrl || !instanceName || !apiToken) {
    throw new Error("Evolution API credentials not configured");
  }

  const baseUrl = normalizeBaseUrl(apiUrl);
  const instance = await resolveInstanceName(baseUrl, instanceName, apiToken);
  const response = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": apiToken,
    },
    body: JSON.stringify({ number: formatPhone(phone), text }),
  });

  const resultText = await response.text();
  let result: any;
  try {
    result = JSON.parse(resultText);
  } catch (_) {
    result = { raw: resultText };
  }

  const hasError = !!result?.error || String(result?.status || "").toUpperCase() === "ERROR";
  const ok = response.ok && !hasError;

  return { ok, status: response.status, result, resultText };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expectedSecret = Deno.env.get("DAILY_COURSE_SUMMARY_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");

    if (!expectedSecret) {
      throw new Error("DAILY_COURSE_SUMMARY_SECRET not configured");
    }

    if (providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetDate = body.date || getBrtDate(1);
    const recipientName = Deno.env.get("DAILY_COURSE_SUMMARY_NAME") || "Leonardo";
    const recipientPhone = Deno.env.get("DAILY_COURSE_SUMMARY_PHONE") || "5551999692480";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const logCourseName = `Meta Ads ${targetDate}`;
    const { data: existingLog } = await supabase
      .from("whatsapp_message_logs")
      .select("id")
      .eq("message_type", "daily_course_summary")
      .eq("course_name", logCourseName)
      .eq("phone", formatPhone(recipientPhone))
      .eq("status", "sent")
      .maybeSingle();

    if (existingLog && !body.force) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("course_bookings")
      .select("*")
      .eq("date", targetDate);

    if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);

    const bookings = ((data || []) as Booking[]).filter((booking) => isMetaCourse(booking) && isActiveBooking(booking));

    if (bookings.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: false, count: 0, date: targetDate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageText = buildMessage(recipientName, targetDate, bookings);
    const result = await sendText(recipientPhone, messageText);
    const formattedPhone = formatPhone(recipientPhone);

    await supabase.from("whatsapp_message_logs").insert({
      booking_id: null,
      phone: formattedPhone,
      student_name: recipientName,
      course_name: logCourseName,
      message_type: "daily_course_summary",
      message_text: messageText,
      status: result.ok ? "sent" : "error",
      error_message: result.ok ? null : `HTTP ${result.status}: ${result.resultText}`,
      sent_at: result.ok ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({
      success: result.ok,
      sent: result.ok,
      count: bookings.length,
      date: targetDate,
      message: messageText,
      result: result.result,
    }), {
      status: result.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Daily course summary error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
