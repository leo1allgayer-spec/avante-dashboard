import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NICOLAS_PHONE = "5551998119283";

const dateLabel = (date: string) => {
  const [year, month, day] = date.split("-");
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(parsed);
  return `${weekday}, ${day}/${month}/${year}`;
};

const timeLabel = (time: string) => time.slice(0, 5);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const bookingId = String(body?.bookingId || "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let query = supabase
      .from("support_notification_jobs")
      .select("id,booking_id,message_type,attempts")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(50);
    if (bookingId) query = query.eq("booking_id", bookingId);

    const { data: jobs, error: jobsError } = await query;
    if (jobsError) throw jobsError;

    let sent = 0;
    for (const job of jobs || []) {
      const { data: claimed } = await supabase
        .from("support_notification_jobs")
        .update({ status: "processing", attempts: Number(job.attempts || 0) + 1 })
        .eq("id", job.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      try {
        const { data: booking, error: bookingError } = await supabase
          .from("support_bookings")
          .select("id,student_id,student_name,student_phone,booking_date,start_time,status")
          .eq("id", job.booking_id)
          .single();
        if (bookingError || !booking) throw new Error("Agendamento não encontrado");
        if (booking.status !== "agendado") {
          await supabase.from("support_notification_jobs").update({ status: "cancelled" }).eq("id", job.id);
          continue;
        }

        let studentPhone = booking.student_phone || "";
        if (!studentPhone && booking.student_id) {
          const { data: student } = await supabase
            .from("alunos_futuros")
            .select("telefone")
            .eq("id", booking.student_id)
            .maybeSingle();
          studentPhone = student?.telefone || "";
        }
        if (!studentPhone) throw new Error("Telefone do aluno não encontrado");

        const when = `${dateLabel(booking.booking_date)} às ${timeLabel(booking.start_time)}`;
        let phone = studentPhone;
        let message = "";
        if (job.message_type === "student_confirmation") {
          message = [`Olá, ${booking.student_name}! 👋`, "", "Sua aula de suporte foi agendada com sucesso.", `📅 ${when}`, "", "Você receberá outro aviso 1 hora antes."].join("\n");
        } else if (job.message_type === "student_reminder_1h") {
          message = [`Olá, ${booking.student_name}! 👋`, "", "Sua aula de suporte começa em 1 hora.", `📅 ${when}`, "", "Até breve!"].join("\n");
        } else {
          phone = NICOLAS_PHONE;
          message = ["🔔 Nova aula de suporte agendada", "", `Aluno: ${booking.student_name}`, `Telefone: ${studentPhone}`, `Data: ${when}`].join("\n");
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            phone,
            messageType: `support_${job.message_type}`,
            customText: message,
            studentName: booking.student_name,
            courseName: `Suporte:${booking.id}:${job.message_type}`,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result?.success === false) throw new Error(result?.error || "Falha no envio do WhatsApp");

        await supabase.from("support_notification_jobs").update({
          status: "sent", sent_at: new Date().toISOString(), last_error: null,
        }).eq("id", job.id);
        sent += 1;
      } catch (error) {
        await supabase.from("support_notification_jobs").update({
          status: "pending",
          last_error: error instanceof Error ? error.message : String(error),
        }).eq("id", job.id);
      }
    }

    return json({ success: true, processed: (jobs || []).length, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Support notification error:", message);
    return json({ error: message }, 500);
  }
});
