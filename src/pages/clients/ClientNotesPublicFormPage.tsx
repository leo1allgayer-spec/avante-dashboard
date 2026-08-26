import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import logoFull from "@/assets/logo-full.svg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const initial = {
  personType: "PJ", responsibleName: "", nationality: "", maritalStatus: "", profession: "",
  cpf: "", rg: "", rgIssuer: "", companyName: "", tradeName: "", cnpj: "", stateRegistration: "",
  address: "", email: "", phone: "", photoDocumentName: "",
};

const Field = ({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) => (
  <div className="space-y-1.5"><Label>{label}{required && " *"}</Label><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></div>
);

export default function ClientNotesPublicFormPage() {
  const [form, setForm] = useState(initial);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const set = (key: keyof typeof initial, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    const { error } = await (supabase as any).rpc("submit_client_contract_notes", { p_data: form });
    setSending(false);
    if (error) { toast.error(error.message || "Não foi possível enviar as informações."); return; }
    setSent(true);
  };

  if (sent) return <main className="flex min-h-screen items-center justify-center bg-background p-5"><Card className="max-w-lg"><CardContent className="space-y-4 p-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-success" /><h1 className="text-2xl font-bold">Informações enviadas</h1><p className="text-muted-foreground">Seu cadastro foi encaminhado para a equipe da Avante Digital.</p></CardContent></Card></main>;

  return <main className="min-h-screen bg-background px-4 py-8"><div className="mx-auto max-w-5xl space-y-5">
    <Card><CardContent className="flex items-center gap-5 p-6"><img src={logoFull} alt="Avante Digital" className="h-16 w-28 object-contain" /><div><p className="text-xs uppercase tracking-[0.2em] text-primary">Cadastro do cliente</p><h1 className="text-2xl font-bold">Dados para elaboração do contrato</h1><p className="text-sm text-muted-foreground">Preencha somente as informações abaixo. A parte contratual será completada pela nossa equipe.</p></div></CardContent></Card>
    <form onSubmit={submit}><Card><CardHeader><CardTitle>Informações do cliente</CardTitle></CardHeader><CardContent className="space-y-5">
      <div className="max-w-xs space-y-1.5"><Label>Tipo de cadastro</Label><Select value={form.personType} onValueChange={(value) => set("personType", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PF">Pessoa física</SelectItem><SelectItem value="PJ">Pessoa jurídica</SelectItem></SelectContent></Select></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Nome completo do responsável" value={form.responsibleName} onChange={(v) => set("responsibleName", v)} required />
        <Field label="CPF" value={form.cpf} onChange={(v) => set("cpf", v)} required />
        <Field label="RG" value={form.rg} onChange={(v) => set("rg", v)} /><Field label="Órgão emissor / UF" value={form.rgIssuer} onChange={(v) => set("rgIssuer", v)} />
        <Field label="Nacionalidade" value={form.nationality} onChange={(v) => set("nationality", v)} /><Field label="Estado civil" value={form.maritalStatus} onChange={(v) => set("maritalStatus", v)} /><Field label="Profissão" value={form.profession} onChange={(v) => set("profession", v)} />
        {form.personType === "PJ" && <><Field label="Razão social" value={form.companyName} onChange={(v) => set("companyName", v)} required /><Field label="Nome fantasia" value={form.tradeName} onChange={(v) => set("tradeName", v)} /><Field label="CNPJ" value={form.cnpj} onChange={(v) => set("cnpj", v)} required /><Field label="Inscrição estadual" value={form.stateRegistration} onChange={(v) => set("stateRegistration", v)} /></>}
        <Field label="E-mail" type="email" value={form.email} onChange={(v) => set("email", v)} required /><Field label="Telefone / WhatsApp" value={form.phone} onChange={(v) => set("phone", v)} required />
      </div>
      <div className="space-y-1.5"><Label>Endereço completo *</Label><Textarea value={form.address} onChange={(event) => set("address", event.target.value)} placeholder="Rua, número, complemento, bairro, cidade, UF e CEP" required /></div>
      <div className="space-y-1.5"><Label>Documento com foto</Label><Input type="file" accept="image/*,.pdf" onChange={(event) => set("photoDocumentName", event.target.files?.[0]?.name || "")} /><p className="text-xs text-muted-foreground">O nome do arquivo será registrado para conferência da equipe.</p></div>
      <Button type="submit" size="lg" className="w-full gap-2" disabled={sending}><Send className="h-4 w-4" /> {sending ? "Enviando..." : "Enviar informações"}</Button>
    </CardContent></Card></form>
  </div></main>;
}
