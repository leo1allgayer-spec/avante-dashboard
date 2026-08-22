import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { useBoletos, useConfirmarBoleto, useCriarRecorrenciaManual } from "@/hooks/useBoletos";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CalendarClock, CheckCircle2, Clock3, Plus, ReceiptText, Search } from "lucide-react";

const formatBRL = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
type BoletoArea = "todos" | "crm" | "sites" | "outros";

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const getBoletoArea = (category: string): Exclude<BoletoArea, "todos"> => {
  const normalized = normalize(category);
  if (normalized.includes("crm") || normalized.includes("treinamento comercial")) return "crm";
  if (normalized.includes("site")) return "sites";
  return "outros";
};

export default function BoletosPage() {
  const { data: boletos = [], isLoading } = useBoletos();
  const confirmar = useConfirmarBoleto();
  const criarRecorrencia = useCriarRecorrenciaManual();
  const { toast } = useToast();
  const [status, setStatus] = useState("pendente");
  const [area, setArea] = useState<BoletoArea>("todos");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paidDate, setPaidDate] = useState(today());
  const [showCreate, setShowCreate] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ cliente: "", servico: "", valor: "", primeiroVencimento: today(), meses: "12" });

  const scopedBoletos = useMemo(() => boletos.filter((boleto) => {
    if (area === "todos") return true;
    const category = boleto.fechamento?.categoria || boleto.fechamento?.produto_servico || "";
    return getBoletoArea(category) === area;
  }), [area, boletos]);

  const rows = useMemo(() => scopedBoletos.filter((boleto) => {
    if (status !== "todos" && boleto.status !== status) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${boleto.fechamento?.cliente || ""} ${boleto.fechamento?.categoria || boleto.fechamento?.produto_servico || ""}`.toLowerCase().includes(term);
  }), [scopedBoletos, status, search]);

  const pending = scopedBoletos.filter((item) => item.status === "pendente");
  const overdue = pending.filter((item) => item.vencimento < today());
  const paid = scopedBoletos.filter((item) => item.status === "pago");
  const selected = boletos.find((item) => item.id === selectedId);
  const remainingBySale = useMemo(() => boletos.reduce<Record<string, number>>((totals, boleto) => {
    if (boleto.status === "pendente") {
      totals[boleto.fechamento_id] = (totals[boleto.fechamento_id] || 0) + Number(boleto.valor);
    }
    return totals;
  }, {}), [boletos]);

  const areaCounts = useMemo(() => boletos.reduce<Record<Exclude<BoletoArea, "todos">, number>>((counts, boleto) => {
    const category = boleto.fechamento?.categoria || boleto.fechamento?.produto_servico || "";
    counts[getBoletoArea(category)] += 1;
    return counts;
  }, { crm: 0, sites: 0, outros: 0 }), [boletos]);

  const confirmPayment = async () => {
    if (!selectedId) return;
    try {
      await confirmar.mutateAsync({ id: selectedId, pagoEm: paidDate, manual: selected?.origem_manual });
      toast({ title: "Pagamento confirmado", description: selected?.origem_manual ? "A mensalidade recorrente foi marcada como paga." : "O valor foi adicionado ao coletado da venda e o saldo foi atualizado." });
      setSelectedId(null);
    } catch (error: any) {
      toast({ title: "Erro ao confirmar boleto", description: error.message, variant: "destructive" });
    }
  };

  const createRecurrence = async () => {
    if (area !== "crm" && area !== "sites") return;
    const valor = Number(recurringForm.valor.replace(",", "."));
    const meses = Number(recurringForm.meses);
    if (!recurringForm.cliente.trim() || !recurringForm.servico.trim() || valor <= 0 || meses <= 0) {
      toast({ title: "Preencha os dados da recorrência", variant: "destructive" });
      return;
    }
    try {
      await criarRecorrencia.mutateAsync({ tipo: area, cliente: recurringForm.cliente, servico: recurringForm.servico, valor, primeiroVencimento: recurringForm.primeiroVencimento, meses });
      setRecurringForm({ cliente: "", servico: "", valor: "", primeiroVencimento: today(), meses: "12" });
      setShowCreate(false);
      toast({ title: "Recorrência cadastrada", description: `${meses} mensalidade(s) foram incluídas sem criar uma venda.` });
    } catch (error: any) {
      toast({ title: "Erro ao cadastrar recorrência", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Boletos" subtitle="Controle de parcelas, vencimentos e pagamentos confirmados">
      <PageTransition>
        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Pendente</p><p className="mt-1 text-2xl font-bold text-amber-400">{formatBRL(pending.reduce((sum, item) => sum + Number(item.valor), 0))}</p><p className="text-xs text-muted-foreground">{pending.length} parcela(s)</p></div><Clock3 className="h-7 w-7 text-amber-400" /></CardContent></Card>
            <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Atrasado</p><p className="mt-1 text-2xl font-bold text-destructive">{formatBRL(overdue.reduce((sum, item) => sum + Number(item.valor), 0))}</p><p className="text-xs text-muted-foreground">{overdue.length} parcela(s)</p></div><CalendarClock className="h-7 w-7 text-destructive" /></CardContent></Card>
            <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Pago</p><p className="mt-1 text-2xl font-bold text-success">{formatBRL(paid.reduce((sum, item) => sum + Number(item.valor), 0))}</p><p className="text-xs text-muted-foreground">{paid.length} parcela(s)</p></div><CheckCircle2 className="h-7 w-7 text-success" /></CardContent></Card>
          </div>

          <Card><CardContent className="p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={area === "todos" ? "default" : "outline"} onClick={() => setArea("todos")}>Todos ({boletos.length})</Button>
              <Button type="button" size="sm" variant={area === "crm" ? "default" : "outline"} onClick={() => setArea("crm")}>CRM recorrência ({areaCounts.crm})</Button>
              <Button type="button" size="sm" variant={area === "sites" ? "default" : "outline"} onClick={() => setArea("sites")}>Sites recorrência ({areaCounts.sites})</Button>
              <Button type="button" size="sm" variant={area === "outros" ? "default" : "outline"} onClick={() => setArea("outros")}>Outros boletos ({areaCounts.outros})</Button>
              {(area === "crm" || area === "sites") && <Button type="button" size="sm" className="ml-auto" onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" />Cadastrar recorrência</Button>}
            </div>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente ou produto..." className="pl-9" /></div>
              <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendentes</SelectItem><SelectItem value="pago">Pagos</SelectItem><SelectItem value="todos">Todos</SelectItem></SelectContent></Select>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <Table>
                <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Produto/serviço</TableHead><TableHead>Parcela</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Saldo restante</TableHead><TableHead>Status</TableHead><TableHead>Pago em</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={9}>Carregando boletos...</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Nenhum boleto encontrado.</TableCell></TableRow> : rows.map((boleto) => {
                    const isOverdue = boleto.status === "pendente" && boleto.vencimento < today();
                    return <TableRow key={boleto.id}>
                      <TableCell className="font-semibold">{boleto.fechamento?.cliente || "—"}</TableCell>
                      <TableCell>{boleto.fechamento?.categoria || boleto.fechamento?.produto_servico || "—"}</TableCell>
                      <TableCell>{boleto.parcela_numero}/{boleto.fechamento?.parcelas_total || "—"}</TableCell>
                      <TableCell className={isOverdue ? "font-semibold text-destructive" : ""}>{formatDate(boleto.vencimento)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatBRL(Number(boleto.valor))}</TableCell>
                      <TableCell className="text-right font-semibold text-amber-400">{formatBRL(remainingBySale[boleto.fechamento_id] || 0)}</TableCell>
                      <TableCell><Badge variant={boleto.status === "pago" ? "default" : isOverdue ? "destructive" : "secondary"}>{boleto.status === "pago" ? "Pago" : isOverdue ? "Atrasado" : "Pendente"}</Badge></TableCell>
                      <TableCell>{boleto.pago_em ? formatDate(boleto.pago_em) : "—"}</TableCell>
                      <TableCell className="text-right">{boleto.status === "pendente" && <Button size="sm" onClick={() => { setPaidDate(today()); setSelectedId(boleto.id); }}><ReceiptText className="mr-1 h-4 w-4" />Confirmar pagamento</Button>}</TableCell>
                    </TableRow>;
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </div>

        <AlertDialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar pagamento do boleto?</AlertDialogTitle><AlertDialogDescription>{selected ? `${selected.fechamento?.cliente} · parcela ${selected.parcela_numero} · ${formatBRL(Number(selected.valor))}` : ""}. Depois da confirmação, o valor será lançado como coletado na venda.</AlertDialogDescription></AlertDialogHeader><div><label className="mb-1 block text-sm text-muted-foreground">Data do pagamento</label><Input type="date" value={paidDate} onChange={(event) => setPaidDate(event.target.value)} /></div><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={confirmar.isPending} onClick={(event) => { event.preventDefault(); void confirmPayment(); }}>{confirmar.isPending ? "Confirmando..." : "Confirmar pagamento"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova recorrência de {area === "crm" ? "CRM" : "site"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Cliente</Label><Input value={recurringForm.cliente} onChange={(e) => setRecurringForm((v) => ({ ...v, cliente: e.target.value }))} /></div>
              <div className="sm:col-span-2"><Label>Serviço</Label><Input value={recurringForm.servico} onChange={(e) => setRecurringForm((v) => ({ ...v, servico: e.target.value }))} placeholder={area === "crm" ? "Mensalidade CRM" : "Hospedagem/manutenção do site"} /></div>
              <div><Label>Valor mensal</Label><Input type="number" min="0.01" step="0.01" value={recurringForm.valor} onChange={(e) => setRecurringForm((v) => ({ ...v, valor: e.target.value }))} /></div>
              <div><Label>Quantidade de meses</Label><Input type="number" min="1" max="120" value={recurringForm.meses} onChange={(e) => setRecurringForm((v) => ({ ...v, meses: e.target.value }))} /></div>
              <div className="sm:col-span-2"><Label>Primeiro vencimento</Label><Input type="date" value={recurringForm.primeiroVencimento} onChange={(e) => setRecurringForm((v) => ({ ...v, primeiroVencimento: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button><Button disabled={criarRecorrencia.isPending} onClick={() => void createRecurrence()}>{criarRecorrencia.isPending ? "Salvando..." : "Cadastrar"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </DashboardLayout>
  );
}
