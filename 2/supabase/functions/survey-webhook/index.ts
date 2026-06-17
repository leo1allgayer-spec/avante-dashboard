import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Convert empty strings to null
const str = (v: any): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
// Convert to integer or null
const int = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const row = {
      nome: str(body.nome) || str(body.nome_completo) || "Anônimo",
      cpf: str(body.cpf),
      cep: str(body.cep),
      cidade: str(body.cidade),
      email: str(body.email),
      instagram: str(body.instagram),
      endereco: str(body.endereco),
      whatsapp: str(body.whatsapp),
      data_curso: str(body.data_curso),
      como_conheceu: str(body.como_conheceu),
      tempo_para_fechar: str(body.tempo_para_fechar),
      conversou_outras_escolas: str(body.conversou_outras_escolas),
      objetivo_principal: str(body.objetivo_principal),
      segmento: str(body.segmento),
      fator_determinante: str(body.fator_determinante),
      dor_principal: str(body.dor_principal),
      consultor: str(body.consultor),
      tempo_atendimento: str(body.tempo_atendimento),
      atendimento_rapido: str(body.atendimento_rapido),
      nota_whatsapp: int(body.nota_whatsapp),
      forma_atendimento: str(body.forma_atendimento),
      motivacao_fechar: str(body.motivacao_fechar),
      valor_curso_opiniao: str(body.valor_curso_opiniao),
      sugestao_atendimento: str(body.sugestao_atendimento),
      indicaria_alguem: str(body.indicaria_alguem),
      nota_indicacao: int(body.nota_indicacao),
    };

    console.log("Inserting row:", JSON.stringify(row));

    const { data, error } = await supabase.from("survey_responses").insert(row).select().single();

    if (error) {
      console.error("Insert error:", error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("survey-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
