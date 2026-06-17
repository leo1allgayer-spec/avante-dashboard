import { useSurveyInsights } from "@/hooks/useSurveyInsights";
import { motion } from "framer-motion";
import { Brain, Users, Star, MessageCircle, Clock, Target, TrendingUp, RefreshCw, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const cardStyle = {
  background: "hsl(260, 22%, 9%)",
  border: "1px solid hsl(260, 18%, 14%)",
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const SurveyInsightsPanel = () => {
  const { data: insights, isLoading, error } = useSurveyInsights();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-webhook`;
  const formUrl = `${window.location.origin}/pesquisa`;

  const copyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: `${label} copiado!` });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-5 w-5 text-accent" />
          <h2 className="font-display text-lg font-bold text-foreground">Insights da Pesquisa</h2>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="rounded-2xl p-6" style={cardStyle}>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent" />
          <h2 className="font-display text-lg font-bold text-foreground">Insights da Pesquisa</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Erro ao carregar insights. Verifique se a função está disponível.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent" />
          <h2 className="font-display text-lg font-bold text-foreground">Insights da Pesquisa</h2>
          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">{insights.total_respostas} respostas</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => copyUrl(formUrl, "Link do formulário")}>
            <ExternalLink className="h-3 w-3" /> Link do Form
          </Button>
          <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => copyUrl(webhookUrl, "Webhook URL")}>
            <Copy className="h-3 w-3" /> Webhook
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => queryClient.invalidateQueries({ queryKey: ["survey-insights"] })}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <motion.div variants={item} className="rounded-2xl p-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Respostas</p>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{insights.total_respostas}</p>
        </motion.div>

        <motion.div variants={item} className="rounded-2xl p-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-3.5 w-3.5 text-warning" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">NPS Médio</p>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{insights.nps_medio}<span className="text-sm text-muted-foreground/50">/10</span></p>
        </motion.div>

        <motion.div variants={item} className="rounded-2xl p-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-3.5 w-3.5 text-success" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Nota WhatsApp</p>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{insights.nota_whatsapp_media}<span className="text-sm text-muted-foreground/50">/10</span></p>
        </motion.div>

        <motion.div variants={item} className="rounded-2xl p-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3.5 w-3.5 text-info" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Top Decisão</p>
          </div>
          {Object.entries(insights.tempo_decisao_distribuicao).length > 0 ? (
            <p className="font-display text-sm font-bold text-foreground leading-tight">
              {Object.entries(insights.tempo_decisao_distribuicao).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">-</p>
          )}
        </motion.div>
      </div>

      {/* Distribution bars */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        <motion.div variants={item} className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-3.5 w-3.5 text-accent/60" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Como Conheceram</p>
          </div>
          <div className="space-y-2">
            {Object.entries(insights.top_como_conheceu).sort((a, b) => b[1] - a[1]).map(([key, val]) => {
              const max = Math.max(...Object.values(insights.top_como_conheceu));
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-foreground/80 truncate">{key}</span>
                    <span className="text-muted-foreground tabular-nums">{val}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(val / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={item} className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-accent/60" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Objetivos</p>
          </div>
          <div className="space-y-2">
            {Object.entries(insights.top_objetivos).sort((a, b) => b[1] - a[1]).map(([key, val]) => {
              const max = Math.max(...Object.values(insights.top_objetivos));
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-foreground/80 truncate">{key}</span>
                    <span className="text-muted-foreground tabular-nums">{val}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(val / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* AI Summary */}
      <motion.div variants={item} className="rounded-2xl p-5 relative overflow-hidden" style={cardStyle}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-[0.05] blur-[60px] pointer-events-none bg-accent" />
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-accent" />
          <p className="text-xs font-semibold text-accent uppercase tracking-wider">Análise da IA</p>
        </div>
        <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
          {insights.resumo_ia}
        </div>
      </motion.div>
    </div>
  );
};

export default SurveyInsightsPanel;
