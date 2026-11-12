import {sendWhatsAppOnce} from "../_shared/whatsapp-dispatch.ts";
import {sendTaskCompletion} from "../_shared/task-completion-notice.ts";
import {sendCourseInstructorChange} from "../_shared/course-instructor-change-notice.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.0/cors";

async function sendTaskAssignment(req:Request,db:any,body:any){
 const json=(value:any,status=200)=>new Response(JSON.stringify(value),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
 const authorization=req.headers.get('Authorization')||'';
 const token=authorization.replace(/^Bearer\s+/i,'');const {data:auth,error:authError}=await db.auth.getUser(token);
 if(authError||!auth?.user)return json({error:'Entre novamente para enviar o aviso.'},401);
 const userDb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
 const {data:task,error}=await userDb.from('tasks').select('*').eq('id',String(body.taskId||'')).maybeSingle();
 if(error||!task)return json({error:'Tarefa não encontrada ou sem acesso.'},403);
 if(!task.assignee_id)return json({sent:false,reason:'Tarefa sem responsável.'});
 const {data:member,error:memberError}=await db.from('task_assignee_directory').select('display_name,phone').eq('member_id',task.assignee_id).single();
 if(memberError||!member)return json({error:'Responsável não encontrado.'},400);
 if(!/^55[0-9]{10,11}$/.test(member.phone||''))return json({sent:false,reason:`WhatsApp não cadastrado para ${member.display_name}. A tarefa já está disponível no dashboard.`});
 const {data:claim,error:claimError}=await db.from('task_assignment_notifications').update({status:'processing',error_message:null}).eq('task_id',task.id).eq('assignee_id',task.assignee_id).eq('assignment_version',task.assignment_version).eq('status','pending').select('id').maybeSingle();
 if(claimError)return json({error:'Não foi possível reservar o aviso.'},500);
 if(!claim){const {data:existing}=await db.from('task_assignment_notifications').select('status').eq('task_id',task.id).eq('assignment_version',task.assignment_version).maybeSingle();return json({sent:existing?.status==='sent',reason:existing?.status==='sent'?'Aviso já enviado.':'Aviso já processado ou em processamento.'});}
 const due=task.due_date?task.due_date.split('-').reverse().join('/'):'Sem prazo definido';
 const {count}=await db.from('task_attachments').select('id',{count:'exact',head:true}).eq('task_id',task.id);
 const message=[`📋 Nova tarefa para ${member.display_name}`,`Tarefa: ${task.title}`,`Prioridade: ${task.priority}`,`Entrega: ${due}`,task.description?`Descrição: ${task.description.slice(0,1800)}`:'',count?`Anexos: ${count} (disponíveis no dashboard)`:'',`Abrir tarefa: https://dashboard-avante.pages.dev/gestor-tarefas?task=${task.id}`].filter(Boolean).join('\n');
 try{
 const delivery=await sendWhatsAppOnce(db,member.phone,message,'internal','task_assignment',`${task.id}:${task.assignment_version}`);
 await db.from('task_assignment_notifications').update({status:delivery.accepted?'sent':'error',sent_at:delivery.accepted?new Date().toISOString():null,error_message:delivery.accepted?null:delivery.resultText}).eq('id',claim.id);
 if(!delivery.deduplicated)await db.from('whatsapp_message_logs').insert({booking_id:null,phone:member.phone,student_name:member.display_name,course_name:task.title,message_type:'task_assignment',message_text:message,status:delivery.accepted?'sent':'error',error_message:delivery.accepted?null:delivery.resultText,sent_at:delivery.accepted?new Date().toISOString():null});
 return json({sent:delivery.accepted,reason:delivery.accepted?undefined:'O provedor não confirmou o envio do aviso.'});
 }catch(error){await db.from('task_assignment_notifications').update({status:'error',error_message:String(error)}).eq('id',claim.id);return json({error:'Tarefa salva, mas o aviso não foi confirmado.'},500);}
}

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
    if(body.action==='course_instructor_change')return await sendCourseInstructorChange(req,supabase,body,sendWhatsAppOnce);
    if(body.action==='task_completion')return await sendTaskCompletion(req,supabase,body,authorization=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}}),sendWhatsAppOnce);
    if(body.action==='task_assignment')return await sendTaskAssignment(req,supabase,body);
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
        // Every schedule-dependent message already sent belongs to the old
        // date after a reschedule. It must not prevent confirmation, instructor
        // notice or reminders from being sent again with the updated details.
        .filter((messageType) => !rescheduled || ![
          "confirmation",
          "google_manager_notification",
          "reminder_24h",
          "reminder_1h",
          "post_course",
        ].includes(messageType))
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
          signal: AbortSignal.timeout(90000),
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

    // Reuse the internal instructor notice type, now routing Meta to its saved teacher.
    let googleManagerNotified = sentMessageTypes.has("google_manager_notification");
    const teacherPhone = booking.instructor === 'Nicolas' ? '5551998119283' : booking.instructor === 'Henrique' ? '555197152836' : null;
    const isMeta = ['Curso Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online'].includes(booking.course_name);
    const recipient = isMeta ? teacherPhone : String(booking.course_name || '').toLowerCase().includes('google ads') ? '555197152836' : null;
    if (!googleManagerNotified && recipient) {
      const [year,month,day]=booking.date.split('-');
      const time=booking.time==='Manhã'?'08:30':booking.time==='Tarde'?'14:00':booking.time;
      const notice=[`📢 ${rescheduled?'Curso reagendado':'Novo curso marcado'}`,`Professor: ${isMeta?booking.instructor:'Henrique'}`,`Curso: ${booking.course_name}`,`Aluno: ${booking.student_name}`,`Data: ${day}/${month}/${year}`,`Horário: ${time}`,'Consulte o dashboard para ver os detalhes do agendamento.'].join('\n');
      googleManagerNotified=await sendMessageNow('google_manager_notification',recipient,notice);
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
      confirmationSent,
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
