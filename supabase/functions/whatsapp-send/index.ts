import { onlineCourseMessage } from '../_shared/online-course-message.ts';
import { courseNotificationIdentity } from '../_shared/course-notification-identity.ts';
import { isInternalMessage } from "../_shared/whatsapp-router.ts";
import { sendWhatsAppOnce } from "../_shared/whatsapp-dispatch.ts";
import { supportNotificationExpired } from "../_shared/whatsapp-delivery-policy.ts";
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
            confirmacao_link: `${getPublicSiteUrl()}/confirmar-agendamento?id=${bookingId}`,
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

    let identity = String(body.courseName || "");
    if (bookingId) {
      const { data: current, error } = await supabase.from("course_bookings")
        .select("date,time,status,course_status,course_name").eq("id", bookingId).single();
      if (error || !current) throw new Error("Agendamento não encontrado; envio interrompido.");
      if (current.status !== "confirmed" || current.course_status === "cancelado") throw new Error("Agendamento cancelado ou não confirmado; envio interrompido.");
      const time = current.time === "Manhã" ? "08:30" : current.time === "Tarde" ? "14:00" : current.time || "08:30";
      const starts = Date.parse(`${current.date}T${time}-03:00`);
      if (["confirmation", "reminder_24h", "reminder_1h"].includes(messageType) && (!Number.isFinite(starts) || starts <= Date.now())) {
        throw new Error("Aviso expirado; o horário do curso já passou.");
      }
      if(current.course_name==='Curso Meta Ads Online'&&['confirmation','reminder_24h','reminder_1h'].includes(messageType)) messageText=onlineCourseMessage(messageText);
      identity = courseNotificationIdentity(bookingId, current.date, time, current.course_name);
    } else if (String(messageType).startsWith("support_")) {
      const supportId = /^Suporte:([0-9a-f-]{36}):/i.exec(String(body.courseName || ""))?.[1];
      if (!supportId) throw new Error("Identificação do suporte ausente; envio interrompido.");
      const { data: booking, error } = await supabase.from("support_bookings")
        .select("booking_date,start_time,status").eq("id", supportId).single();
      const { data: job } = await supabase.from("support_notification_jobs").select("scheduled_for")
        .eq("booking_id", supportId).eq("message_type", messageType.slice(8)).maybeSingle();
      if (error || !booking || !job || booking.status !== "agendado"
        || supportNotificationExpired(messageType, job.scheduled_for, booking.booking_date, booking.start_time)) {
        throw new Error("Aviso de suporte expirado ou agendamento encerrado; envio interrompido.");
      }
      identity = `${supportId}:${booking.booking_date}:${booking.start_time}`;
    }

    let manualRetry = false;
    if (body.retryLogId) {
      const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
      const { data: auth, error: authError } = await supabase.auth.getUser(token);
      if (authError || !auth.user) throw new Error("Entre na sua conta para revisar o reenvio.");
      const { data: original } = await supabase.from("whatsapp_message_logs").select("status,phone,message_type,booking_id,course_name")
        .eq("id", body.retryLogId).single();
      if (!original || original.status !== "error" || original.message_type !== messageType
        || original.booking_id !== (bookingId || null) || original.course_name !== (body.courseName || "")) {
        throw new Error("Registro de falha inválido para reenvio.");
      }
      manualRetry = true;
    }

    // Respect deliveries recorded before the atomic dispatch ledger existed.
    const { data: previous, error: previousError } = await supabase.from("whatsapp_message_logs")
      .select("status,error_message").eq("phone", formattedPhone).eq("message_type", messageType)
      .eq("message_text", messageText).in("status", ["sent", "pending", "error"]).order("created_at", { ascending: false }).limit(1000);
    if (previousError) throw new Error("Não foi possível verificar o histórico; envio interrompido.");
    if (previous?.some(log => log.status === "sent")) {
      return new Response(JSON.stringify({ success: true, deduplicated: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (previous?.some(log => log.status === "pending" || /sem confirmação|não confirmad/i.test(log.error_message || ""))) {
      throw new Error("Envio anterior sem confirmação. Verifique a entrega antes de reenviar.");
    }

    const { data: team } = await supabase.from("team_members").select("phone");
    const teamRecipient = (team || []).some(member => formatPhone(String(member.phone || "")) === formattedPhone);
    const audience = isInternalMessage(messageType) || teamRecipient ? "internal" : "customer";
    const { accepted, deliveryStatus, status, result, resultText, channel, fallback, definitive, deduplicated } = await sendWhatsAppOnce(supabase, formattedPhone, messageText, audience, messageType, identity, manualRetry);
    if (!accepted) console.error("WhatsApp delivery was not accepted", { audience, channel, fallback });

    if (!deduplicated) await supabase.from("whatsapp_message_logs").insert({
      booking_id: bookingId || null,
      phone: formattedPhone,
      student_name: body.studentName || "",
      course_name: body.courseName || "",
      message_type: messageType,
      message_text: messageText,
      status: deliveryStatus,
      error_message: accepted ? null : !definitive ? "Envio sem confirmação; verificar entrega antes de reenviar." : buildErrorMessage(status, resultText, result),
      sent_at: deliveryStatus === "sent" ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({ success: accepted, status: deliveryStatus, result, channel, fallback, deduplicated,
      error: accepted ? undefined : !definitive && !deduplicated ? "Envio sem confirmação; verificar entrega antes de reenviar." : buildErrorMessage(status, resultText, result) }), {
      status: accepted ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
