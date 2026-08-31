import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.0/cors";

const normalizePhone = (value: string) => String(value || "").replace(/\D/g, "");
const normalizeText = (value: string) => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const courseName = String(body.courseName || "").trim();
    const date = String(body.date || "").trim();
    const shift = String(body.shift || "").trim();
    const studentName = String(body.studentName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = normalizePhone(body.phone);
    const cpf = normalizePhone(body.cpf);
    const instagram = String(body.instagram || "").trim();
    const certificateName = String(body.certificateName || "").trim() || studentName;
    const action = String(body.action || "check");

    if (!courseName || !studentName || (cpf.length !== 11 && (!email || phone.length < 10))) {
      return new Response(JSON.stringify({ error: "Dados insuficientes para verificar o agendamento." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let registeredName = "";
    let registeredPhone = "";
    if (cpf.length === 11) {
      const { data: registration } = await supabase
        .from("alunos_futuros")
        .select("nome,telefone")
        .eq("cpf_limpo", cpf)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      registeredName = normalizeText(registration?.nome || "");
      registeredPhone = normalizePhone(registration?.telefone || "");
    }

    const { data: activeBookings, error: bookingError } = await supabase
      .from("course_bookings")
      .select("id,slot_id,student_name,course_name,email,phone,date,time,status,course_status")
      .eq("course_name", courseName)
      .eq("status", "confirmed")
      .not("course_status", "in", "(cancelado,concluido,concluído)")
      .order("created_at", { ascending: false });
    if (bookingError) throw bookingError;

    const requestName = normalizeText(studentName);
    const booking = (activeBookings || []).find((item) => {
      const bookingName = normalizeText(item.student_name);
      const bookingPhone = normalizePhone(item.phone);
      const nameMatches = !!requestName && bookingName === requestName;
      const cpfMatches = cpf.length === 11 && (
        (!!registeredName && bookingName === registeredName) ||
        (!!registeredPhone && bookingPhone === registeredPhone)
      );
      const contactMatches = item.email?.toLowerCase() === email && bookingPhone === phone;
      return nameMatches || cpfMatches || contactMatches;
    });

    if (!booking) {
      return new Response(JSON.stringify({ exists: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentBooking = {
      bookingId: booking.id,
      studentName: booking.student_name,
      courseName: booking.course_name,
      date: booking.date,
      shift: booking.time,
    };

    if (action === "check") {
      return new Response(JSON.stringify({ exists: true, currentBooking }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "keep") {
      return new Response(JSON.stringify({ exists: true, kept: true, currentBooking }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action !== "reschedule" || !date || !shift) {
      return new Response(JSON.stringify({ error: "Nova data ou turno não informado." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.date === date && booking.time === shift) {
      return new Response(JSON.stringify({ exists: true, kept: true, currentBooking }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let { data: slot } = await supabase
      .from("course_slots")
      .select("id,max_students")
      .eq("course_name", courseName)
      .eq("date", date)
      .eq("time", shift)
      .limit(1)
      .maybeSingle();

    if (!slot) {
      const { data: createdSlot, error: slotError } = await supabase
        .from("course_slots")
        .insert({ course_name: courseName, date, time: shift, max_students: 5 })
        .select("id,max_students")
        .single();
      if (slotError) throw slotError;
      slot = createdSlot;
    }

    const { count, error: countError } = await supabase
      .from("course_bookings")
      .select("id", { count: "exact", head: true })
      .eq("slot_id", slot.id)
      .eq("status", "confirmed")
      .neq("id", booking.id)
      .not("course_status", "in", "(cancelado,concluido,concluído)");
    if (countError) throw countError;
    if ((count || 0) >= (slot.max_students || 5)) {
      return new Response(JSON.stringify({ error: "O novo horário ficou lotado. Escolha outra data." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("course_bookings")
      .update({
        slot_id: slot.id,
        date,
        time: shift,
        student_name: studentName,
        email,
        phone,
        instagram: instagram || null,
        certificate_name: certificateName,
        status: "confirmed",
        course_status: "confirmado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    if (updateError) throw updateError;

    const functionHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    };
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-trigger`, {
      method: "POST",
      headers: functionHeaders,
      body: JSON.stringify({ bookingId: booking.id, rescheduled: true }),
    }).catch((error) => console.error("Reminder rebuild failed:", error));

    return new Response(JSON.stringify({
      exists: true,
      rescheduled: true,
      bookingId: booking.id,
      previousBooking: currentBooking,
      currentBooking: { ...currentBooking, studentName, date, shift },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Reschedule booking error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});