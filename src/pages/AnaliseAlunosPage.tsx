import { useSurveyResponses, useSurveyInsights, useUpdateSurveyResponse, useDeleteSurveyResponse, type SurveyResponse } from "@/hooks/useSurveyInsights";
import { useClients } from "@/hooks/useClients";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Users, DollarSign, Star, ShieldCheck, RefreshCw, Copy, ExternalLink, Loader2, ChevronDown, CalendarIcon, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import CountUp from "react-countup";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

const COLORS = [
  "hsl(174, 75%, 48%)", "hsl(270, 70%, 60%)", "hsl(36, 95%, 55%)",
  "hsl(210, 65%, 55%)", "hsl(310, 60%, 55%)", "hsl(152, 60%, 42%)",
  "hsl(4, 72%, 56%)", "hsl(260, 50%, 70%)",
];

const cardStyle = { background: "hsl(260, 22%, 9%)", border: "1px solid hsl(260, 18%, 14%)" };

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-lg" style={{ background: "hsl(260, 22%, 12%)", border: "1px solid hsl(260, 18%, 18%)" }}>
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

const fieldLabels: Record<string, string> = {
  nome: "Nome",
  cpf: "CPF",
  cep: "CEP",
  cidade: "Cidade",
  email: "E-mail",
  instagram: "Instagram",
  endereco: "Endereço",
  whatsapp: "WhatsApp",
  data_curso: "Data do Curso",
  como_conheceu: "Como conheceu",
  tempo_para_fechar: "Tempo para decidir",
  conversou_outras_escolas: "Conversou com outras escolas",
  objetivo_principal: "Objetivo principal",
  segmento: "Segmento",
  fator_determinante: "Fator determinante",
  dor_principal: "Dor principal",
  consultor: "Consultor",
  tempo_atendimento: "Tempo de atendimento",
  atendimento_rapido: "Atendimento rápido",
  nota_whatsapp: "Nota WhatsApp",
  nota_curso: "Nota do curso",
  forma_atendimento: "Forma de atendimento",
  motivacao_fechar: "Motivação para fechar",
  valor_curso_opiniao: "Opinião sobre o valor",
  sugestao_atendimento: "Sugestão de atendimento",
  indicaria_alguem: "Indicaria alguém",
  nota_indicacao: "Nota de indicação (NPS)",
};

const fieldOrder = [
  "nome", "cpf", "whatsapp", "email", "instagram", "cep", "cidade", "endereco",
  "data_curso", "consultor", "como_conheceu", "tempo_para_fechar",
  "conversou_outras_escolas", "objetivo_principal", "segmento",
  "fator_determinante", "dor_principal", "tempo_atendimento",
  "atendimento_rapido", "nota_whatsapp", "nota_curso", "forma_atendimento",
  "motivacao_fechar", "valor_curso_opiniao", "sugestao_atendimento",
  "indicaria_alguem", "nota_indicacao",
];

const AlunoExpandRow = ({
  r,
  index,
  onEdit,
  onDelete,
  isDeleting,
}: {
  r: SurveyResponse;
  index: number;
  onEdit: (r: SurveyResponse) => void;
  onDelete: (r: SurveyResponse) => void;
  isDeleting: boolean;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(260, 18%, 14%)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-muted-foreground/50 w-6 shrink-0">{index + 1}</span>
          <span className="font-medium text-foreground truncate">{r.nome}</span>
          <span className="text-xs text-muted-foreground/60 hidden sm:inline">{r.whatsapp || r.email || ""}</span>
          {r.consultor && <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full hidden md:inline">{r.consultor}</span>}
          {r.nota_whatsapp != null && <span className="text-[10px] text-warning hidden md:inline">⭐ {r.nota_whatsapp}/10</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(r);
            }}
            aria-label={`Editar avaliação de ${r.nome}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            disabled={isDeleting}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(r);
            }}
            aria-label={`Excluir avaliação de ${r.nome}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
              {fieldOrder.map((key) => {
                const val = r[key];
                if (val === null || val === undefined || val === "") return null;
                return (
                  <div key={key} className="py-1.5 border-b border-border/10">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">{fieldLabels[key] || key}</p>
                    <p className="text-sm text-foreground/90 mt-0.5 break-words">{String(val)}</p>
                  </div>
                );
              })}
              <div className="py-1.5 border-b border-border/10">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Data de resposta</p>
                <p className="text-sm text-foreground/90 mt-0.5">{r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : "—"}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AnaliseAlunosPage = () => {
  const { data: responses, isLoading: loadingResponses } = useSurveyResponses();
  const { data: insights, isLoading: loadingInsights } = useSurveyInsights();
  const { data: clients, isLoading: loadingClients } = useClients();
  const updateSurveyResponse = useUpdateSurveyResponse();
  const deleteSurveyResponse = useDeleteSurveyResponse();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [editingResponse, setEditingResponse] = useState<SurveyResponse | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-webhook`;
  const formUrl = `${window.location.origin}/pesquisa`;
  const copyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: `${label} copiado!` });
  };

  const isLoading = loadingResponses || loadingInsights || loadingClients;
  const allData = responses || [];
  const data = useMemo(() => {
    return allData.filter((r: any) => {
      if (!r.created_at) return true;
      const d = new Date(r.created_at);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });
  }, [allData, dateFrom, dateTo]);
  const clientsData = clients || [];
  const total = data.length;

  const openEditResponse = (response: SurveyResponse) => {
    const nextForm: Record<string, string> = {};
    fieldOrder.forEach((key) => {
      const val = response[key as keyof SurveyResponse];
      nextForm[key] = val === null || val === undefined ? "" : String(val);
    });
    setEditingResponse(response);
    setEditForm(nextForm);
  };

  const handleSaveResponse = () => {
    if (!editingResponse) return;
    const payload = fieldOrder.reduce<Record<string, string | number | null>>((acc, key) => {
      const value = editForm[key]?.trim() ?? "";
      if (key === "nota_whatsapp" || key === "nota_curso" || key === "nota_indicacao") {
        acc[key] = value === "" ? null : Number(value);
      } else {
        acc[key] = value === "" ? null : value;
      }
      return acc;
    }, {});
    if (!payload.nome) {
      toast({ title: "Nome obrigatório", description: "Preencha o nome do aluno antes de salvar.", variant: "destructive" });
      return;
    }
    updateSurveyResponse.mutate(
      { id: editingResponse.id, ...payload },
      {
        onSuccess: () => {
          toast({ title: "Avaliação atualizada!" });
          setEditingResponse(null);
          setEditForm({});
        },
        onError: (err) => toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDeleteResponse = (response: SurveyResponse) => {
    if (!window.confirm(`Excluir a avaliação de ${response.nome}?`)) return;
    deleteSurveyResponse.mutate(response.id, {
      onSuccess: () => toast({ title: "Avaliação excluída" }),
      onError: (err) => toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" }),
    });
  };

  // Faturamento from clients table
  const totalFaturamento = clientsData.reduce((s, r) => s + Number(r.valor || 0), 0);
  const totalClientes = clientsData.length;
  const ticketMedio = totalClientes > 0 ? totalFaturamento / totalClientes : 0;

  // Notas
  const notasWhatsapp = data.filter((r: any) => r.nota_whatsapp != null).map((r: any) => r.nota_whatsapp);
  const notaMedia = notasWhatsapp.length > 0 ? notasWhatsapp.reduce((a: number, b: number) => a + b, 0) / notasWhatsapp.length : 0;

  const notasIndicacao = data.filter((r: any) => r.nota_indicacao != null).map((r: any) => r.nota_indicacao);
  const npsMedia = notasIndicacao.length > 0 ? notasIndicacao.reduce((a: number, b: number) => a + b, 0) / notasIndicacao.length : 0;

  const exclusivos = data.filter((r: any) => r.conversou_outras_escolas === "Não").length;
  const taxaExclusividade = total > 0 ? (exclusivos / total) * 100 : 0;

  // Distributions from survey
  const countBy = (key: string) => {
    const map: Record<string, number> = {};
    data.forEach((r: any) => { if (r[key]) map[r[key]] = (map[r[key]] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const origemData = countBy("como_conheceu").map(([name, value]) => ({ name: name.replace("Vi um anúncio nas redes sociais", "Anúncio nas redes").replace("Um amigo me indicou", "Indicação de amigo").replace("Já conhecia a escola", "Já conhecia").replace("Vi no Instagram ou TikTok", "Instagram/TikTok"), value }));
  const tempoDecisao = countBy("tempo_para_fechar").map(([name, value]) => ({ name: name.replace("Fechei no mesmo dia", "Mesmo dia").replace("Levei alguns dias pra decidir", "Alguns dias").replace("Pensei por mais de uma semana", "+1 semana").replace("Pensei por mais de 30 dias", "+30 dias").replace("Pensei por mais de 60 dias", "+60 dias"), value }));
  const objetivos = countBy("objetivo_principal").map(([name, value]) => ({ name: name.replace("Aprender pra aplicar no meu negócio", "Aplicar no negócio").replace("Mudar de profissão / começar na área", "Mudar de profissão").replace("Aumentar minhas vendas", "Aumentar vendas").replace("Trabalhar com gestão de tráfego pra outras empresas", "Gestão p/ empresas"), value }));
  const valorOpiniao = countBy("valor_curso_opiniao").map(([name, value]) => ({ name, value }));

  // Consultores from clients (has valor)
  const consultorMap: Record<string, { count: number; faturamento: number }> = {};
  clientsData.forEach((r) => {
    const c = (r.consultor || "Não identificado").toUpperCase().trim();
    if (!consultorMap[c]) consultorMap[c] = { count: 0, faturamento: 0 };
    consultorMap[c].count++;
    consultorMap[c].faturamento += Number(r.valor || 0);
  });
  const consultorRanking = Object.entries(consultorMap)
    .map(([name, v]) => ({ name, atendimentos: v.count, faturamento: v.faturamento }))
    .sort((a, b) => b.atendimentos - a.atendimentos);
  const consultorChartData = consultorRanking.slice(0, 8);
  const consultorFatChartData = consultorRanking.slice(0, 8);

  // Nota distribution
  const notasDist: Record<number, number> = {};
  notasWhatsapp.forEach((n: number) => { notasDist[n] = (notasDist[n] || 0) + 1; });
  const notasChartData = Object.entries(notasDist).map(([nota, count]) => ({ nota: `${nota}⭐`, count: Number(count) })).sort((a, b) => parseInt(a.nota) - parseInt(b.nota));

  return (
    <PageTransition>
      <DashboardLayout
        title="📊 Análise de Alunos"
        subtitle="Métricas completas de vendas, atendimento e performance"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("text-xs gap-1.5 h-8", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="h-3 w-3" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("text-xs gap-1.5 h-8", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="h-3 w-3" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
              </PopoverContent>
            </Popover>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                Limpar
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => copyUrl(formUrl, "Link do formulário")}>
              <ExternalLink className="h-3 w-3" /> Formulário
            </Button>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => copyUrl(webhookUrl, "Webhook")}>
              <Copy className="h-3 w-3" /> Webhook
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["survey-responses"] });
              queryClient.invalidateQueries({ queryKey: ["survey-insights"] });
              queryClient.invalidateQueries({ queryKey: ["clients"] });
            }}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
            <Dialog open={!!editingResponse} onOpenChange={(open) => { if (!open) setEditingResponse(null); }}>
              <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto border-border/40 bg-card">
                <DialogHeader>
                  <DialogTitle>Editar avaliação</DialogTitle>
                  <DialogDescription>Atualize os dados da resposta selecionada.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fieldOrder.map((key) => {
                    const isLong = ["dor_principal", "motivacao_fechar", "sugestao_atendimento", "valor_curso_opiniao"].includes(key);
                    const isNumber = key === "nota_whatsapp" || key === "nota_curso" || key === "nota_indicacao";
                    return (
                      <div key={key} className={cn("space-y-1.5", isLong && "sm:col-span-2")}>
                        <Label className="text-xs text-muted-foreground">{fieldLabels[key] || key}</Label>
                        {isLong ? (
                          <Textarea
                            value={editForm[key] || ""}
                            onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                            className="bg-secondary/30 border-border/30 min-h-20"
                          />
                        ) : (
                          <Input
                            type={isNumber ? "number" : "text"}
                            min={isNumber ? 0 : undefined}
                            max={isNumber ? 10 : undefined}
                            value={editForm[key] || ""}
                            onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                            className="bg-secondary/30 border-border/30"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditingResponse(null)}>Cancelar</Button>
                  <Button onClick={handleSaveResponse} disabled={updateSurveyResponse.isPending}>
                    {updateSurveyResponse.isPending ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* KPI Cards - 6 cards */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <motion.div variants={item} className="rounded-2xl p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-3.5 w-3.5 text-accent" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Faturamento Total</p>
                </div>
                <p className="font-display text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  <CountUp end={totalFaturamento} duration={1.5} prefix="R$ " separator="." decimal="," />
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">{totalClientes} alunos/leads</p>
              </motion.div>

              <motion.div variants={item} className="rounded-2xl p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Ticket Médio</p>
                </div>
                <p className="font-display text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  <CountUp end={ticketMedio} duration={1.5} prefix="R$ " separator="." decimal="," decimals={2} />
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">Por aluno</p>
              </motion.div>

              <motion.div variants={item} className="rounded-2xl p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-3.5 w-3.5 text-info" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Total de Alunos</p>
                </div>
                <p className="font-display text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  <CountUp end={totalClientes} duration={1.5} />
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">{total} respostas pesquisa</p>
              </motion.div>

              <motion.div variants={item} className="rounded-2xl p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-3.5 w-3.5 text-warning" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Nota Média</p>
                </div>
                <p className="font-display text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  <CountUp end={notaMedia} duration={1.5} decimals={2} />
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">Satisfação (0-10)</p>
              </motion.div>

              <motion.div variants={item} className="rounded-2xl p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-3.5 w-3.5 text-accent" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">NPS Médio</p>
                </div>
                <p className="font-display text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  <CountUp end={npsMedia} duration={1.5} decimals={1} />
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">Indicação (0-10)</p>
              </motion.div>

              <motion.div variants={item} className="rounded-2xl p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Exclusividade</p>
                </div>
                <p className="font-display text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  <CountUp end={taxaExclusividade} duration={1.5} decimals={1} suffix="%" />
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">Não conversaram c/ concorrentes</p>
              </motion.div>
            </div>

            {/* Charts Row 1: Origem + Consultores Atendimentos */}
            <div className="grid gap-3 sm:gap-5 grid-cols-1 lg:grid-cols-2">
              <motion.div variants={item} className="rounded-2xl p-5" style={cardStyle}>
                <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  🌐 Origem dos Alunos
                </h3>
                {origemData.length > 0 ? (
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={origemData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}>
                          {origemData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 min-w-[140px]">
                      {origemData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-foreground/70 truncate">{d.name}: {total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
              </motion.div>

              <motion.div variants={item} className="rounded-2xl p-5" style={cardStyle}>
                <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  👥 Atendimentos por Consultor
                </h3>
                {consultorChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={consultorChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 18%, 14%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(260, 10%, 50%)" }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(260, 10%, 50%)" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="atendimentos" fill="hsl(174, 75%, 48%)" radius={[4, 4, 0, 0]} name="Atendimentos" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
              </motion.div>
            </div>

            {/* Charts Row 2: Tempo de Decisão + Notas */}
            <div className="grid gap-3 sm:gap-5 grid-cols-1 lg:grid-cols-2">
              <motion.div variants={item} className="rounded-2xl p-5" style={cardStyle}>
                <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  ⏱️ Tempo de Decisão
                </h3>
                {tempoDecisao.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={tempoDecisao}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 18%, 14%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(260, 10%, 50%)" }} angle={-15} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(260, 10%, 50%)" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} name="Alunos" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
              </motion.div>

              <motion.div variants={item} className="rounded-2xl p-5" style={cardStyle}>
                <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  ⭐ Distribuição de Notas
                </h3>
                {notasChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={notasChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 18%, 14%)" />
                      <XAxis dataKey="nota" tick={{ fontSize: 10, fill: "hsl(260, 10%, 50%)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(260, 10%, 50%)" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="count" stroke="hsl(36, 95%, 55%)" strokeWidth={2} dot={{ r: 5, fill: "hsl(36, 95%, 55%)" }} name="Quantidade" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
              </motion.div>
            </div>

            {/* Charts Row 3: Faturamento por Consultor + Objetivos */}
            <div className="grid gap-3 sm:gap-5 grid-cols-1 lg:grid-cols-2">
              <motion.div variants={item} className="rounded-2xl p-5" style={cardStyle}>
                <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  💰 Faturamento por Consultor
                </h3>
                {consultorFatChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={consultorFatChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 18%, 14%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(260, 10%, 50%)" }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(260, 10%, 50%)" }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="faturamento" fill="hsl(270, 70%, 60%)" radius={[4, 4, 0, 0]} name="Faturamento" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
              </motion.div>

              <motion.div variants={item} className="rounded-2xl p-5" style={cardStyle}>
                <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  🎯 Objetivos dos Alunos
                </h3>
                {objetivos.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={objetivos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 18%, 14%)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(260, 10%, 50%)" }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: "hsl(260, 10%, 50%)" }} width={120} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="hsl(210, 65%, 55%)" radius={[0, 4, 4, 0]} name="Alunos" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
              </motion.div>
            </div>

            {/* Ranking de Consultores */}
            <motion.div variants={item} className="rounded-2xl p-5 overflow-hidden" style={cardStyle}>
              <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                📋 Ranking de Consultores
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Consultor</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atendimentos</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultorRanking.map((c, i) => (
                      <tr key={c.name} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                        <td className="py-2.5 px-3 text-muted-foreground/60">{i + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-foreground">{c.name}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-foreground">{c.atendimentos}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-foreground">{formatCurrency(c.faturamento)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Estatísticas Gerais */}
            <motion.div variants={item} className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                📈 Estatísticas Gerais
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Total de Alunos</p>
                  <p className="font-display text-xl font-bold text-foreground">{totalClientes}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Faturamento Total</p>
                  <p className="font-display text-xl font-bold text-foreground">{formatCurrency(totalFaturamento)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Ticket Médio</p>
                  <p className="font-display text-xl font-bold text-foreground">{formatCurrency(ticketMedio)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Nota Média</p>
                  <p className="font-display text-xl font-bold text-foreground">{notaMedia.toFixed(2)} ⭐</p>
                </div>
              </div>
            </motion.div>

            {/* Opinião sobre Valor */}
            <motion.div variants={item} className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                💰 Opinião sobre o Valor
              </h3>
              {valorOpiniao.length > 0 ? (
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={valorOpiniao} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}>
                        {valorOpiniao.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 min-w-[100px]">
                    {valorOpiniao.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                        <span className="text-foreground/70">{d.name}: {d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
            </motion.div>

            {/* Lista de Alunos - Expandível */}
            <motion.div variants={item} className="rounded-2xl p-5 overflow-hidden" style={cardStyle}>
              <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                📝 Lista Completa de Alunos ({data.length})
              </h3>
              <div className="space-y-1">
                {data.map((r: SurveyResponse, i: number) => (
                  <AlunoExpandRow
                    key={r.id}
                    r={r}
                    index={i}
                    onEdit={openEditResponse}
                    onDelete={handleDeleteResponse}
                    isDeleting={deleteSurveyResponse.isPending}
                  />
                ))}
              </div>
              {data.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno cadastrado</p>}
            </motion.div>

            {/* AI Summary */}
            {insights?.resumo_ia && (
              <motion.div variants={item} className="rounded-2xl p-5 relative overflow-hidden" style={cardStyle}>
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-[0.05] blur-[60px] pointer-events-none bg-accent" />
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-accent" />
                  <h3 className="text-xs font-semibold text-accent uppercase tracking-wider">Análise da IA — Insights Mastigados</h3>
                </div>
                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {insights.resumo_ia.replace(/#{1,6}\s?/g, "").replace(/\*{1,2}/g, "").replace(/---/g, "").replace(/- \*\*/g, "- ").trim()}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </DashboardLayout>
    </PageTransition>
  );
};

export default AnaliseAlunosPage;
