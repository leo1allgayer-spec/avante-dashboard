import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all survey responses
    const { data: responses, error } = await supabase
      .from("survey_responses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!responses || responses.length === 0) {
      return new Response(JSON.stringify({
        total_respostas: 0,
        nps_medio: 0,
        nota_whatsapp_media: 0,
        tempo_decisao_distribuicao: {},
        top_dores: [],
        top_motivos_fechamento: [],
        top_objetivos: {},
        top_como_conheceu: {},
        valor_opiniao: {},
        resumo_ia: "Nenhuma resposta ainda. Compartilhe o formulário com seus alunos!",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Calculate metrics
    const total = responses.length;
    const npsValues = responses.filter(r => r.nota_indicacao != null).map(r => r.nota_indicacao);
    const nps_medio = npsValues.length > 0 ? npsValues.reduce((a, b) => a + b, 0) / npsValues.length : 0;

    const whatsappValues = responses.filter(r => r.nota_whatsapp != null).map(r => r.nota_whatsapp);
    const nota_whatsapp_media = whatsappValues.length > 0 ? whatsappValues.reduce((a, b) => a + b, 0) / whatsappValues.length : 0;

    // Distributions
    const countBy = (arr: any[], key: string) => {
      const map: Record<string, number> = {};
      arr.forEach(r => { if (r[key]) map[r[key]] = (map[r[key]] || 0) + 1; });
      return map;
    };

    const tempo_decisao_distribuicao = countBy(responses, "tempo_para_fechar");
    const top_objetivos = countBy(responses, "objetivo_principal");
    const top_como_conheceu = countBy(responses, "como_conheceu");
    const valor_opiniao = countBy(responses, "valor_curso_opiniao");

    // Text fields for AI
    const dores = responses.map(r => r.dor_principal).filter(Boolean);
    const motivos = responses.map(r => r.fator_determinante).filter(Boolean);
    const motivacoes = responses.map(r => r.motivacao_fechar).filter(Boolean);
    const sugestoes = responses.map(r => r.sugestao_atendimento).filter(Boolean);

    // Call AI for summary
    let resumo_ia = "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && total > 0) {
      try {
        const prompt = `Você é um analista de dados de uma escola de marketing digital chamada Avante Digital.
Analise os dados abaixo de ${total} respostas de pesquisa pós-venda e gere um resumo executivo conciso em português.

Dados:
- NPS médio: ${nps_medio.toFixed(1)}/10
- Nota WhatsApp média: ${nota_whatsapp_media.toFixed(1)}/10
- Como conheceram: ${JSON.stringify(top_como_conheceu)}
- Tempo de decisão: ${JSON.stringify(tempo_decisao_distribuicao)}
- Objetivos: ${JSON.stringify(top_objetivos)}
- Opinião sobre valor: ${JSON.stringify(valor_opiniao)}
- Principais dores (textos livres): ${JSON.stringify(dores.slice(0, 30))}
- Motivos de fechamento: ${JSON.stringify(motivos.slice(0, 30))}
- Motivações: ${JSON.stringify(motivacoes.slice(0, 30))}
- Sugestões: ${JSON.stringify(sugestoes.slice(0, 20))}

Gere:
1. **Resumo geral** (2-3 frases)
2. **Top 3 dores dos alunos** (bullet points)
3. **Top 3 motivos que fizeram fechar** (bullet points)
4. **Jornada de compra típica** (tempo médio, canal principal)
5. **Pontos de melhoria** baseado nas sugestões
6. **Insight estratégico** (1 frase acionável)

Use texto puro sem markdown, sem ##, sem **, sem ---, sem bullets com *. Use apenas quebras de linha e números para organizar.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Você é um analista de dados especializado em marketing digital e jornada do cliente." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          resumo_ia = aiData.choices?.[0]?.message?.content || "Não foi possível gerar análise.";
        } else {
          resumo_ia = "Análise IA temporariamente indisponível.";
        }
      } catch {
        resumo_ia = "Erro ao gerar análise IA.";
      }
    } else {
      resumo_ia = "Configure a chave de IA para gerar insights automáticos.";
    }

    const top_dores = dores.slice(0, 10);
    const top_motivos_fechamento = motivos.slice(0, 10);

    return new Response(JSON.stringify({
      total_respostas: total,
      nps_medio: Math.round(nps_medio * 10) / 10,
      nota_whatsapp_media: Math.round(nota_whatsapp_media * 10) / 10,
      tempo_decisao_distribuicao,
      top_dores,
      top_motivos_fechamento,
      top_objetivos,
      top_como_conheceu,
      valor_opiniao,
      resumo_ia,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("survey-insights error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
