import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function money(value: unknown): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function prazoLabel(value: string): string {
  if (value === "agendar_agora") return "Quer agendar agora";
  if (value === "15_dias") return "Pretende fazer em até 15 dias";
  if (value === "30_dias") return "Pretende fazer em até 30 dias";
  return value || "Não informado";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { studentId, course } = await req.json();
    if (!studentId || !course) {
      return new Response(JSON.stringify({ error: "studentId and course are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientPhone = Deno.env.get("NEW_STUDENT_NOTIFICATION_PHONE");
    if (!recipientPhone) throw new Error("NEW_STUDENT_NOTIFICATION_PHONE not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: student, error: studentError } = await supabase
      .from("alunos_futuros")
      .select("id,nome,telefone,cpf,itens,observacao")
      .eq("id", studentId)
      .single();
    if (studentError || !student) throw new Error("Cadastro do aluno não encontrado");

    const normalizedCourse = String(course).trim().toLowerCase();
    const items = Array.isArray(student.itens) ? student.itens : [];
    const item = items.find((entry: any) =>
      String(entry?.nome || "").trim().toLowerCase() === normalizedCourse
    );
    if (!item) throw new Error("Curso não encontrado no cadastro do aluno");

    const logKey = `Novo cadastro ${student.id}:${normalizedCourse}`;
    const { data: previousLog } = await supabase
      .from("whatsapp_message_logs")
      .select("id")
      .eq("message_type", "new_student_registration")
      .eq("course_name", logKey)
      .eq("status", "sent")
      .maybeSingle();
    if (previousLog) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = [
      "🔔 Novo cadastro de aluno",
      "",
      `Aluno: ${student.nome}`,
      `Telefone: ${student.telefone}`,
      `Curso: ${item.nome}`,
      `Sinal informado: ${money(item.valor_sinal)}`,
      `Prazo: ${prazoLabel(String(item.prazo || ""))}`,
    ].join("\n");

    const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        phone: recipientPhone,
        messageType: "new_student_registration",
        customText: message,
        studentName: student.nome,
        courseName: logKey,
      }),
    });
    const result = await response.json().catch(() => ({}));

    return new Response(JSON.stringify(result), {
      status: response.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("New student notification error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
