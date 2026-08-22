import { useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import avanteLogo from "@/assets/logo-full.svg";

type FormData = {
  company: string;
  responsibleName: string;
  contractCompanyData: string;
  email: string;
  phone: string;
};

const emptyForm: FormData = { company: "", responsibleName: "", contractCompanyData: "", email: "", phone: "" };

export default function ClientIntakePage() {
  const { token = "" } = useParams();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof FormData, value: string) => setForm((previous) => ({ ...previous, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.company.trim() || !form.responsibleName.trim() || !form.contractCompanyData.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Preencha todos os campos para enviar o cadastro.");
      return;
    }
    setSaving(true);
    const { data, error: rpcError } = await (supabase as any).rpc("submit_client_intake_form", {
      p_token: token,
      p_company: form.company.trim(),
      p_responsible_name: form.responsibleName.trim(),
      p_contract_company_data: form.contractCompanyData.trim(),
      p_email: form.email.trim(),
      p_phone: form.phone.trim(),
    });
    setSaving(false);
    if (rpcError || data !== true) setError("Não foi possível enviar agora. Confira o link ou tente novamente.");
    else setDone(true);
  };

  return <div className="dot-pattern min-h-screen bg-background px-4 py-8 text-foreground">
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-2xl shadow-black/25">
      <header className="border-b border-border/60 p-6"><img src={avanteLogo} alt="Avante Digital" className="h-16 w-auto" /><p className="mt-5 text-xs uppercase tracking-[0.22em] text-primary">Cadastro de cliente</p><h1 className="mt-2 text-2xl font-bold">Dados para atendimento e contrato</h1><p className="mt-2 text-sm text-muted-foreground">Preencha as informações abaixo. Elas serão enviadas com segurança para a equipe da Avante Digital.</p></header>
      {done ? <div className="p-10 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /><h2 className="mt-4 text-2xl font-bold">Cadastro enviado</h2><p className="mt-2 text-muted-foreground">As informações foram recebidas pela equipe. Obrigado!</p></div> : <form onSubmit={submit} className="space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2"><div><Label>Nome do responsável *</Label><Input value={form.responsibleName} onChange={(e) => set("responsibleName", e.target.value)} /></div><div><Label>Nome da empresa *</Label><Input value={form.company} onChange={(e) => set("company", e.target.value)} /></div></div>
        <div><Label>Dados da empresa para o contrato *</Label><Textarea className="min-h-32" value={form.contractCompanyData} onChange={(e) => set("contractCompanyData", e.target.value)} placeholder="Razão social, CNPJ/CPF, endereço completo e demais dados necessários" /></div>
        <div className="grid gap-5 sm:grid-cols-2"><div><Label>E-mail *</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div><div><Label>Telefone/WhatsApp *</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div></div>
        {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar informações</Button>
      </form>}
    </div>
  </div>;
}
