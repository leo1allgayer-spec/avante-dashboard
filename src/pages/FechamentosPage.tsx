import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import DateFilterBar from "@/components/DateFilterBar";
import { useLocalDateFilter } from "@/hooks/useLocalDateFilter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  FechamentoDiario,
  useCreateFechamentoDiario,
  useDeleteFechamentoDiario,
  useFechamentosDiarios,
  useUpdateFechamentoDiario,
} from "@/hooks/useFechamentosDiarios";
import { SERVICE_CATEGORIES } from "@/constants/serviceCategories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, CheckCircle2, Clock3, Layers3, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";

const STATUS_OPTIONS = ["a receber", "recebido", "cancelado"];

const defaultForm = {
  data: new Date().toISOString().split("T")[0],
  cliente: "",
  vendedor: "",
  produto_servico: "",
  categoria: "",
  valor_sinal: 0,
  valor_a_entrar: 0,
  valor_recorrente: 0,
  parcelas_total: "",
  valor_parcela: 0,
  previsao_entrada: "",
  status: "a receber",
  observacao: "",
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatDate = (date?: string | null) => {
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const normalizeStatus = (status?: string | null) => (status === "para entrar" ? "a receber" : status || "a receber");

const getCategoria = (item: Pick<FechamentoDiario, "categoria" | "produto_servico">) =>
  item.categoria || item.produto_servico || "Sem categoria";

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  if (normalized === "recebido") {
    return <Badge className="border-success/30 bg-success/15 text-success">Recebido</Badge>;
  }
  if (normalized === "cancelado") {
    return <Badge variant="outline" className="border-destructive/30 text-destructive">Cancelado</Badge>;
  }
  return <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-500">A receber</Badge>;
}

export default function FechamentosPage() {
  const { data: fechamentos = [], isLoading } = useFechamentosDiarios();
  const createFechamento = useCreateFechamentoDiario();
  const updateFechamento = useUpdateFechamentoDiario();
  const deleteFechamento = useDeleteFechamentoDiario();
  const dateFilter = useLocalDateFilter();
  const { session } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FechamentoDiario | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  const periodItems = dateFilter.filterByDate(fechamentos);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodItems.filter((item) => {
      if (statusFilter !== "todos" && normalizeStatus(item.status) !== statusFilter) return false;
      if (!q) return true;
      return [item.cliente, item.vendedor, getCategoria(item), item.produto_servico, item.observacao || ""]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [periodItems, search, statusFilter]);

  const totals = useMemo(() => {
    const ativos = filtered.filter((item) => normalizeStatus(item.status) !== "cancelado");
    const coletado = ativos.reduce((sum, item) => sum + Number(item.valor_sinal || 0), 0);
    const aReceber = ativos.reduce((sum, item) => sum + Number(item.valor_a_entrar || 0), 0);
    const recorrente = ativos.reduce((sum, item) => sum + Number(item.valor_recorrente || 0), 0);
    return {
      coletado,
      aReceber,
      total: coletado + aReceber,
      recorrente,
      quantidade: ativos.length,
    };
  }, [filtered]);

  const categoryTotals = useMemo(() => {
    const totalsByCategory = filtered
      .filter((item) => normalizeStatus(item.status) !== "cancelado")
      .reduce<Record<string, { total: number; coletado: number; aReceber: number; recorrente: number }>>((acc, item) => {
        const categoria = getCategoria(item);
        if (!acc[categoria]) acc[categoria] = { total: 0, coletado: 0, aReceber: 0, recorrente: 0 };

        const coletado = Number(item.valor_sinal || 0);
        const aReceber = Number(item.valor_a_entrar || 0);
        const recorrente = Number(item.valor_recorrente || 0);
        acc[categoria].coletado += coletado;
        acc[categoria].aReceber += aReceber;
        acc[categoria].recorrente += recorrente;
        acc[categoria].total += coletado + aReceber;
        return acc;
      }, {});

    return Object.entries(totalsByCategory)
      .map(([categoria, values]) => ({ categoria, ...values }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const openNewDialog = () => {
    setEditing(null);
    setForm({ ...defaultForm });
    setDialogOpen(true);
  };

  const openEditDialog = (item: FechamentoDiario) => {
    setEditing(item);
    setForm({
      data: item.data,
      cliente: item.cliente,
      vendedor: item.vendedor,
      produto_servico: item.produto_servico,
      categoria: getCategoria(item),
      valor_sinal: item.valor_sinal,
      valor_a_entrar: item.valor_a_entrar,
      valor_recorrente: item.valor_recorrente,
      parcelas_total: item.parcelas_total ? String(item.parcelas_total) : "",
      valor_parcela: item.valor_parcela,
      previsao_entrada: item.previsao_entrada || "",
      status: normalizeStatus(item.status),
      observacao: item.observacao || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.user?.id) return;
    if (!form.cliente.trim()) {
      toast({ title: "Informe o cliente", variant: "destructive" });
      return;
    }

    const categoria = form.categoria || form.produto_servico.trim();
    const payload = {
      user_id: session.user.id,
      data: form.data,
      cliente: form.cliente.trim(),
      vendedor: form.vendedor.trim(),
      produto_servico: categoria,
      categoria,
      valor_sinal: Number(form.valor_sinal || 0),
      valor_a_entrar: Number(form.valor_a_entrar || 0),
      valor_recorrente: Number(form.valor_recorrente || 0),
      parcelas_total: form.parcelas_total ? Number(form.parcelas_total) : null,
      valor_parcela: Number(form.valor_parcela || 0),
      previsao_entrada: form.previsao_entrada || null,
      status: normalizeStatus(form.status),
      observacao: form.observacao.trim() || null,
    };

    if (editing) {
      updateFechamento.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            toast({ title: "Fechamento atualizado!" });
            setDialogOpen(false);
            setEditing(null);
            setForm({ ...defaultForm });
          },
          onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
        },
      );
      return;
    }

    createFechamento.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Fechamento registrado!" });
        setDialogOpen(false);
        setForm({ ...defaultForm });
      },
      onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
    });
  };

  const actions = (
    <Button onClick={openNewDialog} className="gap-2">
      <Plus className="h-4 w-4" />
      Registrar fechamento
    </Button>
  );

  return (
    <DashboardLayout title="Fechamentos Diarios" subtitle="Valores coletados, a receber e recorrentes mensais" actions={actions}>
      <PageTransition>
        <DateFilterBar
          mode={dateFilter.mode}
          onModeChange={dateFilter.setMode}
          label={dateFilter.label}
          onBack={dateFilter.goBack}
          onForward={dateFilter.goForward}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Wallet className="h-4 w-4 text-success" /> Valor coletado
              </CardTitle>
            </CardHeader>
            <CardContent className="font-display text-2xl font-bold">{formatBRL(totals.coletado)}</CardContent>
          </Card>
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Clock3 className="h-4 w-4 text-amber-500" /> A receber
              </CardTitle>
            </CardHeader>
            <CardContent className="font-display text-2xl font-bold">{formatBRL(totals.aReceber)}</CardContent>
          </Card>
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <CalendarClock className="h-4 w-4 text-primary" /> Total do periodo
              </CardTitle>
            </CardHeader>
            <CardContent className="font-display text-2xl font-bold">{formatBRL(totals.total)}</CardContent>
          </Card>
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Layers3 className="h-4 w-4 text-accent" /> Recorrente mensal
              </CardTitle>
            </CardHeader>
            <CardContent className="font-display text-2xl font-bold">{formatBRL(totals.recorrente)}</CardContent>
          </Card>
        </div>

        <Card className="border-border/50 bg-card/70">
          <CardHeader>
            <CardTitle>Totais por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma categoria encontrada no periodo.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {categoryTotals.map((item) => (
                  <div key={item.categoria} className="rounded-lg border border-border/50 bg-background/40 p-4">
                    <div className="text-sm font-semibold">{item.categoria}</div>
                    <div className="mt-3 font-display text-xl font-bold">{formatBRL(item.total)}</div>
                    <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                      <span>Coletado: {formatBRL(item.coletado)}</span>
                      <span>A receber: {formatBRL(item.aReceber)}</span>
                      <span>Recorrente: {formatBRL(item.recorrente)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Lista de fechamentos</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Controle os valores coletados no dia, o que ainda vai entrar e os recorrentes.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar cliente, vendedor..."
                    className="pl-9 sm:w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="sm:w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Coletado</TableHead>
                    <TableHead className="text-right">A receber</TableHead>
                    <TableHead className="text-right">Recorrente</TableHead>
                    <TableHead>Previsao</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhum fechamento encontrado.</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(item.data)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{item.cliente}</div>
                          {item.vendedor && <div className="text-xs text-muted-foreground">{item.vendedor}</div>}
                        </TableCell>
                        <TableCell>
                          <div>{getCategoria(item)}</div>
                          {item.parcelas_total && (
                            <div className="text-xs text-muted-foreground">
                              {item.parcelas_total}x de {formatBRL(Number(item.valor_parcela || 0))}
                            </div>
                          )}
                          {item.observacao && <div className="max-w-xs truncate text-xs text-muted-foreground">{item.observacao}</div>}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-success">{formatBRL(item.valor_sinal)}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-500">{formatBRL(item.valor_a_entrar)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatBRL(item.valor_recorrente)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(item.previsao_entrada)}</TableCell>
                        <TableCell><StatusBadge status={item.status} /></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {normalizeStatus(item.status) === "a receber" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-success"
                                title="Marcar como recebido"
                                onClick={() => updateFechamento.mutate({ id: item.id, status: "recebido" })}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteFechamento.mutate(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar fechamento" : "Registrar fechamento"}</DialogTitle>
              <DialogDescription>
                Lance o valor coletado, o que esta a receber, recorrentes e parcelas.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(status) => setForm((prev) => ({ ...prev, status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input value={form.cliente} onChange={(event) => setForm((prev) => ({ ...prev, cliente: event.target.value }))} placeholder="Nome do cliente" required />
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Input value={form.vendedor} onChange={(event) => setForm((prev) => ({ ...prev, vendedor: event.target.value }))} placeholder="Quem fechou" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(categoria) => setForm((prev) => ({ ...prev, categoria, produto_servico: categoria }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((categoria) => (
                      <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor coletado</Label>
                <Input type="number" step="0.01" value={form.valor_sinal || ""} onChange={(event) => setForm((prev) => ({ ...prev, valor_sinal: Number(event.target.value) }))} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Valor a receber</Label>
                <Input type="number" step="0.01" value={form.valor_a_entrar || ""} onChange={(event) => setForm((prev) => ({ ...prev, valor_a_entrar: Number(event.target.value) }))} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Recorrente mensal</Label>
                <Input type="number" step="0.01" value={form.valor_recorrente || ""} onChange={(event) => setForm((prev) => ({ ...prev, valor_recorrente: Number(event.target.value) }))} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Previsao de entrada</Label>
                <Input type="date" value={form.previsao_entrada} onChange={(event) => setForm((prev) => ({ ...prev, previsao_entrada: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Quantidade de parcelas</Label>
                <Input type="number" min="1" step="1" value={form.parcelas_total} onChange={(event) => setForm((prev) => ({ ...prev, parcelas_total: event.target.value }))} placeholder="Ex: 3" />
              </div>
              <div className="space-y-2">
                <Label>Valor da parcela</Label>
                <Input type="number" step="0.01" value={form.valor_parcela || ""} onChange={(event) => setForm((prev) => ({ ...prev, valor_parcela: Number(event.target.value) }))} placeholder="0,00" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observacao</Label>
                <Textarea value={form.observacao} onChange={(event) => setForm((prev) => ({ ...prev, observacao: event.target.value }))} placeholder="Forma de pagamento, condicao combinada, parcelas..." rows={3} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full" disabled={createFechamento.isPending || updateFechamento.isPending}>
                  {editing ? "Salvar alteracoes" : "Registrar fechamento"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </DashboardLayout>
  );
}
