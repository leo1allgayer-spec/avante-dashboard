import { useState, useEffect } from "react";
import { Client, MANAGERS, WEEKDAYS } from "@/types/clients/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddClientDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (client: Client) => void | Promise<void>;
  hideContractValues?: boolean;
  hideContractAmounts?: boolean;
  initialClient?: Partial<Client>;
  title?: string;
  submitLabel?: string;
  area?: 'meta_ads'|'google_ads';
  onAreaChange?: (area:'meta_ads'|'google_ads')=>void;
  managerOptions?: readonly string[];
  summaryOnly?: boolean;
}

export function AddClientDialog({ open, onClose, onAdd, hideContractValues = false, hideContractAmounts = false, summaryOnly = false, managerOptions = MANAGERS, initialClient, title='Novo Cliente', submitLabel='Adicionar Cliente', area='meta_ads', onAreaChange }: AddClientDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error,setError]=useState("");
  const [form, setForm] = useState({
    name: "",
    company: "",
    instagram: "",
    manager: managerOptions[0] || MANAGERS[0],
    monthlyBudget: 0,
    paymentDate: 1,
    commissionValue: 0,
    contractValue: 0,
    contractType: "MRR" as "MRR" | "TCV",
    contractMonths: 1,
    reportDay: WEEKDAYS[0],
  });

  useEffect(()=>{if(open&&initialClient)setForm({name:initialClient.name||'',company:initialClient.company||'',instagram:initialClient.instagram||'',manager:initialClient.manager||managerOptions[0]||MANAGERS[0],monthlyBudget:initialClient.monthlyBudget||0,paymentDate:initialClient.paymentDate||1,commissionValue:initialClient.commissionValue||0,contractValue:initialClient.contractValue||0,contractType:initialClient.contractType||'MRR',contractMonths:initialClient.contractMonths||1,reportDay:initialClient.reportDay||WEEKDAYS[0]});},[open]);
  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Informe o nome do cliente."); return; }
    if (!form.manager.trim()) { setError("Selecione o gestor responsável."); return; }
    if (!form.reportDay.trim()) { setError("Selecione o dia da entrega do relatório."); return; }
    setError("");
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const newClient: Client = {
      ...initialClient,
      id: Date.now().toString(),
      name: form.name,
      company: form.company,
      instagram: form.instagram,
      manager: form.manager,
      status: "Ativo",
      paymentStatus: "a receber",
      monthlyBudget: form.monthlyBudget,
      paymentDate: form.paymentDate,
      commissionValue: form.commissionValue,
      contractValue: form.contractValue,
      contractType: form.contractType,
      contractMonths: Math.max(1, form.contractMonths),
      monthlyContractValue: form.contractType === "TCV" ? form.contractValue / Math.max(1, form.contractMonths) : form.contractValue,
      lastBalanceDate: today,
      balanceNote: "",
      lastReportDate: today,
      reportDay: form.reportDay,
      lastAccountUpdate: today,
      startDate: today,
      notes: [],
    };
    try {
      await onAdd(newClient);
      setForm({ name: "", company: "", instagram: "", manager: managerOptions[0] || MANAGERS[0], monthlyBudget: 0, paymentDate: 1, commissionValue: 0, contractValue: 0, contractType: "MRR", contractMonths: 1, reportDay: WEEKDAYS[0] });
      onClose();
    } catch(error) {
      setError(error instanceof Error?error.message:"Não foi possível adicionar o cliente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-h-[90dvh] overflow-y-auto" data-lenis-prevent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {onAreaChange&&<div className="space-y-1"><p className="text-sm text-muted-foreground">Gestão de destino</p><Select value={area} onValueChange={v=>onAreaChange(v as 'meta_ads'|'google_ads')}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="meta_ads">Clientes · Meta Ads</SelectItem><SelectItem value="google_ads">Clientes · Google Ads</SelectItem></SelectContent></Select></div>}
          <Input placeholder="Nome do cliente *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-input border-border" />
          <Input placeholder="Empresa (opcional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="bg-input border-border" />
          <Input placeholder="Instagram (ex: @usuario)" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="bg-input border-border" />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Gestor responsável *</label>
            <Select value={form.manager} onValueChange={(v) => setForm({ ...form, manager: v })}>
              <SelectTrigger className="bg-input border-border" aria-label="Gestor responsável"><SelectValue placeholder="Selecione o gestor" /></SelectTrigger>
              <SelectContent>{managerOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Dia da entrega do relatório *</label>
            <Select value={form.reportDay} onValueChange={(v) => setForm({ ...form, reportDay: v })}>
              <SelectTrigger className="bg-input border-border" aria-label="Dia da entrega do relatório"><SelectValue placeholder="Selecione o dia" /></SelectTrigger>
              <SelectContent>{WEEKDAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!summaryOnly && <div className={hideContractValues ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2"}>
            <Input type="number" placeholder="Orçamento" value={form.monthlyBudget || ""} onChange={(e) => setForm({ ...form, monthlyBudget: Number(e.target.value) })} className="bg-input border-border" />
            {!hideContractValues && <Select value={form.contractType} onValueChange={(v: "MRR" | "TCV") => setForm({ ...form, contractType: v })}>
              <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Tipo do contrato" /></SelectTrigger>
              <SelectContent><SelectItem value="MRR">MRR — valor mensal</SelectItem><SelectItem value="TCV">TCV — valor total</SelectItem></SelectContent>
            </Select>}
            {!hideContractValues && <div className="space-y-1"><label className="text-xs text-muted-foreground">Duração do contrato (meses)</label><Input type="number" min={1} aria-label="Duração do contrato em meses" placeholder="Ex.: 6 meses" value={form.contractMonths || ""} onChange={(e) => setForm({ ...form, contractMonths: Math.max(1, Number(e.target.value)) })} className="bg-input border-border" /></div>}
            {!hideContractValues && !hideContractAmounts && <Input type="number" placeholder={form.contractType === "TCV" ? "Valor total do contrato" : "Valor mensal"} value={form.contractValue || ""} onChange={(e) => setForm({ ...form, contractValue: Number(e.target.value) })} className="bg-input border-border" />}
          </div>}
          {!summaryOnly && !hideContractValues && !hideContractAmounts && <p className="text-xs text-muted-foreground">
            Mensal: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(form.contractType === "TCV" ? form.contractValue / Math.max(1, form.contractMonths) : form.contractValue)} · Total do período: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(form.contractType === "TCV" ? form.contractValue : form.contractValue * Math.max(1, form.contractMonths))}
          </p>}
          {!summaryOnly && <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Dia de vencimento</label><Input type="number" aria-label="Dia de vencimento do pagamento" placeholder="Dia (1–31)" min={1} max={31} value={form.paymentDate || ""} onChange={(e) => setForm({ ...form, paymentDate: Number(e.target.value) })} className="bg-input border-border" /></div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Comissão</label><Input type="number" aria-label="Comissão" placeholder="Valor da comissão" value={form.commissionValue || ""} onChange={(e) => setForm({ ...form, commissionValue: Number(e.target.value) })} className="bg-input border-border" /></div>
          </div>}
          {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} className="w-full" disabled={saving}>
            {saving ? "Salvando..." : submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
