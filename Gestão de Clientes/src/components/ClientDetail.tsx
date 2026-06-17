import { useState } from "react";
import { Client, getAlertStatus, getRetentionMonths, formatCurrency, MANAGERS } from "@/types/client";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Instagram, Plus, Building2, User, Calendar, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
  onUpdate: (client: Client) => void;
}

export function ClientDetail({ client, onBack, onUpdate }: ClientDetailProps) {
  const [noteText, setNoteText] = useState("");

  const updateField = (field: keyof Client, value: any) => {
    onUpdate({ ...client, [field]: value });
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      text: noteText.trim(),
    };
    onUpdate({ ...client, notes: [newNote, ...client.notes] });
    setNoteText("");
  };

  const retention = getRetentionMonths(client.startDate);

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div>{children}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {client.company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {client.company}
              </span>
            )}
            <a
              href={`https://instagram.com/${client.instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Instagram className="h-3.5 w-3.5" /> {client.instagram}
            </a>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            client.status === "Ativo" ? "bg-status-ok status-ok" : "bg-status-warn status-warn"
          }`}
        >
          {client.status}
        </span>
        <span className="text-primary font-semibold">{retention} meses</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Info */}
        <InfoCard title="Dados do Cliente">
          <Field label="Gestor Responsável">
            <Select value={client.manager} onValueChange={(v) => updateField("manager", v)}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANAGERS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data de Início">
            <Input
              type="date"
              value={client.startDate}
              onChange={(e) => updateField("startDate", e.target.value)}
              className="bg-input border-border"
            />
          </Field>
        </InfoCard>

        {/* Financial */}
        <InfoCard title="Financeiro">
          <Field label="Orçamento Mensal">
            <Input
              type="number"
              value={client.monthlyBudget}
              onChange={(e) => updateField("monthlyBudget", Number(e.target.value))}
              className="bg-input border-border"
            />
          </Field>
          <Field label="Dia de Pagamento">
            <Input
              type="number"
              min={1}
              max={31}
              value={client.paymentDate}
              onChange={(e) => updateField("paymentDate", Number(e.target.value))}
              className="bg-input border-border"
            />
          </Field>
          <Field label="Comissão">
            <Input
              type="number"
              value={client.commissionValue}
              onChange={(e) => updateField("commissionValue", Number(e.target.value))}
              className="bg-input border-border"
            />
          </Field>
        </InfoCard>

        {/* Operations */}
        <InfoCard title="Operacional">
          <Field label="Última Adição de Saldo">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={client.lastBalanceDate}
                onChange={(e) => updateField("lastBalanceDate", e.target.value)}
                className="bg-input border-border flex-1"
              />
              <StatusIndicator status={getAlertStatus(client.lastBalanceDate)} />
            </div>
          </Field>
          <Field label="Observação do Saldo">
            <Input
              value={client.balanceNote}
              onChange={(e) => updateField("balanceNote", e.target.value)}
              className="bg-input border-border"
              placeholder="Ex: R$2.000 adicionado"
            />
          </Field>
          <Field label="Último Relatório">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={client.lastReportDate}
                onChange={(e) => updateField("lastReportDate", e.target.value)}
                className="bg-input border-border flex-1"
              />
              <StatusIndicator status={getAlertStatus(client.lastReportDate)} />
            </div>
          </Field>
          <Field label="Última Atualização da Conta">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={client.lastAccountUpdate}
                onChange={(e) => updateField("lastAccountUpdate", e.target.value)}
                className="bg-input border-border flex-1"
              />
              <StatusIndicator status={getAlertStatus(client.lastAccountUpdate)} />
            </div>
          </Field>
        </InfoCard>

        {/* Resumo */}
        <InfoCard title="Resumo Financeiro">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Orçamento</div>
              <div className="text-lg font-bold text-primary">{formatCurrency(client.monthlyBudget)}</div>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Comissão</div>
              <div className="text-lg font-bold text-status-ok">{formatCurrency(client.commissionValue)}</div>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Pgto</div>
              <div className="text-lg font-bold">Dia {client.paymentDate}</div>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Retenção</div>
              <div className="text-lg font-bold text-primary">{retention} meses</div>
            </div>
          </div>
        </InfoCard>
      </div>

      {/* Notes */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Anotações & Observações</h3>
        <div className="flex gap-2">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Adicionar uma anotação..."
            className="bg-input border-border flex-1 min-h-[60px]"
          />
          <Button onClick={addNote} className="self-end">
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {client.notes.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma anotação ainda.</p>
          )}
          {client.notes.map((note) => (
            <div key={note.id} className="bg-secondary rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">{note.date}</div>
              <div className="text-sm">{note.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
