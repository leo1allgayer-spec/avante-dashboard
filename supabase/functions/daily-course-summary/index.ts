import { sendWhatsAppOnce } from "../_shared/whatsapp-dispatch.ts";
import { courseLocation } from "../_shared/course-location.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Booking = {
  id: string;
  instructor?: string | null;
  course_name: string;
  course_status?: string | null;
  date: string;
  phone: string;
  status?: string | null;
  student_name: string;
  time: string;
};

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "").replace(/\/manager$/i, "");
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  return digits;
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getBrtDate(offsetDays: number): string {
  const now = new Date();
  const brtNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  brtNow.setDate(brtNow.getDate() + offsetDays);
  const y = brtNow.getFullYear();
  const m = String(brtNow.getMonth() + 1).padStart(2, "0");
  const d = String(brtNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeLabel(time: string): string {
  const normalized = time.trim().toLowerCase();
  if (normalized.includes("manh")) return "08:30";
  if (normalized.includes("tarde")) return "14:00";
  return time;
}

function isMetaCourse(booking: Booking): boolean {
  return booking.course_name.toLowerCase().includes("meta");
}

function isInstructorCourse(booking: Booking): boolean {
  return isMetaCourse(booking) || booking.course_name === "Curso em Turma";
}

function isActiveBooking(booking: Booking): boolean {
  const values = [booking.status, booking.course_status].map((v) => String(v || "").toLowerCase());
  return !values.some((value) =>
    value.includes("cancel") ||
    value.includes("conclu") ||
    value.includes("done")
  );
}

function buildMessage(recipientName: string, targetDate: string, bookings: Booking[]): string {
  const courseWord = bookings.length === 1 ? "curso" : "cursos";
  const courseLabel = bookings[0]?.course_name === "Curso em Turma" ? "Curso em Turma" : "Meta Ads";
  const location = courseLocation(bookings[0]?.course_name);
  const lines = bookings
    .sort((a, b) => timeLabel(a.time).localeCompare(timeLabel(b.time)))
    .map((booking) => `• ${timeLabel(booking.time)} — ${booking.course_name}\nAluno: ${booking.student_name}`);

  return [
    `Olá ${recipientName}! 👋`,
    "",
    `Lembrete: amanhã (${formatDateBR(targetDate)}) você tem ${bookings.length} ${courseWord} de ${courseLabel} agendados:`,
    "",
    lines.join("\n\n"),
    location ? `📍 Local do curso:\n${location}` : "",
    "",
    "Bom curso! 🚀",
  ].join("\n");
}

function buildNoCoursesMessage(recipientName: string, targetDate: string): string {
  return [
    `Olá ${recipientName}! 👋`,
    "",
    `Amanhã (${formatDateBR(targetDate)}) não há cursos de Meta Ads agendados.`,
    "",
    "Bom descanso! 😉",
  ].join("\n");
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expectedSecret = Deno.env.get("DAILY_COURSE_SUMMARY_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");

    if (!expectedSecret) {
      throw new Error("DAILY_COURSE_SUMMARY_SECRET not configured");
    }

    if (providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetDate = body.date || getBrtDate(1);


    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("course_bookings")
      .select("*")
      .eq("date", targetDate);

    if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);

    const active = ((data || []) as Booking[]).filter(booking=>isInstructorCourse(booking)&&isActiveBooking(booking));
    const deliveries=[];
    for (const [recipientName,recipientPhone] of [['Nicolas','5551998119283'],['Henrique','555197152836']]) {
      const teacherBookings=active.filter(booking=>booking.instructor===recipientName);
      const groups=[
        {label:'Meta Ads',bookings:teacherBookings.filter(isMetaCourse)},
        {label:'Curso em Turma',bookings:teacherBookings.filter(booking=>booking.course_name==='Curso em Turma')},
      ].filter(group=>group.bookings.length>0);
      for(const group of groups){
        const logCourseName=`${group.label} ${targetDate} · ${recipientName}`;
        const {data:existingLog,error:logError}=await supabase.from('whatsapp_message_logs').select('id').eq('message_type','daily_course_summary').eq('course_name',logCourseName).eq('phone',formatPhone(recipientPhone)).limit(1).maybeSingle();
        if(logError)throw logError;
        if(existingLog){deliveries.push({teacher:recipientName,course:group.label,skipped:true});continue;}
        const messageText=buildMessage(recipientName,targetDate,group.bookings);
        const delivery=await sendWhatsAppOnce(supabase,formatPhone(recipientPhone),messageText,'internal','daily_course_summary',logCourseName);
        if(!delivery.deduplicated)await supabase.from('whatsapp_message_logs').insert({booking_id:null,phone:formatPhone(recipientPhone),student_name:recipientName,course_name:logCourseName,message_type:'daily_course_summary',message_text:messageText,status:delivery.accepted?'sent':'error',error_message:delivery.accepted?null:delivery.resultText,sent_at:delivery.accepted?new Date().toISOString():null});
        deliveries.push({teacher:recipientName,course:group.label,count:group.bookings.length,sent:delivery.accepted});
      }
    }
    return new Response(JSON.stringify({success:deliveries.every(result=>result.skipped||result.sent),date:targetDate,deliveries}),{headers:{...corsHeaders,'Content-Type':'application/json'}});

  } catch (error) {
    console.error("Daily course summary error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
