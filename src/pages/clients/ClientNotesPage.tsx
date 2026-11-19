import { ClientContractAttachments } from '@/components/clients/ClientContractAttachments';
import { formatCep, validCep } from '@/lib/cep';
import { clientFromNoteDefaults, createGestaoClientFromNote } from '@/lib/clientFromNote';
import { AddClientDialog } from '@/components/clients/AddClientDialog';
import { useAuth } from '@/hooks/useAuth';
import { canAccessClientContracts } from '@/lib/accessControl';
import type { Client } from '@/types/clients/client';
import { clientNoteIntakeLink } from '@/lib/clientNoteIntakeLink';
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
import { Copy, Download, FileText, NotebookPen, Plus, Save, Search, ShieldCheck, UserRound } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { contractDefaults, type ContractSettings } from "@/lib/clientContract";
import { getTotalContractValue } from "@/types/clients/client";

type PersonType = "PF" | "PJ";

interface ClientContractRecord extends ContractSettings {
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
  cep: string;
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
  isNewContract?: boolean;
  id: string;
  sourceClientId?: string;
  name: string;
  company: string;
}

const emptyRecord = (clientId: string): ClientContractRecord => ({
  ...contractDefaults,
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
  cep: "",
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
  const { session }=useAuth();
  const [createFromNoteId,setCreateFromNoteId]=useState("");
  const [gestaoArea,setGestaoArea]=useState<"meta_ads"|"google_ads">("meta_ads");
  const [search, setSearch] = useState("");
  const [clientGroup, setClientGroup] = useState<'new' | 'existing'>('new');
  const [selectedId, setSelectedId] = useState("");
  const [records, setRecords] = useState<Record<string, ClientContractRecord>>({});
  const [localClients, setLocalClients] = useState<LocalClient[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [addingClient, setAddingClient] = useState(false);
  const [draft, setDraft] = useState<ClientContractRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [copying,setCopying]=useState(false);
  const [generatedLink,setGeneratedLink]=useState("");

  const loadNotes = async () => {
    const { data, error } = await (supabase as any).from("client_contract_notes").select("*").order("submitted_at", { ascending: false });
    if (error) { toast.error("Não foi possível carregar as fichas dos clientes."); return; }
    const nextRecords: Record<string, ClientContractRecord> = {};
    const nextClients: LocalClient[] = [];
    for (const row of data || []) {
      const clientData = row.client_data || {};
      const teamData = row.team_data || {};
      nextRecords[row.id] = { ...emptyRecord(row.id), ...clientData, ...teamData, clientId: row.id, updatedAt: row.updated_at };
      nextClients.push({ id: row.id, sourceClientId: row.client_id, isNewContract: row.is_new_contract === true, name: clientData.responsibleName || clientData.tradeName || clientData.companyName || "Cliente sem nome", company: clientData.companyName || clientData.tradeName || "" });
    }
    setRecords(nextRecords); setLocalClients(nextClients);
  };

  useEffect(() => { void loadNotes(); }, []);

  const allClients = useMemo(() => {
    const remote = clients.filter((client) => !localClients.some((note) => note.id === client.id || note.sourceClientId === client.id)).map((client) => ({ ...client, isNewContract: false, isLocal: false as const }));
    const local = localClients.map((client) => ({ ...client, isLocal: true as const }));
    return [...remote, ...local];
  }, [clients, localClients]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return allClients.filter((client) => (clientGroup === 'new' ? client.isNewContract : !client.isNewContract) && (!term || `${client.name} ${client.company}`.toLocaleLowerCase("pt-BR").includes(term)));
  }, [allClients, search, clientGroup]);

  useEffect(() => {
    const groupClients = allClients.filter(client => clientGroup === 'new' ? client.isNewContract : !client.isNewContract);
    if (!groupClients.some(client => client.id === selectedId)) {
      setSelectedId(groupClients[0]?.id || '');
      if (!groupClients.length) setDraft(null);
    }
  }, [allClients, selectedId, clientGroup]);

  useEffect(() => {
    if (!selectedId) return;
    const client = allClients.find((item) => item.id === selectedId);
    const linked = localClients.find(item => item.sourceClientId === selectedId);
    if (linked) { setSelectedId(linked.id); return; }
    const saved = records[selectedId];
    setDraft(saved || {
      ...emptyRecord(selectedId),
      responsibleName: client && "responsibleName" in client ? client.responsibleName || "" : "",
      companyName: client?.company || client?.name || "",
      tradeName: client?.name || "",
      email: client && "email" in client ? client.email || "" : "",
      phone: client && "phone" in client ? client.phone || "" : "",
      contractObject: client && "servicesDescription" in client ? client.servicesDescription || "" : "",
      paymentMethod: client && "paymentMethod" in client ? client.paymentMethod || "" : "",
      contractValue: client && "contractValue" in client && client.contractValue ? String(getTotalContractValue(client)) : "",
      contractTerm: client && "contractMonths" in client && client.contractMonths ? `${client.contractMonths} meses` : "",
    });
  }, [allClients, records, selectedId]);

  const update = <K extends keyof ClientContractRecord>(key: K, value: ClientContractRecord[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const copyClientLink = async () => {
    if(!draft||copying||saving)return;
    setCopying(true);
    try {
      const selected=allClients.find(client=>client.id===selectedId);
      const sourceId=selected&&'sourceClientId' in selected?selected.sourceClientId:selectedId;
      const source=clients.find(client=>client.id===sourceId);
      const link=await clientNoteIntakeLink(supabase,window.location.origin,(source as any)?.intakeToken,save);
      try{await navigator.clipboard.writeText(link);toast.success('Link individual do cliente copiado.');}
      catch{setGeneratedLink(link);toast.info('Link gerado. Copie o endereço abaixo.');}
    }catch(error){toast.error(error instanceof Error?error.message:'Não foi possível gerar o link.');}
    finally{setCopying(false);}
  };

  const save = async () => {
    if (!draft || saving) return false;
    if(draft.cep&&!validCep(draft.cep)){toast.error("Informe um CEP com 8 dígitos.");return false;}
    setSaving(true);
    try {
    const clientData = { personType: draft.personType, responsibleName: draft.responsibleName, nationality: draft.nationality, maritalStatus: draft.maritalStatus, profession: draft.profession, cpf: draft.cpf, rg: draft.rg, rgIssuer: draft.rgIssuer, companyName: draft.companyName, tradeName: draft.tradeName, cnpj: draft.cnpj, stateRegistration: draft.stateRegistration, address: draft.address, cep: draft.cep, email: draft.email, phone: draft.phone, photoDocumentName: draft.photoDocumentName };
    const teamData = { contractObject: draft.contractObject, contractValue: draft.contractValue, billingType: draft.billingType, installments: draft.installments, paymentMethod: draft.paymentMethod, paymentDetails: draft.paymentDetails, contractTerm: draft.contractTerm, serviceStartDate: draft.serviceStartDate, deliveryTerms: draft.deliveryTerms, specialClauses: draft.specialClauses, internalNotes: draft.internalNotes,
      ...Object.fromEntries(Object.keys(contractDefaults).map((key) => [key, draft[key as keyof ContractSettings]])),
    };
    const documentKey = ((draft.personType === "PJ" ? draft.cnpj : draft.cpf) || "").replace(/\D/g, "") || draft.clientId;
    const sourceClient = clients.find((client) => client.id === draft.clientId);
    const payload = { document_key: documentKey, client_data: clientData, team_data: teamData, updated_at: new Date().toISOString(), ...(sourceClient ? { client_id: sourceClient.id } : {}), ...(!records[draft.clientId] ? { is_new_contract: !sourceClient } : {}) };
    const query = records[draft.clientId]
      ? (supabase as any).from("client_contract_notes").update(payload).eq("id", draft.clientId)
      : (supabase as any).from("client_contract_notes").upsert(payload, { onConflict: "document_key" });
    const { data: saved, error } = await query.select("id").single();
    if (error) { toast.error(error.message || "Não foi possível salvar a ficha."); return false; }
    await loadNotes();
    setSelectedId(saved.id);
    toast.success("Ficha salva no dashboard.");
    return saved.id as string;
    } catch { toast.error("Não foi possível salvar a ficha. Tente novamente."); return false; }
    finally { setSaving(false); }
  };

  const openCreateGestao = async()=>{
    const savedId=await save();
    if(savedId){setGestaoArea('meta_ads');setCreateFromNoteId(savedId);}
  };
  const moveContractGroup = async () => {
    const nextGroup = clientGroup === 'new' ? 'existing' : 'new';
    const id = await save();
    if (!id) return;
    const { error } = await (supabase as any).from('client_contract_notes').update({ is_new_contract: nextGroup === 'new' }).eq('id', id).select('id').single();
    if (error) { toast.error('Não foi possível mover a ficha.'); return; }
    await loadNotes();
    setClientGroup(nextGroup); setSelectedId(id);
    toast.success(nextGroup === 'existing' ? 'Ficha movida para clientes existentes.' : 'Ficha movida para novos contratos.');
  };
  const createFromNote = async(client:Client)=>{
    try{
      await createGestaoClientFromNote(supabase,createFromNoteId,client,gestaoArea);
      await loadNotes();
      toast.success('Cliente criado e vinculado à ficha na Gestão de Clientes.');
    }catch(error){toast.error(error instanceof Error?error.message:'Não foi possível criar o cliente.');throw error;}
  };
  const generateFinancialPdf = async () => {
    if (!draft) return;

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const ensureSpace = (height: number) => {
      if (y + height <= pageHeight - 18) return;
      pdf.addPage();
      y = 18;
    };

    const addSection = (title: string, fields: Array<[string, string]>) => {
      const available = fields.filter(([, value]) => value.trim());
      if (!available.length) return;
      ensureSpace(14);
      pdf.setFillColor(236, 242, 255);
      pdf.roundedRect(margin, y, contentWidth, 9, 2, 2, "F");
      pdf.setTextColor(28, 74, 160);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(title, margin + 4, y + 6);
      y += 13;

      available.forEach(([label, value]) => {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(90, 100, 120);
        const labelLines = pdf.splitTextToSize(label.toUpperCase(), 48) as string[];
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(25, 30, 40);
        const valueLines = pdf.splitTextToSize(value, contentWidth - 55) as string[];
        const lineCount = Math.max(labelLines.length, valueLines.length);
        const rowHeight = Math.max(9, lineCount * 4.5 + 3);
        ensureSpace(rowHeight);
        pdf.setDrawColor(225, 229, 238);
        pdf.line(margin, y + rowHeight - 1, pageWidth - margin, y + rowHeight - 1);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(90, 100, 120);
        pdf.text(labelLines, margin, y + 4);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(25, 30, 40);
        pdf.text(valueLines, margin + 55, y + 4);
        y += rowHeight;
      });
      y += 5;
    };

    pdf.setFillColor(18, 29, 52);
    pdf.rect(0, 0, pageWidth, 34, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("AVANTE DIGITAL", margin, 15);
    pdf.setFontSize(12);
    pdf.text("Ficha cadastral e financeira", margin, 24);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth - margin, 24, { align: "right" });
    y = 43;

    addSection("Identificação", [
      ["Tipo de cadastro", draft.personType === "PJ" ? "Pessoa jurídica" : "Pessoa física"],
      ["Responsável", draft.responsibleName],
      ["CPF", draft.cpf],
      ["RG / órgão emissor", [draft.rg, draft.rgIssuer].filter(Boolean).join(" - ")],
      ["Nacionalidade", draft.nationality],
      ["Estado civil", draft.maritalStatus],
      ["Profissão", draft.profession],
    ]);
    addSection("Empresa e contato", [
      ["Razão social", draft.companyName],
      ["Nome fantasia", draft.tradeName],
      ["CNPJ", draft.cnpj],
      ["Inscrição estadual", draft.stateRegistration],
      ["E-mail", draft.email],
      ["Telefone / WhatsApp", draft.phone],
      ["Endereço", draft.address],
      ["CEP", draft.cep],
    ]);
    addSection("Informações financeiras e contratuais", [
      ["Objeto / serviços", draft.contractObject],
      ["Valor total", draft.contractValue],
      ["Forma de cobrança", draft.billingType],
      ["Parcelas", draft.installments],
      ["Forma de pagamento", draft.paymentMethod],
      ["Dados bancários / PIX", draft.paymentDetails],
      ["Prazo do contrato", draft.contractTerm],
      ["Início do serviço", draft.serviceStartDate ? new Date(`${draft.serviceStartDate}T12:00:00`).toLocaleDateString("pt-BR") : ""],
      ["Prazo / condição de entrega", draft.deliveryTerms],
      ["Condições especiais", draft.specialClauses],
    ]);

    const totalPages = pdf.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      pdf.setDrawColor(220, 225, 235);
      pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(110, 118, 135);
      pdf.text("Documento confidencial - uso exclusivo do financeiro", margin, pageHeight - 8);
      pdf.text(`Página ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }

    const baseName = draft.tradeName || draft.companyName || draft.responsibleName || selectedClient?.name || "cliente";
    const safeName = baseName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    pdf.save(`ficha-financeiro-${safeName || "cliente"}.pdf`);
    toast.success("PDF financeiro gerado.");
  };
  const selectedClient = allClients.find((client) => client.id === selectedId);

  const addLocalClient = () => {
    if (!newClientName.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    const client: LocalClient = {
      isNewContract: true,
      id: `local-${crypto.randomUUID()}`,
      name: newClientName.trim(),
      company: newClientCompany.trim(),
    };
    setLocalClients((current) => [...current, client]);
    setClientGroup('new');
    setSelectedId(client.id);
    setNewClientName("");
    setNewClientCompany("");
    setAddingClient(false);
    toast.success("Cliente criado. Preencha a ficha e salve.");
  };

  return (
    <DashboardLayout
      title="Contratos Clientes"
      subtitle="Dados cadastrais, informações contratuais e observações internas"
      contentClassName="max-w-[1680px]"
      actions={<div className="flex items-center gap-2"><Button variant="outline" className="gap-2" onClick={copyClientLink} disabled={!draft||copying||saving}><Copy className="h-4 w-4" /> {copying?"Gerando link…":"Copiar link do cliente"}</Button><Button variant="outline" onClick={() => void loadNotes()}>Atualizar fichas</Button><Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Dados protegidos</Badge></div>}
    >
      <AddClientDialog open={!!createFromNoteId} onClose={()=>setCreateFromNoteId('')} onAdd={createFromNote} initialClient={draft?clientFromNoteDefaults(draft as unknown as Record<string,unknown>):undefined} title="Criar cliente a partir da ficha" submitLabel="Criar na Gestão de Clientes" area={gestaoArea} onAreaChange={setGestaoArea}/>
      <Dialog open={!!generatedLink} onOpenChange={open=>{if(!open)setGeneratedLink('');}}><DialogContent><DialogHeader><DialogTitle>Link individual do cliente</DialogTitle></DialogHeader><Input aria-label="Link individual do cliente" value={generatedLink} readOnly onFocus={e=>e.target.select()}/><p className="text-sm text-muted-foreground">Copie este endereço e envie ao cliente para preencher os dados da ficha.</p></DialogContent></Dialog>
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
            <div className="grid grid-cols-2 gap-1" aria-label="Grupo de clientes">
              <Button size="sm" variant={clientGroup === 'new' ? 'default' : 'outline'} onClick={() => setClientGroup('new')} className="h-auto whitespace-normal py-2 text-xs">Novos contratos ({allClients.filter(client => client.isNewContract).length})</Button>
              <Button size="sm" variant={clientGroup === 'existing' ? 'default' : 'outline'} onClick={() => setClientGroup('existing')} className="h-auto whitespace-normal py-2 text-xs">Clientes existentes ({allClients.filter(client => !client.isNewContract).length})</Button>
            </div>
          </CardHeader>
          <CardContent data-lenis-prevent className="max-h-[68vh] touch-pan-y space-y-1 overflow-y-auto overscroll-contain">
            {loading && <p className="p-3 text-sm text-muted-foreground">Carregando clientes...</p>}
            {!loading && !filteredClients.length && <p className="p-3 text-sm text-muted-foreground">Nenhum cliente neste grupo.</p>}
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
                <Button size="sm" variant="outline" className="my-2" disabled={saving || copying} onClick={() => void moveContractGroup()}>{clientGroup === 'new' ? 'Mover para clientes existentes' : 'Mover para novos contratos'}</Button>
                <p className="text-xs text-muted-foreground">{draft.updatedAt ? `Última alteração: ${new Date(draft.updatedAt).toLocaleString("pt-BR")}` : "Ficha ainda não salva"}</p>
              </div>
              <div className="flex flex-wrap gap-2">{selectedClient&&'sourceClientId' in selectedClient&&selectedClient.sourceClientId?<Badge variant="outline">Vinculado à Gestão de Clientes</Badge>:canAccessClientContracts(session?.user?.email)&&<Button variant="outline" onClick={openCreateGestao} disabled={saving||copying||!draft.responsibleName.trim()||!(draft.personType==='PJ'?draft.cnpj:draft.cpf).trim()}><Plus className="h-4 w-4 mr-2"/>Criar na Gestão de Clientes</Button>}<Button variant="outline" onClick={generateFinancialPdf} className="gap-2"><Download className="h-4 w-4" /> PDF financeiro</Button><Button disabled={saving} onClick={save} className="gap-2"><Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar ficha"}</Button></div>
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
                  <Field label="RG" value={draft.rg} onChange={(v) => update("rg", v)} />
                  <Field label="Órgão emissor / UF" value={draft.rgIssuer} onChange={(v) => update("rgIssuer", v)} />
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
                <Field label="CEP" value={draft.cep} onChange={v=>update("cep",formatCep(v))} placeholder="00000-000" />
                <Field label="Endereço completo" value={draft.address} onChange={(v) => update("address", v)} placeholder="Rua, número, complemento, bairro, cidade e UF" />
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
                  <Field label="Valor total do contrato" value={draft.contractValue} onChange={(v) => update("contractValue", v)} placeholder="R$ 0,00" />
                  <Field label="Forma de cobrança" value={draft.billingType} onChange={(v) => update("billingType", v)} placeholder="À vista, parcelado ou recorrente" />
                  <Field label="Quantidade de parcelas" value={draft.installments} onChange={(v) => update("installments", v)} />
                  <Field label="Forma de pagamento" value={draft.paymentMethod} onChange={(v) => update("paymentMethod", v)} placeholder="PIX, boleto, transferência ou cartão" />
                  <Field label="Prazo do contrato" value={draft.contractTerm} onChange={(v) => update("contractTerm", v)} placeholder="3 meses, 6 meses, entrega única..." />
                  <Field label="Início do serviço" type="date" value={draft.serviceStartDate} onChange={(v) => update("serviceStartDate", v)} />
                  <Field label="Prazo / condição de entrega" value={draft.deliveryTerms} onChange={(v) => update("deliveryTerms", v)} />
                  <Field label="Dados bancários / chave PIX" value={draft.paymentDetails} onChange={(v) => update("paymentDetails", v)} />
                </div>
                <div className="space-y-1.5"><Label>Objeto do contrato / serviços *</Label><Textarea rows={5} value={draft.contractObject} onChange={(e) => update("contractObject", e.target.value)} placeholder="Descreva os serviços, plataformas, quantidades de vídeos/cards, frequência de captação e reuniões, entregas e exclusões combinadas." /></div>
                <div className="space-y-1.5"><Label>Valores e vencimentos do pagamento *</Label><Textarea rows={3} value={draft.paymentSchedule} onChange={(e) => update("paymentSchedule", e.target.value)} placeholder="Ex.: 6 parcelas mensais de R$ 6.000,00. Primeira em 10/10/2026 e demais no dia 10 de cada mês." /></div>
                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Cláusulas especiais ou condições diferentes</Label><Textarea rows={4} value={draft.specialClauses} onChange={(e) => update("specialClauses", e.target.value)} /></div>
              </CardContent>
            </Card>

            <ClientContractAttachments key={draft.clientId} noteId={records[draft.clientId]?draft.clientId:undefined} allowed={canAccessClientContracts(session?.user?.email)}/>
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
