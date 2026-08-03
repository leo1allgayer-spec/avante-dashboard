import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.0/cors";

const REMINDER_WINDOWS_MS: Record<string, number> = {
  reminder_24h: 45 * 60 * 1000,
  reminder_1h: 15 * 60 * 1000,
};

function getCourseDateTime(booking: any): Date | null {
  if (!booking?.date) return null;

  const [year, month, day] = String(booking.date).split("-").map(Number);
  if (!year || !month || !day) return null;

  const normalizedTime = String(booking.time || "").trim().toLowerCase();
  let hour = 8;
  let minute = 30;

  if (normalizedTime.includes("tarde")) {
    hour = 14;
    minute = 0;
  } else if (normalizedTime.includes("manh")) {
    hour = 8;
    minute = 30;
  } else if (/^\d{1,2}:\d{2}$/.test(normalizedTime)) {
    const [parsedHour, parsedMinute] = normalizedTime.split(":").map(Number);
    hour = parsedHour;
    minute = parsedMinute;
  }

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute));
}

function shouldCancelExpiredReminder(msg: any, booking: any, now: Date): boolean {
  if (!["reminder_24h", "reminder_1h"].includes(msg.message_type)) return false;

  const courseDateTime = getCourseDateTime(booking);
  if (courseDateTime && now >= courseDateTime) return true;

  const scheduledFor = new Date(msg.scheduled_for);
  const windowMs = REMINDER_WINDOWS_MS[msg.message_type] || 15 * 60 * 1000;

  return now.getTime() - scheduledFor.getTime() > windowMs;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get("WHATSAPP_SCHEDULER_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");

    if (!expectedSecret) {
      throw new Error("WHATSAPP_SCHEDULER_SECRET not configured");
    }

    if (providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get pending scheduled messages that are due
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const { data: pendingMessages, error } = await supabase
      .from("whatsapp_scheduled_messages")
      .select("*, course_bookings(*)")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (error) {
      throw new Error(`Failed to fetch scheduled messages: ${error.message}`);
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`;
    const sendHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    };

    let processed = 0;

    for (const msg of pendingMessages) {
      const booking = msg.course_bookings;
      if (!booking) {
        // Mark as error if booking not found
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({ status: "error", updated_at: now })
          .eq("id", msg.id);
        continue;
      }

      // Skip if booking is cancelled
      if (booking.course_status === "cancelado" || booking.status !== "confirmed") {
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({ status: "cancelled", updated_at: now })
          .eq("id", msg.id);
        continue;
      }

      if (shouldCancelExpiredReminder(msg, booking, nowDate)) {
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({ status: "cancelled", updated_at: now })
          .eq("id", msg.id);
        continue;
      }

      // For post_course, only send if course_status is "concluído"
      if (msg.message_type === "post_course" && booking.course_status !== "concluído") {
        // Don't send yet — leave as pending if course hasn't concluded,
        // but if course date has passed + 7 hours and still not concluded, skip
        const courseDateTime = getCourseDateTime(booking);
        if (!courseDateTime) {
          await supabase
            .from("whatsapp_scheduled_messages")
            .update({ status: "error", updated_at: now })
            .eq("id", msg.id);
          continue;
        }
        const maxWait = new Date(courseDateTime.getTime() + 12 * 60 * 60 * 1000);
        if (nowDate > maxWait) {
          await supabase
            .from("whatsapp_scheduled_messages")
            .update({ status: "cancelled", updated_at: now })
            .eq("id", msg.id);
          continue;
        }
        // Otherwise skip for now, will be picked up later
        continue;
      }

      try {
        const response = await fetch(sendUrl, {
          method: "POST",
          headers: sendHeaders,
          body: JSON.stringify({
            phone: booking.phone,
            bookingId: booking.id,
            messageType: msg.message_type,
            studentName: booking.student_name,
            courseName: booking.course_name,
          }),
        });

        const result = await response.json();
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({ status: result.success ? "sent" : "error", updated_at: new Date().toISOString() })
          .eq("id", msg.id);

        processed++;
      } catch (err) {
        console.error(`Error sending scheduled message ${msg.id}:`, err);
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({ status: "error", updated_at: new Date().toISOString() })
          .eq("id", msg.id);
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scheduler error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
