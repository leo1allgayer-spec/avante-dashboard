import { useState } from "react";
import { Client, getAlertStatus, getRetentionMonths, formatCurrency, getMonthlyContractValue, getTotalContractValue, MANAGERS } from "@/types/clients/client";
import { StatusIndicator } from "@/components/clients/StatusIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Instagram, Plus, Building2, User, Calendar, DollarSign, Copy, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientReports } from "@/components/clients/ClientReports";

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
  onUpdate: (client: Client) => void;
  hideContractValues?: boolean;
  managerOptions?: readonly string[];
}

export function ClientDetail({ client, onBack, onUpdate, hideContractValues = false, managerOptions = MANAGERS }: ClientDetailProps) {
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
  const intakeUrl = client.intakeToken ? `${window.location.origin}/cadastro-cliente/${client.intakeToken}` : "";

  const copyIntakeLink = async () => {
    if (!intakeUrl) return;
    await navigator.clipboard.writeText(intakeUrl);
  };

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

      <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Link para o cliente preencher</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{intakeUrl || "Gerando link individual..."}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!intakeUrl} onClick={() => void copyIntakeLink()}><Copy className="mr-2 h-4 w-4" />Copiar link</Button>
          <Button variant="outline" disabled={!intakeUrl} onClick={() => window.open(intakeUrl, "_blank", "noopener,noreferrer")}><ExternalLink className="h-4 w-4" /></Button>
        </div>
      </div>

      <Tabs defaultValue="cadastro" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cadastro">Cadastro e contrato</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>
        <TabsContent value="cadastro">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoCard title="Informações fornecidas pelo cliente">
              <Field label="Nome do responsável"><Input value={client.responsibleName || ""} onChange={(e) => updateField("responsibleName", e.target.value)} className="bg-input border-border" /></Field>
              <Field label="Nome da empresa"><Input value={client.company} onChange={(e) => updateField("company", e.target.value)} className="bg-input border-border" /></Field>
              <Field label="Dados da empresa para contrato"><Textarea value={client.contractCompanyData || ""} onChange={(e) => updateField("contractCompanyData", e.target.value)} className="bg-input border-border min-h-24" placeholder="Razão social, CNPJ, endereço e demais dados para o contrato" /></Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="E-mail"><Input type="email" value={client.email || ""} onChange={(e) => updateField("email", e.target.value)} className="bg-input border-border" /></Field>
                <Field label="Telefone"><Input value={client.phone || ""} onChange={(e) => updateField("phone", e.target.value)} className="bg-input border-border" /></Field>
              </div>
            </InfoCard>
            <InfoCard title="Informações preenchidas pela equipe">
              <Field label="Gestor responsável"><Select value={client.manager} onValueChange={(v) => updateField("manager", v)}><SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger><SelectContent>{managerOptions.map((manager) => <SelectItem key={manager} value={manager}>{manager}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Tipos de serviços a serem prestados"><Textarea value={client.servicesDescription || ""} onChange={(e) => updateField("servicesDescription", e.target.value)} className="bg-input border-border min-h-20" placeholder="Descreva todos os serviços contratados" /></Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Tempo de contrato (meses)"><Input type="number" min={1} value={client.contractMonths} onChange={(e) => updateField("contractMonths", Math.max(1, Number(e.target.value)))} className="bg-input border-border" /></Field>
                {!hideContractValues && <Field label="Valor do contrato"><Input type="number" min={0} step="0.01" value={client.contractValue} onChange={(e) => updateField("contractValue", Number(e.target.value))} className="bg-input border-border" /></Field>}
                <Field label="Data de vencimento"><Input type="date" value={client.dueDate || ""} onChange={(e) => updateField("dueDate", e.target.value)} className="bg-input border-border" /></Field>
                <Field label="Forma de pagamento"><Input value={client.paymentMethod || ""} onChange={(e) => updateField("paymentMethod", e.target.value)} className="bg-input border-border" placeholder="PIX, boleto, cartão..." /></Field>
              </div>
            </InfoCard>
          </div>
        </TabsContent>
        <TabsContent value="relatorios"><ClientReports clientId={client.id} /></TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Info */}
        <InfoCard title="Dados do Cliente">
          <Field label="Gestor Responsável">
            <Select value={client.manager} onValueChange={(v) => updateField("manager", v)}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {managerOptions.map((m) => (
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
          {!hideContractValues && <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo do contrato">
              <Select value={client.contractType} onValueChange={(v: "MRR" | "TCV") => updateField("contractType", v)}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="MRR">MRR — mensal</SelectItem><SelectItem value="TCV">TCV — total</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Duração (meses)">
              <Input type="number" min={1} value={client.contractMonths} onChange={(e) => updateField("contractMonths", Math.max(1, Number(e.target.value)))} className="bg-input border-border" />
            </Field>
          </div>}
          {!hideContractValues && <Field label={client.contractType === "TCV" ? "Valor total do contrato" : "Valor mensal (MRR)"}>
            <Input type="number" value={client.contractValue} onChange={(e) => updateField("contractValue", Number(e.target.value))} className="bg-input border-border" />
          </Field>}
          {!hideContractValues && <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Valor mensal</span><strong>{formatCurrency(getMonthlyContractValue(client))}</strong></div>
            <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Total do período</span><strong>{formatCurrency(getTotalContractValue(client))}</strong></div>
          </div>}
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
