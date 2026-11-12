import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Setting = { threshold: number; enabled: boolean };
export function ClientBalanceAlert({ clientId }: { clientId: string }) {
  const { session } = useAuth();
  const admin = session?.user.email?.toLowerCase() === "digitalavante3@gmail.com";
  const [threshold, setThreshold] = useState("50"), [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false), [message, setMessage] = useState("");
  async function request(action: string, values = {}) {
    const { data, error } = await supabase.functions.invoke("client-meta-ads", { body: { action, clientId, ...values } });
    if (error) { const result = await error.context?.json?.().catch(() => null); throw new Error(result?.error || "Não foi possível salvar o aviso."); }
    return data;
  }
  const settings = useQuery({ queryKey: ["client-balance-alert", clientId], queryFn: () => request("balance_alert") as Promise<{ setting: Setting; delivery?: { last_error?: string } }>, retry: false });
  const groups = useQuery({ queryKey: ["meta-balance-alert-group"], queryFn: () => request("alert_groups"), enabled: admin, retry: false });
  useEffect(() => { if (settings.data) { setThreshold(String(settings.data.setting.threshold)); setEnabled(settings.data.setting.enabled); } }, [settings.data]);
  async function save() {
    setSaving(true); setMessage("");
    try {
      const amount = Number(threshold.replace(",", "."));
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor maior que zero.");
      await request("save_balance_alert", { threshold: amount, enabled }); await settings.refetch(); setMessage("Aviso de saldo atualizado.");
    } catch (error) { setMessage((error as Error).message); } finally { setSaving(false); }
  }
  async function configure(group: { id: string; channel: string }) {
    setSaving(true);
    try { await request("configure_alert_group", { groupId: group.id, channel: group.channel }); await groups.refetch(); setMessage("Grupo configurado para receber os avisos."); }
    catch (error) { setMessage((error as Error).message); } finally { setSaving(false); }
  }
  return <section className="rounded-lg border p-4 space-y-3" aria-label="Aviso de saldo baixo">
    <h4 className="font-semibold">Aviso de saldo baixo</h4>
    <p className="text-sm text-muted-foreground">Enviado ao grupo GESTÃO DE TRAFEGO - CLIENTES E AVANTE quando o saldo Meta ficar abaixo do limite. Um aviso por ocorrência; um novo aviso será liberado depois que o saldo voltar ao limite ou acima dele.</p>
    {settings.isPending ? <p>Carregando aviso…</p> : settings.isError ? <p role="alert">{settings.error.message}</p> : <>
      <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Ativar aviso para este cliente</label>
      <div className="flex flex-wrap gap-3 items-end"><label className="text-sm">Avisar abaixo de (R$)<input aria-label="Limite do aviso de saldo" type="number" min="0.01" max="1000000" step="0.01" value={threshold} onChange={event => setThreshold(event.target.value)} className="mt-1 block rounded-md border bg-background p-2" /></label><Button onClick={save} disabled={saving}>Salvar aviso de saldo</Button></div>
      {settings.data?.delivery?.last_error && <p role="status" className="text-sm text-amber-400">{settings.data.delivery.last_error}</p>}
    </>}
    {admin && (groups.isPending ? <p>Verificando grupo…</p> : groups.isError ? <p role="alert">{groups.error.message}</p> : groups.data?.destination ? <p className="text-sm text-emerald-400">Grupo configurado: {groups.data.destination.group_name}</p> : <div className="space-y-2"><p className="text-sm">O grupo ainda precisa ser ativado.</p>{groups.data?.groups?.length ? groups.data.groups.map((group: { id: string; name: string; channel: string }) => <Button key={group.id + group.channel} variant="outline" disabled={saving} onClick={() => configure(group)}>Ativar avisos neste grupo ({group.channel === "backup" ? "canal interno" : "canal principal"})</Button>) : <p className="text-sm text-amber-400">Grupo não encontrado nos canais configurados. O WhatsApp conectado precisa participar do grupo.</p>}</div>)}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
