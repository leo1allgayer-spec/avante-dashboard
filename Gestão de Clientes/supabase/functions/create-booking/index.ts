import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_STUDENTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { courseName, date, shift, studentName, email, phone, instagram, certificateName } = body;
    console.log("[create-booking] payload:", { courseName, date, shift, email, studentName });

    // Validate required fields
    if (!courseName || typeof courseName !== "string" || courseName.length > 200) {
      return new Response(JSON.stringify({ error: "Nome do curso inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: "Data inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!shift || (shift !== "Manhã" && shift !== "Tarde")) {
      return new Response(JSON.stringify({ error: "Turno inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!studentName || typeof studentName !== "string" || studentName.trim().length < 2 || studentName.length > 200) {
      return new Response(JSON.stringify({ error: "Nome inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Email inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!phone || typeof phone !== "string" || phone.length < 10 || phone.length > 20) {
      return new Response(JSON.stringify({ error: "Telefone inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Mutual exclusion: Meta Ads and Meta Ads Avançado cannot share the same date+shift
    const EXCLUSIVE_PAIRS: Record<string, string> = {
      "Curso Meta Ads": "Curso Meta Ads Avançado",
      "Curso Meta Ads Avançado": "Curso Meta Ads",
    };
    const siblingCourse = EXCLUSIVE_PAIRS[courseName];
    if (siblingCourse) {
      // Check exception: admin may allow both Meta Ads courses to coexist on this date+shift
      const { data: exceptionRow } = await supabase
        .from("meta_ads_exceptions")
        .select("id")
        .eq("date", date)
        .or(`shift.eq.${shift},shift.is.null`)
        .maybeSingle();
      if (exceptionRow) {
        console.log("[create-booking] sibling check SKIPPED by exception", { date, shift });
      } else {
      const { count: siblingCount } = await supabase
        .from("course_bookings")
        .select("*", { count: "exact", head: true })
        .eq("course_name", siblingCourse)
        .eq("date", date)
        .eq("time", shift)
        .eq("status", "confirmed");
      const { count: siblingSlotCount } = await supabase
        .from("course_slots")
        .select("*", { count: "exact", head: true })
        .eq("course_name", siblingCourse)
        .eq("date", date)
        .eq("time", shift);
      if ((siblingCount || 0) > 0 || (siblingSlotCount || 0) > 0) {
        console.log("[create-booking] BLOCKED by sibling:", { siblingCourse, date, shift, siblingCount, siblingSlotCount });
        return new Response(
          JSON.stringify({ error: `Este turno já está reservado para ${siblingCourse}. Escolha outro horário.` }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      }
    }

    // Find or create slot
    const { data: existingSlot } = await supabase
      .from("course_slots")
      .select("id")
      .eq("course_name", courseName)
      .eq("date", date)
      .eq("time", shift)
      .maybeSingle();

    let slotId: string;
    if (existingSlot) {
      slotId = existingSlot.id;
    } else {
      const { data: newSlot, error: slotErr } = await supabase
        .from("course_slots")
        .insert({ course_name: courseName, date, time: shift, max_students: MAX_STUDENTS })
        .select("id")
        .single();
      if (slotErr || !newSlot) {
        return new Response(JSON.stringify({ error: "Erro ao criar vaga" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      slotId = newSlot.id;
    }

    // Check capacity (ignore cancelled bookings)
    const { count } = await supabase
      .from("course_bookings")
      .select("*", { count: "exact", head: true })
      .eq("slot_id", slotId)
      .eq("status", "confirmed")
      .neq("course_status", "cancelado");

    if ((count || 0) >= MAX_STUDENTS) {
      return new Response(JSON.stringify({ error: "Turno lotado" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert booking
    const bookingId = crypto.randomUUID();
    const { error: insertErr } = await supabase.from("course_bookings").insert({
      id: bookingId,
      slot_id: slotId,
      course_name: courseName,
      student_name: studentName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      instagram: (instagram || "").trim(),
      certificate_name: (certificateName || "").trim() || studentName.trim(),
      date,
      time: shift,
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        return new Response(JSON.stringify({ error: "Você já está agendado neste horário" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Erro ao criar agendamento" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Detecção de agendamento duplicado: mesmo curso + mesmo email ou telefone, em data diferente
    try {
      const normEmail = email.trim().toLowerCase();
      const normPhone = phone.trim();
      const { data: dupes } = await supabase
        .from("course_bookings")
        .select("id, date, time, student_name, email, phone")
        .eq("course_name", courseName)
        .neq("id", bookingId)
        .or(`email.eq.${normEmail},phone.eq.${normPhone}`);

      const otherDates = (dupes || []).filter((b: any) => b.date !== date);
      if (otherDates.length > 0) {
        const ADMIN_PHONE = "5551999692480";
        const fmt = (d: string) => { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; };
        const linhas = otherDates.map((b: any) => `• ${fmt(b.date)} (${b.time})`).join("\n");
        const text = `⚠️ Agendamento duplicado detectado\n\nAluno: ${studentName.trim()}\nEmail: ${normEmail}\nTelefone: ${normPhone}\nCurso: ${courseName}\n\nNovo agendamento: ${fmt(date)} (${shift})\nJá existia em:\n${linhas}`;

        const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`;
        fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            phone: ADMIN_PHONE,
            messageType: "duplicate_alert",
            customText: text,
            studentName: studentName.trim(),
            courseName,
            bookingId,
          }),
        }).catch((e) => console.error("duplicate alert send failed:", e));
        console.log("[create-booking] duplicate alert dispatched");
      }
    } catch (e) {
      console.error("duplicate check error:", e);
    }

    return new Response(JSON.stringify({ bookingId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("create-booking error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
