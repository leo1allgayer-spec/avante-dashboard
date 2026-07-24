import { useState } from "react";
import { Client, MANAGERS, WEEKDAYS } from "@/types/clients/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddClientDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (client: Client) => void | Promise<void>;
}

export function AddClientDialog({ open, onClose, onAdd }: AddClientDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    instagram: "",
    manager: MANAGERS[0],
    monthlyBudget: 0,
    paymentDate: 1,
    commissionValue: 0,
    contractValue: 0,
    reportDay: WEEKDAYS[0],
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const newClient: Client = {
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
      setForm({ name: "", company: "", instagram: "", manager: MANAGERS[0], monthlyBudget: 0, paymentDate: 1, commissionValue: 0, contractValue: 0, reportDay: WEEKDAYS[0] });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome do cliente *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-input border-border" />
          <Input placeholder="Empresa (opcional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="bg-input border-border" />
          <Input placeholder="Instagram (ex: @usuario)" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="bg-input border-border" />
          <Select value={form.manager} onValueChange={(v) => setForm({ ...form, manager: v })}>
            <SelectTrigger className="bg-input border-border">
              <SelectValue placeholder="Gestor" />
            </SelectTrigger>
            <SelectContent>
              {MANAGERS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={form.reportDay} onValueChange={(v) => setForm({ ...form, reportDay: v })}>
            <SelectTrigger className="bg-input border-border">
              <SelectValue placeholder="Dia do relatório" />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Orçamento" value={form.monthlyBudget || ""} onChange={(e) => setForm({ ...form, monthlyBudget: Number(e.target.value) })} className="bg-input border-border" />
            <Input type="number" placeholder="Contrato" value={form.contractValue || ""} onChange={(e) => setForm({ ...form, contractValue: Number(e.target.value) })} className="bg-input border-border" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" placeholder="Dia pgto" min={1} max={31} value={form.paymentDate || ""} onChange={(e) => setForm({ ...form, paymentDate: Number(e.target.value) })} className="bg-input border-border" />
            <Input type="number" placeholder="Comissão" value={form.commissionValue || ""} onChange={(e) => setForm({ ...form, commissionValue: Number(e.target.value) })} className="bg-input border-border" />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Adicionar Cliente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
