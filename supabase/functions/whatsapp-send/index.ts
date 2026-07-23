import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  // Remove painel /manager se presente — a API fica na raiz
  url = url.replace(/\/manager$/i, "");
  return url;
}

function formatPhone(phone: string): string {
  // Remove tudo que não é dígito (espaços, parênteses, traços, +, etc.)
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  return digits;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

function getPublicSiteUrl(): string {
  return (Deno.env.get("PUBLIC_SITE_URL") || "https://dashboard-avante.pages.dev").replace(/\/+$/, "");
}

// Cache do nome técnico real da instância (resolvido via fetchInstances)
let RESOLVED_INSTANCE: string | null = null;

async function resolveInstanceName(baseUrl: string, configuredName: string, token: string): Promise<string> {
  if (RESOLVED_INSTANCE) return RESOLVED_INSTANCE;

  // Tenta primeiro o nome configurado (caso seja exatamente o "name" técnico)
  try {
    const r = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(configuredName)}`, {
      headers: { "apikey": token },
    });
    if (r.ok) {
      await r.text();
      RESOLVED_INSTANCE = configuredName;
      console.log(`Evolution instance resolved (direct): "${configuredName}"`);
      return configuredName;
    }
    await r.text();
  } catch (_) { /* segue para fallback */ }

  // Fallback: lista todas as instâncias e procura por name OU profileName
  const listResp = await fetch(`${baseUrl}/instance/fetchInstances`, {
    headers: { "apikey": token },
  });
  const listText = await listResp.text();
  if (!listResp.ok) {
    console.error("fetchInstances failed:", listResp.status, listText);
    throw new Error(`Não foi possível listar instâncias da Evolution API (HTTP ${listResp.status})`);
  }
  let arr: any[] = [];
  try { arr = JSON.parse(listText); } catch { arr = []; }
  const target = configuredName.trim().toLowerCase();
  const match = arr.find((i: any) =>
    (i?.name && String(i.name).trim().toLowerCase() === target) ||
    (i?.profileName && String(i.profileName).trim().toLowerCase() === target) ||
    (i?.token && String(i.token) === token)
  );
  if (!match?.name) {
    const available = arr.map((i: any) => i?.name).filter(Boolean).join(", ");
    throw new Error(`Instância "${configuredName}" não encontrada. Disponíveis: ${available || "(nenhuma)"}`);
  }
  RESOLVED_INSTANCE = match.name;
  console.log(`Evolution instance resolved (via fetchInstances): "${configuredName}" -> "${match.name}"`);
  return match.name;
}

async function sendViaEvolution(phone: string, text: string) {
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");
  const EVOLUTION_API_TOKEN = Deno.env.get("EVOLUTION_API_TOKEN");

  if (!EVOLUTION_API_URL || !EVOLUTION_INSTANCE_NAME || !EVOLUTION_API_TOKEN) {
    throw new Error("Evolution API credentials not configured");
  }

  const baseUrl = normalizeBaseUrl(EVOLUTION_API_URL);
  const instanceName = await resolveInstanceName(baseUrl, EVOLUTION_INSTANCE_NAME, EVOLUTION_API_TOKEN);
  const instance = encodeURIComponent(instanceName);
  const url = `${baseUrl}/message/sendText/${instance}`;

  const requestBody = { number: phone, text };

  console.log("Evolution request:", JSON.stringify({ url, body: requestBody }));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_TOKEN,
    },
    body: JSON.stringify(requestBody),
  });

  const resultText = await response.text();
  console.log("Evolution response status:", response.status);
  console.log("Evolution response body:", resultText);

  let result: any;
  try { result = JSON.parse(resultText); } catch { result = { raw: resultText }; }

  // Evolution pode responder 200/201 mas com erro lógico no corpo.
  // Considera falha quando: HTTP não-ok, status textual de erro, ou ausência de key/messageTimestamp.
  let ok = response.ok;
  if (ok && result && typeof result === "object") {
    const innerStatus = String(result?.status ?? "").toUpperCase();
    const hasError = !!result?.error || innerStatus === "ERROR" || innerStatus === "FAILED";
    const looksLikeAck = !!(result?.key?.id || result?.messageTimestamp);
    if (hasError || !looksLikeAck) ok = false;
  }

  return { ok, status: response.status, result, resultText };
}

function buildErrorMessage(status: number, resultText: string, result: any): string {
  const isHtml = resultText.trim().startsWith("<") || resultText.includes("<!DOCTYPE");
  if (isHtml) {
    if (status === 520) return "Provedor Evolution API indisponível (erro 520 - Cloudflare)";
    if (status >= 500) return `Provedor Evolution API com falha temporária (erro ${status})`;
    return `Provedor Evolution API retornou erro ${status}`;
  }
  if (result?.message) return `Erro do provedor: ${typeof result.message === "string" ? result.message : JSON.stringify(result.message)}`;
  if (result?.error) return typeof result.error === "string" ? `Erro do provedor: ${result.error}` : `Erro do provedor (HTTP ${status})`;
  if (status === 401 || status === 403) return "Falha de autenticação na Evolution API (token/instance inválidos)";
  if (status === 404) return "Instância Evolution não encontrada (verifique EVOLUTION_INSTANCE_NAME)";
  return `Falha no envio (HTTP ${status})`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phone, bookingId, messageType, customText } = body;

    if (!phone || !messageType) {
      return new Response(JSON.stringify({ error: "phone and messageType are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let messageText = customText;

    if (!messageText) {
      const { data: template } = await supabase
        .from("whatsapp_message_templates")
        .select("message_template, is_active")
        .eq("type", messageType)
        .single();

      if (!template || !template.is_active) {
        return new Response(JSON.stringify({ error: "Template not found or disabled" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (bookingId) {
        const { data: booking } = await supabase
          .from("course_bookings")
          .select("*")
          .eq("id", bookingId)
          .single();

        if (booking) {
          const [y, m, d] = booking.date.split("-");
          const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
          const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
          const dayName = dayNames[dateObj.getDay()];
          const dateFormatted = `${d}/${m}/${y}`;

          let timeDisplay = booking.time;
          if (booking.time === "Manhã") timeDisplay = "08:30";
          else if (booking.time === "Tarde") timeDisplay = "14:00";

          messageText = fillTemplate(template.message_template, {
            nome: booking.student_name,
            curso: booking.course_name,
            data_agendamento: `${dayName}, ${dateFormatted} às ${timeDisplay}`,
          });
        }
      }

      if (!messageText) {
        messageText = template.message_template;
      }
    }

    if (bookingId && messageText) {
      messageText = messageText.replace(
        /\{\{confirmacao_link\}\}/g,
        `${getPublicSiteUrl()}/confirmar-agendamento?id=${bookingId}`,
      );
    }

    const formattedPhone = formatPhone(phone);

    const { ok: success, status, result, resultText } = await sendViaEvolution(formattedPhone, messageText);

    await supabase.from("whatsapp_message_logs").insert({
      booking_id: bookingId || null,
      phone: formattedPhone,
      student_name: body.studentName || "",
      course_name: body.courseName || "",
      message_type: messageType,
      message_text: messageText,
      status: success ? "sent" : "error",
      error_message: success ? null : buildErrorMessage(status, resultText, result),
      sent_at: success ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({ success, result }), {
      status: success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
