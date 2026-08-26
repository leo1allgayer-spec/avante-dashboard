import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, FileText, NotebookPen, Plus, Save, Search, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type PersonType = "PF" | "PJ";

interface ClientContractRecord {
  clientId: string;
  personType: PersonType;
  responsibleName: string;
  nationality: string;
  maritalStatus: string;
  profession: string;
  cpf: string;
  rg: string;
  rgIssuer: string;
  companyName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration: string;
  address: string;
  email: string;
  phone: string;
  photoDocumentName: string;
  contractObject: string;
  contractValue: string;
  billingType: string;
  installments: string;
  paymentMethod: string;
  paymentDetails: string;
  contractTerm: string;
  serviceStartDate: string;
  deliveryTerms: string;
  specialClauses: string;
  internalNotes: string;
  updatedAt: string;
}

interface LocalClient {
  id: string;
  name: string;
  company: string;
}

const emptyRecord = (clientId: string): ClientContractRecord => ({
  clientId,
  personType: "PJ",
  responsibleName: "",
  nationality: "",
  maritalStatus: "",
  profession: "",
  cpf: "",
  rg: "",
  rgIssuer: "",
  companyName: "",
  tradeName: "",
  cnpj: "",
  stateRegistration: "",
  address: "",
  email: "",
  phone: "",
  photoDocumentName: "",
  contractObject: "",
  contractValue: "",
  billingType: "",
  installments: "",
  paymentMethod: "",
  paymentDetails: "",
  contractTerm: "",
  serviceStartDate: "",
  deliveryTerms: "",
  specialClauses: "",
  internalNotes: "",
  updatedAt: "",
});

const Field = ({ label, value, onChange, placeholder, type = "text" }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
  </div>
);

export default function ClientNotesPage() {
  const { clients, loading } = useClients();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [records, setRecords] = useState<Record<string, ClientContractRecord>>({});
  const [localClients, setLocalClients] = useState<LocalClient[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [addingClient, setAddingClient] = useState(false);
  const [draft, setDraft] = useState<ClientContractRecord | null>(null);

  const loadNotes = async () => {
    const { data, error } = await (supabase as any).from("client_contract_notes").select("*").order("submitted_at", { ascending: false });
    if (error) { toast.error("Não foi possível carregar as fichas dos clientes."); return; }
    const nextRecords: Record<string, ClientContractRecord> = {};
    const nextClients: LocalClient[] = [];
    for (const row of data || []) {
      const clientData = row.client_data || {};
      const teamData = row.team_data || {};
      nextRecords[row.id] = { ...emptyRecord(row.id), ...clientData, ...teamData, clientId: row.id, updatedAt: row.updated_at };
      nextClients.push({ id: row.id, name: clientData.responsibleName || "Cliente sem nome", company: clientData.companyName || clientData.tradeName || "" });
    }
    setRecords(nextRecords); setLocalClients(nextClients);
  };

  useEffect(() => { void loadNotes(); }, []);

  const allClients = useMemo(() => {
    const remote = clients.map((client) => ({ ...client, isLocal: false as const }));
    const local = localClients.map((client) => ({ ...client, isLocal: true as const }));
    return [...remote, ...local];
  }, [clients, localClients]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return allClients.filter((client) => !term || `${client.name} ${client.company}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [allClients, search]);

  useEffect(() => {
    if (!selectedId && allClients.length) setSelectedId(allClients[0].id);
  }, [allClients, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const client = allClients.find((item) => item.id === selectedId);
    const saved = records[selectedId];
    setDraft(saved || {
      ...emptyRecord(selectedId),
      responsibleName: "responsibleName" in (client || {}) ? client?.responsibleName || "" : "",
      companyName: client?.company || client?.name || "",
      tradeName: client?.name || "",
      email: "email" in (client || {}) ? client?.email || "" : "",
      phone: "phone" in (client || {}) ? client?.phone || "" : "",
      contractObject: "servicesDescription" in (client || {}) ? client?.servicesDescription || "" : "",
      paymentMethod: "paymentMethod" in (client || {}) ? client?.paymentMethod || "" : "",
      contractValue: "contractValue" in (client || {}) && client?.contractValue ? String(client.contractValue) : "",
      contractTerm: "contractMonths" in (client || {}) && client?.contractMonths ? `${client.contractMonths} meses` : "",
    });
  }, [allClients, records, selectedId]);

  const update = <K extends keyof ClientContractRecord>(key: K, value: ClientContractRecord[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const save = async () => {
    if (!draft) return;
    const clientData = { personType: draft.personType, responsibleName: draft.responsibleName, nationality: draft.nationality, maritalStatus: draft.maritalStatus, profession: draft.profession, cpf: draft.cpf, rg: draft.rg, rgIssuer: draft.rgIssuer, companyName: draft.companyName, tradeName: draft.tradeName, cnpj: draft.cnpj, stateRegistration: draft.stateRegistration, address: draft.address, email: draft.email, phone: draft.phone, photoDocumentName: draft.photoDocumentName };
    const teamData = { contractObject: draft.contractObject, contractValue: draft.contractValue, billingType: draft.billingType, installments: draft.installments, paymentMethod: draft.paymentMethod, paymentDetails: draft.paymentDetails, contractTerm: draft.contractTerm, serviceStartDate: draft.serviceStartDate, deliveryTerms: draft.deliveryTerms, specialClauses: draft.specialClauses, internalNotes: draft.internalNotes };
    const documentKey = (draft.cnpj || draft.cpf || draft.clientId).replace(/\D/g, "") || draft.clientId;
    const { error } = await (supabase as any).from("client_contract_notes").upsert({ id: draft.clientId.startsWith("local-") ? undefined : draft.clientId, document_key: documentKey, client_data: clientData, team_data: teamData, updated_at: new Date().toISOString() }, { onConflict: "document_key" });
    if (error) { toast.error(error.message || "Não foi possível salvar a ficha."); return; }
    await loadNotes();
    toast.success("Ficha salva no dashboard.");
  };

  const selectedClient = allClients.find((client) => client.id === selectedId);

  const addLocalClient = () => {
    if (!newClientName.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    const client: LocalClient = {
      id: `local-${crypto.randomUUID()}`,
      name: newClientName.trim(),
      company: newClientCompany.trim(),
    };
    setLocalClients((current) => [...current, client]);
    setSelectedId(client.id);
    setNewClientName("");
    setNewClientCompany("");
    setAddingClient(false);
    toast.success("Cliente criado. Preencha a ficha e salve.");
  };

  return (
    <DashboardLayout
      title="Fichas e notas dos clientes"
      subtitle="Dados cadastrais, informações contratuais e observações internas"
      contentClassName="max-w-[1680px]"
      actions={<div className="flex items-center gap-2"><Button variant="outline" className="gap-2" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/cadastro-notas-cliente`); toast.success("Link de cadastro copiado."); }}><Copy className="h-4 w-4" /> Copiar link do cliente</Button><Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Dados protegidos</Badge></div>}
    >
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit xl:sticky xl:top-5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2"><CardTitle className="text-base">Clientes</CardTitle><Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setAddingClient((value) => !value)}><Plus className="h-3.5 w-3.5" /> Novo</Button></div>
            {addingClient && <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Input value={newClientName} onChange={(event) => setNewClientName(event.target.value)} placeholder="Nome do cliente *" autoFocus />
              <Input value={newClientCompany} onChange={(event) => setNewClientCompany(event.target.value)} placeholder="Empresa (opcional)" onKeyDown={(event) => event.key === "Enter" && addLocalClient()} />
              <Button size="sm" className="w-full" onClick={addLocalClient}>Criar e preencher ficha</Button>
            </div>}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." />
            </div>
          </CardHeader>
          <CardContent className="max-h-[68vh] space-y-1 overflow-y-auto">
            {loading && <p className="p-3 text-sm text-muted-foreground">Carregando clientes...</p>}
            {filteredClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedId(client.id)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${selectedId === client.id ? "border-primary/50 bg-primary/10" : "border-transparent hover:bg-muted/60"}`}
              >
                <p className="truncate text-sm font-semibold">{client.name}</p>
                <p className="truncate text-xs text-muted-foreground">{client.company || "Sem empresa informada"}</p>
                {client.isLocal && <Badge variant="outline" className="mt-1 text-[9px]">Ficha</Badge>}
              </button>
            ))}
          </CardContent>
        </Card>

        {!draft ? (
          <Card><CardContent className="flex min-h-72 items-center justify-center text-muted-foreground">Selecione um cliente.</CardContent></Card>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div>
                <p className="text-lg font-bold">{selectedClient?.name}</p>
                <p className="text-xs text-muted-foreground">{draft.updatedAt ? `Última alteração: ${new Date(draft.updatedAt).toLocaleString("pt-BR")}` : "Ficha ainda não salva"}</p>
              </div>
              <Button onClick={save} className="gap-2"><Save className="h-4 w-4" /> Salvar ficha</Button>
            </div>

            <Card>
              <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4 text-primary" /> Dados fornecidos pelo cliente</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="max-w-xs space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tipo de cadastro</Label>
                  <Select value={draft.personType} onValueChange={(value: PersonType) => update("personType", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="PF">Pessoa física</SelectItem><SelectItem value="PJ">Pessoa jurídica</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Nome completo do responsável" value={draft.responsibleName} onChange={(v) => update("responsibleName", v)} />
                  <Field label="CPF" value={draft.cpf} onChange={(v) => update("cpf", v)} />
                  <Field label="RG + órgão/UF" value={`${draft.rg}${draft.rgIssuer ? ` · ${draft.rgIssuer}` : ""}`} onChange={(v) => update("rg", v)} />
                  <Field label="Nacionalidade" value={draft.nationality} onChange={(v) => update("nationality", v)} />
                  <Field label="Estado civil" value={draft.maritalStatus} onChange={(v) => update("maritalStatus", v)} />
                  <Field label="Profissão" value={draft.profession} onChange={(v) => update("profession", v)} />
                  {draft.personType === "PJ" && <>
                    <Field label="Razão social" value={draft.companyName} onChange={(v) => update("companyName", v)} />
                    <Field label="Nome fantasia" value={draft.tradeName} onChange={(v) => update("tradeName", v)} />
                    <Field label="CNPJ" value={draft.cnpj} onChange={(v) => update("cnpj", v)} />
                    <Field label="Inscrição estadual" value={draft.stateRegistration} onChange={(v) => update("stateRegistration", v)} />
                  </>}
                  <Field label="E-mail principal" type="email" value={draft.email} onChange={(v) => update("email", v)} />
                  <Field label="Telefone / WhatsApp" value={draft.phone} onChange={(v) => update("phone", v)} />
                </div>
                <Field label="Endereço completo" value={draft.address} onChange={(v) => update("address", v)} placeholder="Rua, número, complemento, bairro, cidade, UF e CEP" />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Documento com foto do responsável (referência local)</Label>
                  <Input type="file" accept="image/*,.pdf" onChange={(e) => update("photoDocumentName", e.target.files?.[0]?.name || "")} />
                  <p className="text-xs text-muted-foreground">Nesta versão local, apenas o nome do arquivo é lembrado; o documento ainda não é enviado.</p>
                  {draft.photoDocumentName && <p className="text-xs text-muted-foreground">Selecionado: {draft.photoDocumentName}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> Dados preenchidos pela equipe</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Objeto do contrato / serviços" value={draft.contractObject} onChange={(v) => update("contractObject", v)} />
                  <Field label="Valor total do contrato" value={draft.contractValue} onChange={(v) => update("contractValue", v)} placeholder="R$ 0,00" />
                  <Field label="Forma de cobrança" value={draft.billingType} onChange={(v) => update("billingType", v)} placeholder="À vista, parcelado ou recorrente" />
                  <Field label="Quantidade de parcelas" value={draft.installments} onChange={(v) => update("installments", v)} />
                  <Field label="Forma de pagamento" value={draft.paymentMethod} onChange={(v) => update("paymentMethod", v)} placeholder="PIX, boleto, transferência ou cartão" />
                  <Field label="Prazo do contrato" value={draft.contractTerm} onChange={(v) => update("contractTerm", v)} placeholder="3 meses, 6 meses, entrega única..." />
                  <Field label="Início do serviço" type="date" value={draft.serviceStartDate} onChange={(v) => update("serviceStartDate", v)} />
                  <Field label="Prazo / condição de entrega" value={draft.deliveryTerms} onChange={(v) => update("deliveryTerms", v)} />
                  <Field label="Dados bancários / chave PIX" value={draft.paymentDetails} onChange={(v) => update("paymentDetails", v)} />
                </div>
                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Cláusulas especiais ou condições diferentes</Label><Textarea rows={4} value={draft.specialClauses} onChange={(e) => update("specialClauses", e.target.value)} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-base"><NotebookPen className="h-4 w-4 text-primary" /> Notas internas do cliente</CardTitle></CardHeader>
              <CardContent><Textarea rows={7} value={draft.internalNotes} onChange={(e) => update("internalNotes", e.target.value)} placeholder="Registre decisões, pendências, solicitações, histórico e observações importantes..." /></CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
