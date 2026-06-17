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

    // Get pending scheduled messages that are due
    const now = new Date().toISOString();
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
          .update({ status: "error" })
          .eq("id", msg.id);
        continue;
      }

      // Skip if booking is cancelled
      if (booking.course_status === "cancelado" || booking.status !== "confirmed") {
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({ status: "cancelled" })
          .eq("id", msg.id);
        continue;
      }

      // For post_course, only send if course_status is "concluído"
      if (msg.message_type === "post_course" && booking.course_status !== "concluído") {
        // Don't send yet — leave as pending if course hasn't concluded,
        // but if course date has passed + 7 hours and still not concluded, skip
        const [year, month, day] = booking.date.split("-").map(Number);
        const [hour, minute] = booking.time.split(":").map(Number);
        // Adjust for BRT (UTC-3)
        const courseDateTime = new Date(Date.UTC(year, month - 1, day, hour + 3, minute));
        const maxWait = new Date(courseDateTime.getTime() + 12 * 60 * 60 * 1000);
        if (new Date() > maxWait) {
          await supabase
            .from("whatsapp_scheduled_messages")
            .update({ status: "cancelled" })
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
          .update({ status: result.success ? "sent" : "error" })
          .eq("id", msg.id);

        processed++;
      } catch (err) {
        console.error(`Error sending scheduled message ${msg.id}:`, err);
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({ status: "error" })
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
