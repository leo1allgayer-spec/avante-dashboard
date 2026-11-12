import { meetingLeadSummary, loadMeetingLeadSummary } from "../_shared/meeting-lead-summary.ts";
import { customerMeetingRecipient } from "../_shared/meeting-customer.ts";
import { eligibleBookingConfirmation } from "../_shared/meeting-confirmation.ts";
import { sendWhatsApp } from "../_shared/whatsapp-router.ts";
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

// Fallback para responsáveis antigos enquanto o WhatsApp não é preenchido no cadastro da equipe
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
    const expectedCronSecret = Deno.env.get("WHATSAPP_SCHEDULER_SECRET");
    if (!expectedCronSecret || req.headers.get("x-cron-secret") !== expectedCronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: teamRows, error: teamError } = await supabase
      .from("team_members")
      .select("name, phone");
    if (teamError) throw new Error("Failed to fetch team members");
    const teamPhones = new Map<string, string>(
      (teamRows || []).filter((member) => member.name && member.phone).map((member) => [member.name, String(member.phone).replace(/\D/g, "")]),
    );
    const { data: clients, error: clientsError } = await supabase
      .from("gestao_clients").select("id,name,notes");
    if (clientsError) throw new Error("Failed to fetch client contacts");

    // Horário atual em BRT (UTC-3)
    const now = new Date();
    const brtOffset = -3 * 60;
    const brtNow = new Date(now.getTime() + (brtOffset + now.getTimezoneOffset()) * 60000);

    const brtYear = brtNow.getFullYear();
    const brtMonth = String(brtNow.getMonth() + 1).padStart(2, "0");
    const brtDay = String(brtNow.getDate()).padStart(2, "0");
    const todayStr = `${brtYear}-${brtMonth}-${brtDay}`;

    // CRM-only appointments must exist locally before the reminder query runs.
    const confirmationHorizon = new Date(now.getTime() + 180 * 86400000).toISOString().slice(0,10);
    const {data: crmAgenda, error: crmError} = await supabase.functions.invoke("crm-agenda", {body:{since:todayStr,until:confirmationHorizon}});
    if (crmError || crmAgenda?.error) console.error("CRM reminder sync unavailable", crmError?.message || crmAgenda?.error);
    else {
      const appointments = (crmAgenda?.appointments || []).filter((m:any) => m.date >= todayStr && m.externalId);
      if (appointments.length) {
        const {data: users, error: usersError} = await supabase.auth.admin.listUsers({perPage:1000});
        if (usersError) console.error("CRM reminder owner unavailable",usersError.message);
        const owner = users?.users.find(user => user.email?.toLowerCase() === "leonardowebster.ja@gmail.com");
        const {data: deleted} = await supabase.from("deleted_crm_meetings").select("external_id");
        const deletedIds = new Set((deleted || []).map(row => row.external_id));
        if (owner) for (const appointment of appointments) {
          if (deletedIds.has(appointment.externalId)) continue;
          const {data: existing,error: lookupError} = await supabase.from("meetings").select("id,origin,modality,closing_status,has_closing").eq("external_id",appointment.externalId).maybeSingle();
          if (lookupError) { console.error("CRM reminder lookup failed",lookupError.message); continue; }
          if (!existing && appointment.status !== "pending") continue;
          // Meetings created in the dashboard remain authoritative there.
          if (existing && existing.origin !== "CRM") continue;
          const payload = {user_id:owner.id,external_id:appointment.externalId,title:appointment.title,client_name:appointment.clientName || appointment.title,client_phone:appointment.clientPhone || null,notify_client:appointment.notifyClient !== false,agenda_category:appointment.agendaCategory || "geral",meeting_type:appointment.meetingType || "reuniao",date:appointment.date,time:appointment.time,duration_minutes:appointment.durationMinutes || 60,responsible:appointment.responsible || "",participants:appointment.participants || [],description:appointment.description || "",status:appointment.status,origin:"CRM",service:appointment.service || "",modality:appointment.modality && appointment.modality !== "nao_informado" ? appointment.modality : existing?.modality || "nao_informado",has_closing:existing?.closing_status === "closed" ? true : existing?.closing_status === "not_closed" ? false : Boolean(appointment.hasClosed) || Boolean(existing?.has_closing)};
          const saved = existing ? await supabase.from("meetings").update(payload).eq("id",existing.id) : await supabase.from("meetings").insert(payload);
          if (saved.error && saved.error.code !== "23505") console.error("CRM reminder sync failed",saved.error.message);
        }
      }
    }

    // New bookings: a separate claim prevents confirmations from consuming the 1h reminder.
    const { data: confirmationSettings } = await supabase.from('meeting_confirmation_settings').select('started_at').eq('id', true).maybeSingle();
    if (confirmationSettings?.started_at) {
      const { data: candidates, error: confirmationError } = await supabase.from('meetings').select('*').eq('status', 'pending').gte('date', todayStr);
      if (confirmationError) console.error('Booking confirmation lookup failed', confirmationError.message);
      const remoteById = new Map((crmAgenda?.appointments || []).map((appointment:any) => [appointment.externalId, appointment]));
      for (const meeting of candidates || []) {
        const remote:any = remoteById.get(meeting.external_id);
        if (!eligibleBookingConfirmation(meeting, remote, confirmationSettings.started_at, todayStr)) continue;
        if (meeting.external_id && (crmError || crmAgenda?.error || remote?.status !== 'pending')) continue;
        const customer = customerMeetingRecipient(meeting, clients || []);
        const websterPhone = teamPhones.get('Leonardo Webster') || PARTICIPANT_PHONES['Leonardo Webster'];
        const recipients = [
          ...(customer ? [{name:'cliente',phone:customer.phone,audience:'customer' as const,message:`✅ *Agendamento confirmado — Avante Digital*\n\nOlá, ${customer.name}! Sua reunião foi agendada.\n\n📅 ${formatDateBR(meeting.date)}\n🕐 ${meeting.time}\n📍 ${meeting.modality === 'online' ? 'Online' : meeting.modality === 'presencial' ? 'Presencial' : 'Modalidade a confirmar'}\n\nVocê também receberá um lembrete 1 hora antes.`}] : []),
          {name:'Leonardo Webster',phone:websterPhone,audience:'internal' as const,message:`✅ *Nova reunião agendada*\n\nCliente: ${meeting.client_name || meeting.title}\n📅 ${formatDateBR(meeting.date)}\n🕐 ${meeting.time}\n📍 ${meeting.modality === 'online' ? 'Online' : meeting.modality === 'presencial' ? 'Presencial' : 'Modalidade a confirmar'}`},
        ];
        for (const recipient of recipients) {
          const {data: claim, error: claimError} = await supabase.from('meeting_confirmation_logs').insert({meeting_id:meeting.id,participant_name:recipient.name,phone:recipient.phone,status:'processing'}).select('id').maybeSingle();
          if (claimError || !claim) continue;
          const internalSummary = recipient.audience === 'internal'
            ? meetingLeadSummary(await loadMeetingLeadSummary(remote?.leadId, Deno.env.get('SOLAIRE_API_KEY')), remote?.description || meeting.description || '')
            : '';
          const result = await sendWhatsApp(recipient.phone, recipient.message + internalSummary, recipient.audience);
          await supabase.from('meeting_confirmation_logs').update({status:result.accepted ? 'sent' : 'error'}).eq('id',claim.id);
        }
      }
    }

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
      if (meeting.origin === "CRM" && !crmError && !crmAgenda?.error && !(crmAgenda?.appointments || []).some((a:any) => a.externalId === meeting.external_id && a.date === todayStr && a.time === meeting.time && a.status === "pending")) continue;
      if (!meeting.time) continue;

      // Parsear horário da reunião (formato HH:MM)
      const [hours, minutes] = meeting.time.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) continue;

      const meetingMinutes = hours * 60 + minutes;
      const diffMinutes = meetingMinutes - brtNowMinutes;

      // Separate recipient key keeps this final notice independent of the 1h reminder.
      if (diffMinutes >= 4 && diffMinutes <= 5 && (meeting.agenda_category === 'reunioes' || meeting.origin === 'CRM')) {
        const phone = teamPhones.get('Leonardo Webster') || PARTICIPANT_PHONES['Leonardo Webster'];
        const {data: claim, error: claimError} = await supabase.from('meeting_reminder_logs')
          .insert({meeting_id:meeting.id,participant_name:'Leonardo Webster · 5min',phone,status:'processing'}).select('id').maybeSingle();
        if (!claimError && claim) {
          const result = await sendWhatsApp(phone, `⏰ *Reunião em 5 minutos*\n\nLeonardo, a reunião com ${meeting.client_name || meeting.title} começa às ${meeting.time}.\n📅 ${formatDateBR(meeting.date)}\n📍 ${meeting.modality === 'online' ? 'Online' : meeting.modality === 'presencial' ? 'Presencial' : 'Modalidade a confirmar'}`, 'internal');
          await supabase.from('meeting_reminder_logs').update({status:result.accepted ? 'sent' : 'error'}).eq('id',claim.id);
          if (result.accepted) sentCount++;
        }
      }

      // Enviar se falta entre 55 e 65 minutos (janela segura para o cron de 5 min)
      if (diffMinutes < 55 || diffMinutes > 65) continue;

      const customer = customerMeetingRecipient(meeting, clients || []);
      if (customer) {
        const { data: claim, error: claimError } = await supabase
          .from("meeting_reminder_logs")
          .insert({ meeting_id: meeting.id, participant_name: "cliente", phone: customer.phone, status: "processing" })
          .select("id").maybeSingle();
        if (!claimError && claim) {
          const message = `⏰ *Lembrete de reunião — Avante Digital*\n\nOlá, ${customer.name}! Sua reunião com a Avante está marcada para daqui a 1 hora.\n\n📅 ${formatDateBR(meeting.date)}\n🕐 ${meeting.time}\n📍 ${meeting.modality === "online" ? "Online" : meeting.modality === "presencial" ? "Presencial" : "Modalidade a confirmar"}\n\nAté breve!`;
          const result = await sendWhatsApp(customer.phone, message, "customer");
          await supabase.from("meeting_reminder_logs").update({ status: result.accepted ? "sent" : "error" }).eq("id", claim.id);
          if (result.accepted) sentCount++;
        }
      }
      const participants: string[] = [...new Set([meeting.responsible, ...(meeting.external_id ? ['Leonardo Webster'] : [])].filter(Boolean))] as string[];

      for (const participantName of participants) {
        const phone = teamPhones.get(participantName) || PARTICIPANT_PHONES[participantName];
        if (!phone) continue;

        // Reserva atômica: o índice único impede duas execuções simultâneas.
        const { data: claim, error: claimError } = await supabase
          .from("meeting_reminder_logs")
          .insert({ meeting_id: meeting.id, participant_name: participantName, phone, status: "processing" })
          .select("id")
          .maybeSingle();
        if (claimError || !claim) continue;

        // Montar mensagem
        const messageText = `⏰ *Lembrete de Reunião*\n\nOlá ${participantName}! Sua reunião "${meeting.title}" está marcada para daqui a 1 hora (${meeting.time}).\n\n📅 Data: ${formatDateBR(meeting.date)}\n📍 Modalidade: ${meeting.modality === "online" ? "Online" : meeting.modality === "presencial" ? "Presencial" : "Modalidade a confirmar"}\n\n${meeting.description ? `📝 ${meeting.description}` : ""}`;

        // Enviar via Evolution API
        const result = await sendWhatsApp(phone, messageText, "internal");
        const success = result.accepted;
        if (!success) console.error(`Meeting reminder delivery failed for ${participantName}.`);

        // Atualizar a reserva com o resultado do envio
        await supabase.from("meeting_reminder_logs").update({ status: success ? "sent" : "error" }).eq("id", claim.id);

        if (success) sentCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Meeting reminder error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
