import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpsertMetrics, useDeleteMetrics } from "@/hooks/useMetrics";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import type { DailyMetrics } from "@/hooks/useMetrics";

interface MetricsFormProps {
  currentData?: DailyMetrics | null;
}

const sections = [
  {
    title: "Metas",
    fields: [
      { key: "meta_mensal_prevista", label: "Meta Mensal", prefix: "R$" },
      { key: "super_meta_mensal", label: "Super Meta Mensal", prefix: "R$" },
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
    title: "Receita",
    fields: [
      { key: "faturamento_dia", label: "Faturamento do Dia", prefix: "R$" },
      { key: "curso_marcado", label: "Cursos Marcados", prefix: "" },
      { key: "curso_feito", label: "Cursos Feitos", prefix: "" },
    ],
  },
  {
    title: "Aquisição",
    fields: [
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

const MetricsForm = ({ currentData }: MetricsFormProps) => {
  const today = new Date().toISOString().split("T")[0];
  const todayLabel = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  const { mutate, isPending } = useUpsertMetrics();
  const deleteMetrics = useDeleteMetrics();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    meta_mensal_prevista: currentData?.meta_mensal_prevista || 0,
    meta_mensal_realizada: currentData?.meta_mensal_realizada || 0,
    meta_diaria_prevista: currentData?.meta_diaria_prevista || 0,
    meta_diaria_realizada: currentData?.meta_diaria_realizada || 0,
    faturamento_dia: currentData?.faturamento_dia || 0,
    curso_marcado: currentData?.curso_marcado || 0,
    curso_feito: currentData?.curso_feito || 0,
    leads: currentData?.leads || 0,
    custo_por_lead: currentData?.custo_por_lead || 0,
    lead_mql: currentData?.lead_mql || 0,
    custo_por_lead_mql: currentData?.custo_por_lead_mql || 0,
    cac: currentData?.cac || 0,
    roas: currentData?.roas || 0,
    meta_cursos: currentData?.meta_cursos || 0,
    meta_site: currentData?.meta_site || 0,
    meta_negocio_local: currentData?.meta_negocio_local || 0,
    meta_crm: currentData?.meta_crm || 0,
    meta_upsell: currentData?.meta_upsell || 0,
    valor_cursos: currentData?.valor_cursos || 0,
    valor_site: currentData?.valor_site || 0,
    valor_negocio_local: currentData?.valor_negocio_local || 0,
    valor_crm: currentData?.valor_crm || 0,
    valor_upsell: currentData?.valor_upsell || 0,
    super_meta_mensal: currentData?.super_meta_mensal || 0,
    super_meta_diaria: currentData?.super_meta_diaria || 0,
    avaliacao_google: currentData?.avaliacao_google || 0,
  });

  useEffect(() => {
    if (currentData) {
      setForm({
        meta_mensal_prevista: currentData.meta_mensal_prevista || 0,
        meta_mensal_realizada: currentData.meta_mensal_realizada || 0,
        meta_diaria_prevista: currentData.meta_diaria_prevista || 0,
        meta_diaria_realizada: currentData.meta_diaria_realizada || 0,
        faturamento_dia: currentData.faturamento_dia || 0,
        curso_marcado: currentData.curso_marcado || 0,
        curso_feito: currentData.curso_feito || 0,
        leads: currentData.leads || 0,
        custo_por_lead: currentData.custo_por_lead || 0,
        lead_mql: currentData.lead_mql || 0,
        custo_por_lead_mql: currentData.custo_por_lead_mql || 0,
        cac: currentData.cac || 0,
        roas: currentData.roas || 0,
        meta_cursos: currentData.meta_cursos || 0,
        meta_site: currentData.meta_site || 0,
        meta_negocio_local: currentData.meta_negocio_local || 0,
        meta_crm: currentData.meta_crm || 0,
        meta_upsell: currentData.meta_upsell || 0,
        valor_cursos: currentData.valor_cursos || 0,
        valor_site: currentData.valor_site || 0,
        valor_negocio_local: currentData.valor_negocio_local || 0,
        valor_crm: currentData.valor_crm || 0,
        valor_upsell: currentData.valor_upsell || 0,
        super_meta_mensal: currentData.super_meta_mensal || 0,
        super_meta_diaria: currentData.super_meta_diaria || 0,
        avaliacao_google: currentData.avaliacao_google || 0,
      });
    }
  }, [currentData]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(
      { ...form, date: today },
      {
        onSuccess: () => {
          toast({ title: "Métricas salvas com sucesso" });
          setOpen(false);
        },
        onError: (err) => {
          toast({ title: "Erro", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!currentData?.id) return;
    deleteMetrics.mutate(currentData.id, {
      onSuccess: () => {
        toast({ title: "Métricas do dia apagadas!" });
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
          {currentData ? "Atualizar" : "Registrar"} · {todayLabel}
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[88vh] overflow-y-auto sm:max-w-lg p-0 gap-0 border-border/40"
        style={{ background: "hsl(260, 25%, 7%)" }}
      >
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              Métricas · {todayLabel}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/50">
              Preencha os dados do dia para atualizar o dashboard.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
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

            {currentData?.id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2" size="sm" type="button">
                    <Trash2 className="h-3.5 w-3.5" /> Apagar métricas do dia
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar métricas?</AlertDialogTitle>
                    <AlertDialogDescription>Todos os dados de métricas deste dia serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
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
