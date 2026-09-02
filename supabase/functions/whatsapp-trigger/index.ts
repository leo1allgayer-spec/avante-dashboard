import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { bookingId, rescheduled = false } = body;

    if (!bookingId) {
      return new Response(JSON.stringify({ error: "bookingId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("course_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status !== "confirmed") {
      return new Response(JSON.stringify({ error: "Booking not confirmed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rescheduled) {
      // Remove every still-pending job from the previous date. The jobs for
      // the current date are rebuilt below from the booking's saved date/time.
      await supabase
        .from("whatsapp_scheduled_messages")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("booking_id", bookingId)
        .eq("status", "pending")
        .in("message_type", ["reminder_24h", "reminder_1h", "post_course"]);
    }

    // Check sent messages so retries do not duplicate confirmations or reminders.
    const { data: existingLogs } = await supabase
      .from("whatsapp_message_logs")
      .select("message_type")
      .eq("booking_id", bookingId)
      .in("status", ["sent", "pending"]);

    const sentMessageTypes = new Set(
      (existingLogs || [])
        .map((log) => log.message_type)
        // A reminder already sent belongs to the old date after a reschedule.
        // It must not prevent the reminders for the new course date.
        .filter((messageType) => !rescheduled || !["reminder_24h", "reminder_1h", "post_course"].includes(messageType))
    );

    // 1. Send immediate confirmation
    const sendUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`;
    const sendHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    };

    const sendMessageNow = async (messageType: string, phone = booking.phone, customText?: string) => {
      if (sentMessageTypes.has(messageType)) return true;

      try {
        const response = await fetch(sendUrl, {
          method: "POST",
          headers: sendHeaders,
          body: JSON.stringify({
            phone,
            bookingId: booking.id,
            messageType,
            customText,
            studentName: booking.student_name,
            courseName: booking.course_name,
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (response.ok) sentMessageTypes.add(messageType);
        return response.ok;
      } catch (error) {
        console.error(`Immediate WhatsApp ${messageType} failed:`, error);
        return false;
      }
    };

    let confirmationSent = sentMessageTypes.has("confirmation");
    if (!confirmationSent) {
      confirmationSent = await sendMessageNow("confirmation");
    }

    // Notify the Google Ads instructor with operational schedule data only.
    let googleManagerNotified = sentMessageTypes.has("google_manager_notification");
    if (!googleManagerNotified && String(booking.course_name || "").toLowerCase().includes("google ads")) {
      const [bookingYear, bookingMonth, bookingDay] = booking.date.split("-");
      const bookingTime = booking.time === "Manhã" ? "08:30" : booking.time === "Tarde" ? "14:00" : booking.time;
      const googleManagerText = [
        "📢 Novo curso de Google Ads marcado",
        `Data: ${bookingDay}/${bookingMonth}/${bookingYear}`,
        `Horário: ${bookingTime}`,
        "Consulte o dashboard para ver os detalhes do agendamento.",
      ].join("\n");
      googleManagerNotified = await sendMessageNow(
        "google_manager_notification",
        "555197152836",
        googleManagerText,
      );
    }
    // 2. Schedule future messages
    // Parse course date and time, adjusting for BRT (UTC-3)
    const [year, month, day] = booking.date.split("-").map(Number);
    let hour = 8, minute = 30;
    if (booking.time === "Tarde") { hour = 14; minute = 0; }
    else if (booking.time === "Manhã") { hour = 8; minute = 30; }
    else if (booking.time && booking.time.includes(":")) {
      const parts = booking.time.split(":").map(Number);
      hour = parts[0]; minute = parts[1];
    }
    // Create date in UTC, adding 3 hours to compensate for BRT (UTC-3)
    const courseDateTimeUTC = new Date(Date.UTC(year, month - 1, day, hour + 3, minute));

    // Load timing settings from DB
    const { data: timingRows } = await supabase
      .from("whatsapp_message_timing")
      .select("*");

    const timingMap: Record<string, { offset_value: number; offset_unit: string; direction: string }> = {};
    for (const row of (timingRows || [])) {
      timingMap[row.message_type] = row;
    }

    function getOffsetMs(messageType: string, defaultMs: number): number {
      const t = timingMap[messageType];
      if (!t) return defaultMs;
      const ms = t.offset_unit === "days"
        ? t.offset_value * 24 * 60 * 60 * 1000
        : t.offset_value * 60 * 60 * 1000;
      return ms;
    }

    const reminder1Offset = getOffsetMs("reminder_24h", 24 * 60 * 60 * 1000);
    const reminder2Offset = getOffsetMs("reminder_1h", 1 * 60 * 60 * 1000);
    const postCourseOffset = getOffsetMs("post_course", 7 * 24 * 60 * 60 * 1000);

    const now = new Date();
    const reminder24hAt = new Date(courseDateTimeUTC.getTime() - reminder1Offset);

    // Inscrições feitas depois do horário do lembrete de 24h recebem as
    // informações importantes imediatamente, junto com a confirmação.
    let reminder24hSentImmediately = false;
    if (courseDateTimeUTC > now && reminder24hAt <= now) {
      reminder24hSentImmediately = await sendMessageNow("reminder_24h");
    }

    const scheduledMessages = [
      ...(!confirmationSent ? [{
        booking_id: bookingId,
        message_type: "confirmation",
        scheduled_for: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
        status: "pending",
      }] : []),
      {
        booking_id: bookingId,
        message_type: "reminder_24h",
        scheduled_for: reminder24hAt.toISOString(),
        status: "pending",
      },
      {
        booking_id: bookingId,
        message_type: "reminder_1h",
        scheduled_for: new Date(courseDateTimeUTC.getTime() - reminder2Offset).toISOString(),
        status: "pending",
      },
      {
        booking_id: bookingId,
        message_type: "post_course",
        scheduled_for: new Date(courseDateTimeUTC.getTime() + postCourseOffset).toISOString(),
        status: "pending",
      },
    ];

    // Filter out past dates
    const validMessages = scheduledMessages.filter(
      (m) => new Date(m.scheduled_for) > now
    );

    if (validMessages.length > 0) {
      // Check for existing scheduled messages to avoid duplicates
      const { data: existingScheduled } = await supabase
        .from("whatsapp_scheduled_messages")
        .select("message_type")
        .eq("booking_id", bookingId)
        .in("status", ["pending"]);

      const existingTypes = new Set((existingScheduled || []).map((s) => s.message_type));
      const newMessages = validMessages.filter((m) => !existingTypes.has(m.message_type));

      if (newMessages.length > 0) {
        await supabase.from("whatsapp_scheduled_messages").insert(newMessages);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      scheduled: validMessages.length,
      reminder24hSentImmediately,
      googleManagerNotified,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WhatsApp trigger error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
