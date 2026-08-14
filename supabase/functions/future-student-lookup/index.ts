import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cleanDigits = (value: unknown) => String(value || "").replace(/\D/g, "");

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { cpf } = await request.json().catch(() => ({}));
    const cpfLimpo = cleanDigits(cpf);
    if (cpfLimpo.length !== 11) {
      return new Response(JSON.stringify({ error: "Informe um CPF com 11 dígitos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: student, error: studentError } = await supabase
      .from("alunos_futuros")
      .select("id,nome,telefone,cpf,curso,itens,valor_sinal")
      .eq("cpf_limpo", cpfLimpo)
      .maybeSingle();
    if (studentError) throw studentError;
    if (!student) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = cleanDigits(student.telefone);
    const [{ data: survey }, { data: bookings }] = await Promise.all([
      supabase
        .from("survey_responses")
        .select("email,instagram,nome,whatsapp")
        .eq("cpf", student.cpf)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("course_bookings")
        .select("student_name,email,phone,instagram,certificate_name,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const booking = (bookings || []).find((row) => cleanDigits(row.phone) === phone);
    const items = Array.isArray(student.itens) ? student.itens : [];
    const signal = items.reduce((total: number, item: Record<string, unknown>) => total + Number(item.valor_sinal || 0), 0)
      || Number(student.valor_sinal || 0);

    return new Response(JSON.stringify({
      found: true,
      studentId: student.id,
      name: student.nome || booking?.student_name || survey?.nome || "",
      phone: phone || cleanDigits(booking?.phone || survey?.whatsapp),
      email: booking?.email || survey?.email || "",
      instagram: booking?.instagram || survey?.instagram || "",
      certificateName: booking?.certificate_name || student.nome || "",
      signalValue: signal,
      course: student.curso || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
