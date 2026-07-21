import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatLocalDate, useMetricsByDate, useUpsertMetrics, useDeleteMetrics } from "@/hooks/useMetrics";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calculator, Loader2, Trash2 } from "lucide-react";
import type { DailyMetrics } from "@/hooks/useMetrics";

interface MetricsFormProps {
  currentData?: DailyMetrics | null;
}

const sections = [
  {
    title: "Metas",
    fields: [
      { key: "meta_mensal_prevista", label: "Meta Mensal", prefix: "R$" },
      { key: "super_meta_mensal", label: "Super Meta", prefix: "R$" },
      { key: "meta_diaria_prevista", label: "Meta Diária", prefix: "R$" },
      { key: "super_meta_diaria", label: "Super Meta Diária", prefix: "R$" },
      { key: "meta_mensal_realizada", label: "Meta Mensal Realizada", prefix: "R$" },
      { key: "meta_diaria_realizada", label: "Meta Diária Realizada", prefix: "R$" },
    ],
  },
  {
    title: "Metas por Categoria — Quantidade",
    fields: [
      { key: "meta_cursos", label: "Cursos", prefix: "" },
      { key: "meta_site", label: "Site", prefix: "" },
      { key: "meta_negocio_local", label: "Negócio Local", prefix: "" },
      { key: "meta_crm", label: "CRM", prefix: "" },
      { key: "meta_upsell", label: "Upsell", prefix: "" },
    ],
  },
  {
    title: "Metas por Categoria — Valor Mensal",
    fields: [
      { key: "valor_cursos", label: "Cursos", prefix: "R$" },
      { key: "valor_site", label: "Site", prefix: "R$" },
      { key: "valor_negocio_local", label: "Negócio Local", prefix: "R$" },
      { key: "valor_crm", label: "CRM", prefix: "R$" },
      { key: "valor_upsell", label: "Upsell", prefix: "R$" },
    ],
  },
  {
    title: "Aquisição",
    fields: [
      { key: "ads", label: "Investido ADS", prefix: "R$" },
      { key: "leads", label: "Leads", prefix: "" },
      { key: "lead_mql", label: "Leads MQL", prefix: "" },
      { key: "custo_por_lead", label: "Custo por Lead", prefix: "R$" },
      { key: "custo_por_lead_mql", label: "Custo por MQL", prefix: "R$" },
      { key: "cac", label: "CAC", prefix: "R$" },
      { key: "roas", label: "ROAS", prefix: "" },
    ],
  },
  {
    title: "Google",
    fields: [
      { key: "avaliacao_google", label: "Avaliações do Google", prefix: "" },
    ],
  },
];

const createEmptyForm = (data?: DailyMetrics | null) => ({
  ads: data?.ads || 0,
  meta_mensal_prevista: data?.meta_mensal_prevista || 0,
  meta_mensal_realizada: data?.meta_mensal_realizada || 0,
  meta_diaria_prevista: data?.meta_diaria_prevista || 0,
  meta_diaria_realizada: data?.meta_diaria_realizada || 0,
  faturamento_marcado: data?.faturamento_marcado || 0,
  faturamento_dia: data?.faturamento_dia || 0,
  curso_marcado: data?.curso_marcado || 0,
  curso_feito: data?.curso_feito || 0,
  leads: data?.leads || 0,
  custo_por_lead: data?.custo_por_lead || 0,
  lead_mql: data?.lead_mql || 0,
  custo_por_lead_mql: data?.custo_por_lead_mql || 0,
  cac: data?.cac || 0,
  roas: data?.roas || 0,
  meta_cursos: data?.meta_cursos || 0,
  meta_site: data?.meta_site || 0,
  meta_negocio_local: data?.meta_negocio_local || 0,
  meta_crm: data?.meta_crm || 0,
  meta_upsell: data?.meta_upsell || 0,
  valor_cursos: data?.valor_cursos || 0,
  valor_site: data?.valor_site || 0,
  valor_negocio_local: data?.valor_negocio_local || 0,
  valor_crm: data?.valor_crm || 0,
  valor_upsell: data?.valor_upsell || 0,
  super_meta_mensal: data?.super_meta_mensal || 0,
  super_meta_diaria: data?.super_meta_diaria || 0,
  avaliacao_google: data?.avaliacao_google || 0,
});

const formatDateLabel = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
};

const MetricsForm = ({ currentData }: MetricsFormProps) => {
  const today = formatLocalDate(new Date());
  const yesterday = formatLocalDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const { mutate, isPending } = useUpsertMetrics();
  const deleteMetrics = useDeleteMetrics();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const { data: selectedDateData, isLoading: selectedDateLoading } = useMetricsByDate(selectedDate);
  const activeData = selectedDateData ?? (selectedDate === today ? currentData : null);
  const selectedDateLabel = formatDateLabel(selectedDate);

  const [form, setForm] = useState(createEmptyForm(currentData));

  useEffect(() => {
    if (!open) return;
    setForm(createEmptyForm(activeData));
  }, [activeData, open, selectedDate]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleCalculateCosts = () => {
    setForm((prev) => {
      const ads = Number(prev.ads || 0);
      const leads = Number(prev.leads || 0);
      const mql = Number(prev.lead_mql || 0);
      const cursosFeitos = Number(prev.curso_feito || 0);
      const receita = Number(prev.faturamento_dia || 0) + Number(prev.faturamento_marcado || 0);
      return {
        ...prev,
        custo_por_lead: leads > 0 ? Number((ads / leads).toFixed(2)) : 0,
        custo_por_lead_mql: mql > 0 ? Number((ads / mql).toFixed(2)) : 0,
        cac: cursosFeitos > 0 ? Number((ads / cursosFeitos).toFixed(2)) : 0,
        roas: ads > 0 ? Number((receita / ads).toFixed(2)) : 0,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(
      { ...form, date: selectedDate },
      {
        onSuccess: () => {
          toast({ title: "Métricas salvas com sucesso", description: selectedDateLabel });
          setOpen(false);
        },
        onError: (err) => {
          toast({ title: "Erro", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!activeData?.id) return;
    deleteMetrics.mutate(activeData.id, {
      onSuccess: () => {
        toast({ title: "Métricas apagadas", description: selectedDateLabel });
        setOpen(false);
      },
      onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="h-9 px-4 text-[13px] font-medium rounded-lg transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
          style={{
            background: "hsl(var(--accent))",
            color: "hsl(var(--accent-foreground))",
          }}
        >
          {activeData ? "Atualizar" : "Registrar"} métricas
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[88vh] overflow-hidden sm:max-w-lg p-0 gap-0 border-border/40"
        style={{ background: "hsl(260, 25%, 7%)" }}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              Métricas · {selectedDateLabel}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/50">
              Escolha a data, preencha os dados e salve para atualizar os filtros do dashboard.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pr-4 space-y-5 max-h-[calc(88vh-110px)] overflow-y-auto overscroll-contain">
          <div className="rounded-xl border border-border/30 bg-secondary/20 p-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground/60">Data do lançamento</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || today)}
                  className="bg-secondary/30 border-border/30 text-sm h-9 focus:border-accent/40"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDate(today)}>Hoje</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDate(yesterday)}>Ontem</Button>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full gap-2"
              onClick={handleCalculateCosts}
            >
              <Calculator className="h-3.5 w-3.5" />
              Calcular CPL, CAC e ROAS
            </Button>
          </div>

          {selectedDateLoading && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando métricas da data...
            </div>
          )}

          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-semibold mb-3">
                {section.title}
              </p>
              <div className={`grid gap-3 ${section.fields.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {section.fields.map(({ key, label, prefix }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground/60">{label}</Label>
                    <div className="relative">
                      {prefix && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground/30 pointer-events-none select-none">
                          {prefix}
                        </span>
                      )}
                      <Input
                        type="number"
                        step="any"
                        value={form[key as keyof typeof form]}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className={`${prefix ? "pl-9" : ""} bg-secondary/30 border-border/30 text-sm h-9 focus:border-accent/40 transition-colors`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-1 space-y-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-10 rounded-lg text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              style={{
                background: "hsl(var(--accent))",
                color: "hsl(var(--accent-foreground))",
              }}
            >
              {isPending ? "Salvando..." : "Salvar métricas"}
            </button>

            {activeData?.id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2" size="sm" type="button">
                    <Trash2 className="h-3.5 w-3.5" /> Apagar métricas desta data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar métricas?</AlertDialogTitle>
                    <AlertDialogDescription>Todos os dados de métricas de {selectedDateLabel} serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Apagar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MetricsForm;
