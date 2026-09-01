import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cleanDigits = (value: unknown) => String(value || "").replace(/\D/g, "");

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { cpf, course } = await request.json().catch(() => ({}));
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
      .select("id,nome,telefone,cpf,curso,itens,valor_sinal,data_nascimento,email,instagram,cep,cidade,endereco,nome_certificado")
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
        .select("email,instagram,nome,whatsapp,data_nascimento,cep,cidade,endereco")
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
    const courseItem = course ? items.find((item: Record<string, unknown>) => item.nome === course) : null;
    const registeredCourse = !course || Boolean(courseItem) || student.curso === course;
    const signal = courseItem
      ? Number((courseItem as Record<string, unknown>).valor_sinal || 0)
      : items.reduce((total: number, item: Record<string, unknown>) => total + Number(item.valor_sinal || 0), 0)
        || Number(student.valor_sinal || 0);

    return new Response(JSON.stringify({
      found: true,
      studentId: student.id,
      registeredCourse,
      name: student.nome || booking?.student_name || survey?.nome || "",
      phone: phone || cleanDigits(booking?.phone || survey?.whatsapp),
      birthDate: student.data_nascimento || survey?.data_nascimento || "",
      email: student.email || booking?.email || survey?.email || "",
      instagram: student.instagram || booking?.instagram || survey?.instagram || "",
      cep: student.cep || survey?.cep || "",
      city: student.cidade || survey?.cidade || "",
      address: student.endereco || survey?.endereco || "",
      certificateName: student.nome_certificado || booking?.certificate_name || student.nome || "",
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
