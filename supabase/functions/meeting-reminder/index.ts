import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  url = url.replace(/\/manager$/i, "");
  return url;
}

// Mapeamento fixo de participantes para números de WhatsApp
const PARTICIPANT_PHONES: Record<string, string> = {
  "Leonardo Allgayer": "5551999692480",
  "Leonardo Webster": "5551993512435",
  "Lucas Pilger": "5551995750062",
  "Nicolas Patzlaff": "5551998119283",
};

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");
    const EVOLUTION_API_TOKEN = Deno.env.get("EVOLUTION_API_TOKEN");
    if (!EVOLUTION_API_URL || !EVOLUTION_INSTANCE_NAME || !EVOLUTION_API_TOKEN) {
      throw new Error("Evolution API credentials not configured");
    }
    const evolutionBase = normalizeBaseUrl(EVOLUTION_API_URL);

    // Resolver o nome técnico real da instância (aceita name ou profileName)
    async function resolveInstance(): Promise<string> {
      const direct = await fetch(`${evolutionBase}/instance/connectionState/${encodeURIComponent(EVOLUTION_INSTANCE_NAME!)}`, {
        headers: { "apikey": EVOLUTION_API_TOKEN! },
      });
      if (direct.ok) { await direct.text(); return EVOLUTION_INSTANCE_NAME!; }
      await direct.text();
      const list = await fetch(`${evolutionBase}/instance/fetchInstances`, { headers: { "apikey": EVOLUTION_API_TOKEN! } });
      const txt = await list.text();
      let arr: any[] = [];
      try { arr = JSON.parse(txt); } catch { arr = []; }
      const target = EVOLUTION_INSTANCE_NAME!.trim().toLowerCase();
      const m = arr.find((i: any) =>
        (i?.name && String(i.name).trim().toLowerCase() === target) ||
        (i?.profileName && String(i.profileName).trim().toLowerCase() === target) ||
        (i?.token && String(i.token) === EVOLUTION_API_TOKEN)
      );
      return m?.name || EVOLUTION_INSTANCE_NAME!;
    }
    const resolvedInstance = await resolveInstance();
    console.log(`Evolution instance resolved: "${EVOLUTION_INSTANCE_NAME}" -> "${resolvedInstance}"`);
    const evolutionUrl = `${evolutionBase}/message/sendText/${encodeURIComponent(resolvedInstance)}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Horário atual em BRT (UTC-3)
    const now = new Date();
    const brtOffset = -3 * 60;
    const brtNow = new Date(now.getTime() + (brtOffset + now.getTimezoneOffset()) * 60000);

    const brtYear = brtNow.getFullYear();
    const brtMonth = String(brtNow.getMonth() + 1).padStart(2, "0");
    const brtDay = String(brtNow.getDate()).padStart(2, "0");
    const todayStr = `${brtYear}-${brtMonth}-${brtDay}`;

    // Buscar reuniões pendentes de hoje
    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select("*")
      .eq("date", todayStr)
      .eq("status", "pending");

    if (meetingsError) {
      console.error("Error fetching meetings:", meetingsError);
      throw new Error("Failed to fetch meetings");
    }

    if (!meetings || meetings.length === 0) {
      return new Response(JSON.stringify({ message: "No meetings today", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brtNowMinutes = brtNow.getHours() * 60 + brtNow.getMinutes();
    let sentCount = 0;

    for (const meeting of meetings) {
      if (!meeting.time) continue;

      // Parsear horário da reunião (formato HH:MM)
      const [hours, minutes] = meeting.time.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) continue;

      const meetingMinutes = hours * 60 + minutes;
      const diffMinutes = meetingMinutes - brtNowMinutes;

      // Enviar se falta entre 25 e 35 minutos (janela de 10 min para o cron de 5 min)
      if (diffMinutes < 25 || diffMinutes > 35) continue;

      const participants: string[] = meeting.participants || [];

      for (const participantName of participants) {
        const phone = PARTICIPANT_PHONES[participantName];
        if (!phone) continue;

        // Verificar se já enviou
        const { data: existing } = await supabase
          .from("meeting_reminder_logs")
          .select("id")
          .eq("meeting_id", meeting.id)
          .eq("participant_name", participantName)
          .maybeSingle();

        if (existing) continue;

        // Montar mensagem
        const messageText = `⏰ *Lembrete de Reunião*\n\nOlá ${participantName}! Sua reunião "${meeting.title}" está marcada para daqui a 30 minutos (${meeting.time}).\n\n📅 Data: ${formatDateBR(meeting.date)}\n📍 Modalidade: ${meeting.modality === "online" ? "Online" : "Presencial"}\n\n${meeting.description ? `📝 ${meeting.description}` : ""}`;

        // Enviar via Evolution API
        const response = await fetch(evolutionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_API_TOKEN,
          },
          body: JSON.stringify({
            number: phone,
            text: messageText,
          }),
        });

        const success = response.ok;
        console.log(`Reminder to ${participantName} (${phone}): ${success ? "sent" : "failed"}`);

        // Registrar envio
        await supabase.from("meeting_reminder_logs").insert({
          meeting_id: meeting.id,
          participant_name: participantName,
          phone,
          status: success ? "sent" : "error",
        });

        if (success) sentCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Meeting reminder error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
