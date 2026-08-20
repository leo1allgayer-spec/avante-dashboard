import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { useBoletos, useConfirmarBoleto } from "@/hooks/useBoletos";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CalendarClock, CheckCircle2, Clock3, ReceiptText, Search } from "lucide-react";

const formatBRL = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export default function BoletosPage() {
  const { data: boletos = [], isLoading } = useBoletos();
  const confirmar = useConfirmarBoleto();
  const { toast } = useToast();
  const [status, setStatus] = useState("pendente");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paidDate, setPaidDate] = useState(today());

  const rows = useMemo(() => boletos.filter((boleto) => {
    if (status !== "todos" && boleto.status !== status) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${boleto.fechamento?.cliente || ""} ${boleto.fechamento?.categoria || boleto.fechamento?.produto_servico || ""}`.toLowerCase().includes(term);
  }), [boletos, status, search]);

  const pending = boletos.filter((item) => item.status === "pendente");
  const overdue = pending.filter((item) => item.vencimento < today());
  const paid = boletos.filter((item) => item.status === "pago");
  const selected = boletos.find((item) => item.id === selectedId);

  const confirmPayment = async () => {
    if (!selectedId) return;
    try {
      await confirmar.mutateAsync({ id: selectedId, pagoEm: paidDate });
      toast({ title: "Boleto confirmado", description: "O valor foi adicionado ao coletado da venda e o saldo foi atualizado." });
      setSelectedId(null);
    } catch (error: any) {
      toast({ title: "Erro ao confirmar boleto", description: error.message, variant: "destructive" });
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
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente ou produto..." className="pl-9" /></div>
              <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendentes</SelectItem><SelectItem value="pago">Pagos</SelectItem><SelectItem value="todos">Todos</SelectItem></SelectContent></Select>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <Table>
                <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Produto/serviço</TableHead><TableHead>Parcela</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead><TableHead>Pago em</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={8}>Carregando boletos...</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Nenhum boleto encontrado.</TableCell></TableRow> : rows.map((boleto) => {
                    const isOverdue = boleto.status === "pendente" && boleto.vencimento < today();
                    return <TableRow key={boleto.id}>
                      <TableCell className="font-semibold">{boleto.fechamento?.cliente || "—"}</TableCell>
                      <TableCell>{boleto.fechamento?.categoria || boleto.fechamento?.produto_servico || "—"}</TableCell>
                      <TableCell>{boleto.parcela_numero}/{boleto.fechamento?.parcelas_total || "—"}</TableCell>
                      <TableCell className={isOverdue ? "font-semibold text-destructive" : ""}>{formatDate(boleto.vencimento)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatBRL(Number(boleto.valor))}</TableCell>
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
      </PageTransition>
    </DashboardLayout>
  );
}
