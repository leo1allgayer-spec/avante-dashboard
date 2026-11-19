import { contractMonthlyReceipt, contractMonthlyFinancials } from '@/lib/contractMonthlyFinancials';
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { Client, PaymentStatus, formatCurrency } from "@/types/clients/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { groupClientContracts } from "@/lib/clientContractGroups";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const billingMonth = () => new Intl.DateTimeFormat("sv-SE", {timeZone:"America/Sao_Paulo"}).format(new Date()).slice(0,7);
const monthlyReceipt = (c: Client) => contractMonthlyReceipt(c,billingMonth());

function ContractRow({ client, save, services }: { client: Client; save: (client: Client, options?: { changeStatus?: boolean; statusConfirmed?: boolean }) => Promise<void>; services: string }) {
  const [editing, setEditing] = useState(false);
  const [focusField, setFocusField] = useState("");
  const [busy, setBusy] = useState(false);

  const [day, setDay] = useState(String(client.paymentDate));
  const [date, setDate] = useState(client.nextChargeDate || client.dueDate || "");
  const [status, setStatus] = useState(client.paymentStatus);
  const [monthly, setMonthly] = useState(String(client.monthlyContractValue));
  const [settled, setSettled] = useState(Boolean(client.contractSettled));
  const [contractType, setContractType] = useState(client.contractType);
  const [months, setMonths] = useState(String(client.contractMonths || 1));
  const [received, setReceived] = useState(String(client.contractReceived || 0));
  const month = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date()).slice(0,7);
  async function markPaid() {
    setBusy(true);
    try { await save({ ...client, paymentStatus: "pago", paidMonth: month, contractReceived: Number(client.contractReceived || 0) + Math.max(client.monthlyContractValue - monthlyReceipt(client),0), receivedMonth: month, monthlyReceived: Math.max(monthlyReceipt(client),client.monthlyContractValue) }); toast.success("Mensalidade marcada como paga e valor recebido atualizado"); } catch { toast.error("Não foi possível salvar o pagamento"); } finally { setBusy(false); }
  }
  async function payOverdue(monthToPay: string) {
    const debt = client.overduePayments?.find(item => item.month === monthToPay);
    if (!debt) return;
    setBusy(true);
    try { await save({...client, overduePayments: client.overduePayments?.filter(item => item.month !== monthToPay), contractReceived: Number(client.contractReceived || 0) + debt.amount, arrearsReceivedMonth: month, arrearsReceived: (client.arrearsReceivedMonth === month ? Number(client.arrearsReceived || 0) : 0) + debt.amount}); toast.success("Mensalidade atrasada marcada como paga"); } catch { toast.error("Não foi possível salvar o pagamento atrasado"); } finally { setBusy(false); }
  }
  async function toggleActive() {
    if (client.status === "Ativo" && !window.confirm(`Pausar o cliente “${client.name}”? O status será alterado também nos cadastros vinculados de Meta e Google Ads.`)) return;
    setBusy(true);
    try { await save({ ...client, status: client.status === "Ativo" ? "Pausado" : "Ativo" }, {changeStatus:true,statusConfirmed:true}); toast.success(client.status === "Ativo" ? "Cliente pausado" : "Cliente ativado"); } catch { toast.error("Não foi possível atualizar o cliente"); } finally { setBusy(false); }
  }
  async function submit() {
    if (Number(day) < 1 || Number(day) > 31 || !Number.isInteger(Number(day))) { toast.error("Informe um valor válido e um dia entre 1 e 31."); return; }
    setBusy(true);
    try {
      if (!Number.isFinite(Number(monthly)) || Number(monthly) < 0) { toast.error("Informe uma mensalidade válida"); return; }
      if (!Number.isInteger(Number(months)) || Number(months) < 1) { toast.error("Informe o tempo de contrato em meses inteiros, a partir de 1."); return; }
      if (!Number.isFinite(Number(received)) || Number(received) < 0) { toast.error("Informe um valor recebido válido"); return; }
      await save({ ...client, contractValue: Number(monthly) * Number(months), contractType, contractMonths: Number(months), monthlyContractValue: Number(monthly), contractReceived: Number(received), receivedMonth: Number(received) !== Number(client.contractReceived || 0) ? month : client.receivedMonth, monthlyReceived: Number(received) !== Number(client.contractReceived || 0) ? Math.max(monthlyReceipt(client) + Number(received) - Number(client.contractReceived || 0),0) : client.monthlyReceived, paymentDate: Number(day), nextChargeDate: date, dueDate: date, paymentStatus: settled ? "pago" : status, paidMonth: status === "pago" ? month : client.paidMonth, contractSettled: settled });
      setEditing(false); toast.success("Contrato atualizado");
    } catch { toast.error("Não foi possível salvar o contrato"); } finally { setBusy(false); }
  }
  function edit(field = "") { setContractType(client.contractType); setMonths(String(client.contractMonths || 1)); setReceived(String(client.contractReceived || 0)); setFocusField(field); setMonthly(String(client.monthlyContractValue)); setSettled(Boolean(client.contractSettled)); setDay(String(client.paymentDate)); setDate(client.nextChargeDate || client.dueDate || ""); setStatus(client.paymentStatus); setEditing(true); }
  return <tr className="border-t">
    <td className="p-3 font-medium">{client.name}<div className="text-xs text-muted-foreground">{client.manager} · {client.status}</div><div className="text-xs text-blue-400">{services}</div></td>
    <td className="p-3"><Button variant="outline" size="sm" disabled={busy || editing} onClick={toggleActive}>{client.status === "Ativo" ? "Pausar" : "Ativar"}</Button></td>
    <td className="p-3">{editing ? <select aria-label={`Tipo de contrato de ${client.name}`} className="rounded-md border bg-background p-2 mb-2" value={contractType} onChange={e => setContractType(e.target.value as "MRR" | "TCV")}><option value="MRR">MRR — mensalidade</option><option value="TCV">TCV — valor total</option></select> : <button type="button" className="rounded px-1 py-1 hover:bg-muted" aria-label={`Editar tipo de contrato de ${client.name}`} onClick={() => edit("type")}>{client.contractType === "TCV" ? "TCV" : "MRR"}</button>} · {editing ? <Input autoFocus={focusField === "months"} aria-label={`Tempo de contrato de ${client.name}`} type="number" min="1" step="1" value={months} onChange={e => setMonths(e.target.value)} /> : <button type="button" className="rounded px-1 py-1 hover:bg-muted" aria-label={`Editar tempo de contrato de ${client.name}`} onClick={() => edit("months")}>{client.contractMonths} mês(es)</button>}</td>
    <td className="p-3">{editing ? <Input autoFocus={focusField === "monthly"} aria-label={`Mensalidade de ${client.name}`} type="number" min="0" step="0.01" value={monthly} onChange={e => setMonthly(e.target.value)} /> : <button type="button" className="rounded px-1 py-1 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Editar mensalidade de ${client.name}`} onClick={() => edit("monthly")}>{formatCurrency(client.monthlyContractValue)}</button>}</td>
    <td className="p-3 font-semibold text-blue-400">{formatCurrency((editing ? Number(monthly) : client.monthlyContractValue) * (editing ? Number(months) : client.contractMonths))}</td>
    <td className="p-3 text-green-400">{editing ? <Input autoFocus={focusField === "received"} aria-label={`Valor recebido de ${client.name}`} type="number" min="0" step="0.01" value={received} onChange={e => setReceived(e.target.value)} /> : <button type="button" className="rounded px-1 py-1 hover:bg-muted" aria-label={`Editar valor recebido de ${client.name}`} onClick={() => edit("received")}>{formatCurrency(client.contractReceived || 0)}</button>}</td>
    <td className="p-3 font-semibold text-violet-400" title="LTV realizado: total recebido registrado para este cliente">{formatCurrency(client.contractReceived || 0)}</td>
    <td className="p-3 text-yellow-400">{formatCurrency(client.contractSettled ? 0 : Math.max((editing ? Number(monthly) * Number(months) : client.monthlyContractValue * client.contractMonths) - (editing ? Number(received) : Number(client.contractReceived || 0)), 0))}</td>
    <td className="p-3">{editing ? <Input autoFocus={focusField === "day"} aria-label={`Dia de pagamento de ${client.name}`} type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} /> : <button type="button" className="rounded px-1 py-1 hover:bg-muted" aria-label={`Editar dia de pagamento de ${client.name}`} onClick={() => edit("day")}>Dia {client.paymentDate}</button>}</td>
    <td className="p-3">{editing ? <Input autoFocus={focusField === "date"} aria-label={`Data de pagamento de ${client.name}`} type="date" value={date} onChange={e => setDate(e.target.value)} /> : <button type="button" className="rounded px-1 py-1 hover:bg-muted" aria-label={`Editar data de pagamento de ${client.name}`} onClick={() => edit("date")}>{(client.nextChargeDate || client.dueDate)?.split("-").reverse().join("/") || "Não definida"}</button>}</td>
    <td className="p-3"><div className="space-y-3">{editing ? <div className="space-y-2"><select autoFocus={focusField === "status"} aria-label={`Status do pagamento de ${client.name}`} className="rounded-md border bg-background p-2" value={status} onChange={e => setStatus(e.target.value as PaymentStatus)}>{["a receber", "pago", "atrasado", "permuta"].map(s => <option key={s} value={s}>{s === "a receber" ? "Pendente" : s}</option>)}</select><label className="flex items-center gap-2"><input type="checkbox" checked={settled} onChange={e => setSettled(e.target.checked)} />Contrato quitado</label></div> : <div className="flex items-center gap-5 whitespace-nowrap"><button type="button" aria-label={`Editar status do pagamento de ${client.name}`} onClick={() => edit("status")} className={client.paymentStatus === "pago" ? "text-green-400" : client.paymentStatus === "atrasado" ? "text-red-400" : "text-yellow-400"}>{client.contractSettled ? "Contrato quitado" : client.paymentStatus === "a receber" ? "Pendente" : client.paymentStatus}</button>{!client.contractSettled && client.paymentStatus !== "pago" && client.paymentStatus !== "permuta" && <Button size="sm" disabled={busy} onClick={markPaid}>Marcar como pago</Button>}</div>}{(client.overduePayments || []).map(debt => <div key={debt.month} className="rounded-lg border border-red-500/30 bg-red-500/10 p-3"><p className="font-medium text-red-400">Atrasado · {debt.month.split("-").reverse().join("/")} · {formatCurrency(debt.amount)}</p><Button className="mt-2" size="sm" variant="outline" disabled={busy || editing} onClick={() => payOverdue(debt.month)}>Marcar {debt.month.split("-").reverse().join("/")} como pago</Button></div>)}</div></td>
    <td className="p-3">{editing ? <div className="flex gap-2"><Button disabled={busy} onClick={submit}>Salvar</Button><Button variant="outline" disabled={busy} onClick={() => setEditing(false)}>Cancelar</Button></div> : <Button variant="outline" onClick={() => edit()}>Editar</Button>}</td>
  </tr>;
}

export default function ClientContractsPage() {
  const meta = useClients();
  const google = useClients("google_ads");
  const [search, setSearch] = useState("");
  const [clientStatus, setClientStatus] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const groups = groupClientContracts(meta.clients, google.clients);
  const clients = groups.map(g => g.client).sort((a,b) => a.name.localeCompare(b.name, "pt-BR")).filter(c => c.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (clientStatus === "Todos" || c.status === clientStatus) && (typeFilter === "Todos" || c.contractType === typeFilter));
  async function saveContract(client: Client, options: { changeStatus?: boolean; statusConfirmed?: boolean } = {}) {
    const group = groups.find(g => g.client.id === client.id)!;
    const changes = { contractValue: client.monthlyContractValue * client.contractMonths, monthlyContractValue: client.monthlyContractValue, contractMonths: client.contractMonths, contractType: client.contractType, contractReceived: client.contractReceived, receivedMonth: client.receivedMonth, monthlyReceived: client.monthlyReceived, contractSettled: client.contractSettled, paidMonth: client.paidMonth, billingMonth: client.billingMonth, overduePayments: client.overduePayments, arrearsReceivedMonth: client.arrearsReceivedMonth, arrearsReceived: client.arrearsReceived, paymentStatus: client.paymentStatus, paymentDate: client.paymentDate, nextChargeDate: client.nextChargeDate, dueDate: client.dueDate };
    const statusChanged = options.changeStatus === true;
    if (group.meta) await meta.updateClient({...group.meta,...changes,...(statusChanged ? {status:client.status} : {})}, options);
    if (group.google) await google.updateClient({...group.google,...changes,...(statusChanged ? {status:client.status} : {})}, options);
  }
  const averageLtv = clients.length ? clients.reduce((sum,c) => sum + Number(c.contractReceived || 0),0) / clients.length : 0;
  const monthClients = clients.filter(c => c.status === "Ativo" && c.paymentStatus !== "permuta");
  const {received:receivedTotal,pending:pendingTotal}=contractMonthlyFinancials(clients,billingMonth());
  const overdueTotal = clients.reduce((sum,c) => sum + (c.overduePayments || []).reduce((subtotal,item) => subtotal + item.amount,0),0);
  const billedClients = monthClients.filter(c => !c.contractSettled && c.monthlyContractValue > 0);
  const paidCount = billedClients.filter(c => c.paymentStatus === "pago" || monthlyReceipt(c) >= c.monthlyContractValue).length;
  const unpaidCount = billedClients.length - paidCount;
  const paymentDistribution = [{name:"Pagos",value:paidCount,color:"#22c55e"},{name:"Não pagos",value:unpaidCount,color:"#f59e0b"}];
  const timeline = Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const due = clients.filter(c => c.status === "Ativo" && !c.contractSettled && c.paymentStatus !== "permuta" && c.paymentDate === day);
    return { day, amount: due.reduce((sum,c) => sum + c.monthlyContractValue, 0), count: due.length };
  });
  const peaks = timeline.filter(d => d.amount > 0).sort((a,b) => b.amount-a.amount).slice(0,3);
  return <DashboardLayout title="Clientes MRV" subtitle="Valores dos contratos e acompanhamento dos pagamentos">
    <div className="space-y-4"><div className="flex gap-3"><Input placeholder="Buscar cliente..." aria-label="Buscar cliente" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Status do cliente" className="rounded-md border bg-background p-2" value={clientStatus} onChange={e => setClientStatus(e.target.value)}><option value="Todos">Todos os clientes</option><option value="Ativo">Ativos</option><option value="Pausado">Pausados</option></select><select aria-label="Tipo de contrato" className="rounded-md border bg-background p-2" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="Todos">MRR e TCV</option><option value="MRR">MRR</option><option value="TCV">TCV</option></select></div>
      <p className="text-sm text-muted-foreground">Mensalidade de {new Intl.DateTimeFormat("pt-BR", {month:"long",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date())}. Ao virar o mês, o pagamento volta a pendente. Contratos quitados e permutas não reiniciam.</p>
      <div className="grid gap-4 sm:grid-cols-3"><section className="rounded-xl border border-green-500/20 bg-green-500/5 p-5"><p className="text-sm text-muted-foreground">Recebido no mês</p><strong className="text-3xl text-green-400">{formatCurrency(receivedTotal)}</strong></section><section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5"><p className="text-sm text-muted-foreground">A receber no mês</p><strong className="text-3xl text-amber-400">{formatCurrency(pendingTotal)}</strong></section><section className="rounded-xl border border-red-500/20 bg-red-500/5 p-5"><p className="text-sm text-muted-foreground">Em atraso de meses anteriores</p><strong className="text-3xl text-red-400">{formatCurrency(overdueTotal)}</strong></section></div><p className="text-xs text-muted-foreground">Totais dos clientes ativos nos filtros. Novos pagamentos e ajustes do recebido entram no mês atual; valores de meses anteriores ficam separados.</p>
      <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5"><p className="text-sm text-muted-foreground">LTV médio dos clientes nos filtros</p><strong className="text-3xl text-violet-400">{formatCurrency(averageLtv)}</strong><p className="mt-2 text-xs text-muted-foreground">LTV realizado: receita acumulada recebida de cada cliente, conforme os valores registrados. Pagamentos de meses anteriores também contam; não representa o valor previsto do contrato.</p></section>
      <section className="rounded-xl border bg-gradient-to-br from-green-500/5 via-background to-amber-500/5 p-5" aria-label="Clientes pagos e não pagos no mês">
        <h2 className="font-semibold">Clientes pagos e não pagos no mês</h2>
        <p className="mt-1 text-sm text-muted-foreground">Clientes ativos com mensalidade nos filtros. Pagamentos parciais entram como não pagos; contratos quitados e permutas ficam fora.</p>
        {billedClients.length ? <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-56 w-56 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentDistribution} dataKey="value" nameKey="name" innerRadius={74} outerRadius={95} paddingAngle={paidCount && unpaidCount ? 4 : 0} stroke="none">{paymentDistribution.map(d => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip formatter={(value:number,name:string) => [`${value} cliente(s)`,name]} contentStyle={{background:"hsl(var(--background))",borderColor:"hsl(var(--border))",borderRadius:12}} itemStyle={{color:"hsl(var(--foreground))"}} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl">{Math.round(paidCount/billedClients.length*100)}%</strong><span className="text-sm text-muted-foreground">pagos no mês</span></div></div>
          <div className="grid w-full gap-4 sm:grid-cols-2">{paymentDistribution.map(d => <div key={d.name} className="rounded-xl border bg-background/60 p-5"><p className="flex items-center gap-2 text-sm"><span className="h-3 w-3 rounded-full" style={{background:d.color}} />{d.name}</p><strong className="mt-2 block text-3xl" style={{color:d.color}}>{d.value}</strong><p className="mt-1 text-sm text-muted-foreground">{(d.value/billedClients.length*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}% dos clientes</p></div>)}</div>
        </div> : <p className="py-6 text-sm text-muted-foreground">Nenhum cliente com mensalidade nos filtros selecionados.</p>}
      </section>
      <section className="rounded-xl border p-4 space-y-3" aria-label="Linha do tempo dos pagamentos">
        <h2 className="font-semibold">Linha do tempo dos pagamentos</h2>
        <p className="text-sm text-muted-foreground">Mensalidades previstas por dia recorrente de pagamento. Considera clientes ativos, incluindo o mês já pago; exclui contratos quitados e permutas. A busca e o filtro também se aplicam ao gráfico.</p>
        <div className="rounded-xl bg-gradient-to-br from-blue-500/10 via-background to-violet-500/10 p-3">
          <div className="mb-3 flex items-center justify-between px-2"><span className="text-sm text-slate-300">Mensalidades do mês (MRR e TCV)</span><span className="font-semibold text-blue-400">{formatCurrency(timeline.reduce((sum,d) => sum+d.amount,0))} em mensalidades</span></div>
          <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={timeline} margin={{top:15,right:25,bottom:10,left:5}}>
            <defs><linearGradient id="paymentsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} /></linearGradient></defs>
            <CartesianGrid vertical={false} strokeDasharray="4 6" stroke="hsl(var(--border))" strokeOpacity={0.6} />
            <XAxis dataKey="day" ticks={[1,5,10,15,20,25,30]} axisLine={false} tickLine={false} tickMargin={12} tick={{fill:"hsl(var(--foreground))",fontSize:12}} tickFormatter={day => `Dia ${day}`} />
            <YAxis width={85} domain={[0, max => Math.max(max * 1.15,100)]} axisLine={false} tickLine={false} tickMargin={10} tick={{fill:"hsl(var(--muted-foreground))",fontSize:12}} tickFormatter={value => value >= 1000 ? `R$ ${(value/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})} mil` : `R$ ${value}`} />
            <Tooltip cursor={{stroke:"#60a5fa",strokeDasharray:"4 4"}} content={({active,payload}) => active && payload?.length ? <div className="rounded-xl border border-blue-500/30 bg-background p-4 shadow-xl"><p className="text-sm text-muted-foreground">Mensalidades no dia {payload[0].payload.day}</p><strong className="text-lg text-blue-400">{formatCurrency(payload[0].payload.amount)}</strong><p className="mt-1 text-xs text-muted-foreground">{payload[0].payload.count} cliente(s)</p></div> : null} />
            <Area type="monotone" dataKey="amount" name="Mensalidades" stroke="#3b82f6" strokeWidth={3} fill="url(#paymentsArea)" dot={false} activeDot={{r:6,fill:"#60a5fa",stroke:"hsl(var(--background))",strokeWidth:3}} />
          </AreaChart></ResponsiveContainer></div>
        </div>
        <div className="flex flex-wrap gap-3">{peaks.length ? peaks.map(d => <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-5 py-3" key={d.day}><strong>Dia {d.day} · {formatCurrency(d.amount)}</strong><p className="text-xs text-muted-foreground">{d.count} cliente(s)</p></div>) : <p className="text-sm text-muted-foreground">Nenhuma mensalidade ativa nos filtros selecionados.</p>}</div>
      </section>
      {meta.loading || google.loading ? <p>Carregando contratos…</p> : <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted/40 text-left"><tr>{["Cliente", "Ativo / pausado", "Tipo / duração", "Mensalidade", "Total do contrato (automático)", "Valor recebido", "LTV realizado", "A receber", "Dia de pagamento", "Data do pagamento", "Status do pagamento", "Ações"].map(h => <th className="p-3 whitespace-nowrap" key={h}>{h}</th>)}</tr></thead><tbody>{clients.map(client => <ContractRow key={client.id} client={client} save={saveContract} services={groups.find(g => g.client.id === client.id)!.services} />)}</tbody></table>{!clients.length && <p className="p-4">Nenhum cliente encontrado.</p>}</div>}
    </div>
  </DashboardLayout>;
}
