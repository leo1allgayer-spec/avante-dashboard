import { useQuery } from "@tanstack/react-query";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";

type Entry = {id:string; changed_at:string; actor_email:string|null; old_status:string; new_status:string; changed_fields:string[]};
const labels: Record<string,string> = {status:"status",name:"nome",company:"empresa",instagram:"Instagram",manager:"gestor",notes:"perfil, contrato ou anotações",monthly_budget:"orçamento",last_balance_date:"data do saldo",balance_note:"observação do saldo",last_report_date:"data do relatório",last_account_update:"otimização",start_date:"data de início",report_day:"dia do relatório",contract_value:"contrato",payment_status:"pagamento",payment_date:"dia de pagamento",next_charge_date:"próxima cobrança",commission_value:"comissão"};
export function ClientChangeHistory({clientId}:{clientId:string}) {
 const history = useQuery({queryKey:["client-change-history",clientId],refetchInterval:15000,queryFn:async()=>{
  const {data,error}=await supabase.from("client_change_history" as any).select("id,changed_at,actor_email,old_status,new_status,changed_fields").eq("client_id",clientId).order("changed_at",{ascending:false}).limit(100);
  if(error) throw error; return (data || []) as unknown as Entry[];
 }});
 return <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer font-semibold">Histórico de alterações do cliente</summary><p className="mt-2 text-xs text-muted-foreground">Alterações registradas a partir da ativação deste histórico. Mostra as últimas 100.</p>
 {history.isPending ? <p className="mt-3 text-sm">Carregando histórico…</p> : history.isError ? <p className="mt-3 text-sm text-red-400">Não foi possível carregar o histórico. <button onClick={()=>history.refetch()} className="underline">Tentar novamente</button></p> : <div className="mt-3 space-y-3">{history.data?.length ? history.data.map(entry=><div key={entry.id} className="rounded border p-3 text-sm"><p className="font-medium">{entry.old_status!==entry.new_status ? `${entry.old_status} → ${entry.new_status}` : "Cadastro atualizado"}</p><p className="text-xs text-muted-foreground">{new Date(entry.changed_at).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} · {entry.actor_email || "Sistema / operação administrativa"}</p><p className="mt-1 text-xs">Campos: {entry.changed_fields.map(field=>labels[field] || field).join(", ")}</p></div>) : <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>}</div>}
 </details>;
}
