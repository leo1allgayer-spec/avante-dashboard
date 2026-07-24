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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, CheckCircle2, Clock3, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";

const STATUS_OPTIONS = ["para entrar", "recebido", "cancelado"];

const defaultForm = {
  data: new Date().toISOString().split("T")[0],
  cliente: "",
  vendedor: "",
  produto_servico: "",
  valor_sinal: 0,
  valor_a_entrar: 0,
  previsao_entrada: "",
  status: "para entrar",
  observacao: "",
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatDate = (date?: string | null) => {
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "recebido") {
    return <Badge className="bg-success/15 text-success border-success/30">Recebido</Badge>;
  }
  if (status === "cancelado") {
    return <Badge variant="outline" className="border-destructive/30 text-destructive">Cancelado</Badge>;
  }
  return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">Para entrar</Badge>;
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
      if (statusFilter !== "todos" && item.status !== statusFilter) return false;
      if (!q) return true;
      return [item.cliente, item.vendedor, item.produto_servico, item.observacao || ""]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [periodItems, search, statusFilter]);

  const totals = useMemo(() => {
    const ativos = filtered.filter((item) => item.status !== "cancelado");
    const sinal = ativos.reduce((sum, item) => sum + Number(item.valor_sinal || 0), 0);
    const aEntrar = ativos.reduce((sum, item) => sum + Number(item.valor_a_entrar || 0), 0);
    const recebido = ativos
      .filter((item) => item.status === "recebido")
      .reduce((sum, item) => sum + Number(item.valor_a_entrar || 0), 0);
    return {
      sinal,
      aEntrar,
      previsto: sinal + aEntrar,
      recebido,
      quantidade: ativos.length,
    };
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
      valor_sinal: item.valor_sinal,
      valor_a_entrar: item.valor_a_entrar,
      previsao_entrada: item.previsao_entrada || "",
      status: item.status,
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

    const payload = {
      user_id: session.user.id,
      data: form.data,
      cliente: form.cliente.trim(),
      vendedor: form.vendedor.trim(),
      produto_servico: form.produto_servico.trim(),
      valor_sinal: Number(form.valor_sinal || 0),
      valor_a_entrar: Number(form.valor_a_entrar || 0),
      previsao_entrada: form.previsao_entrada || null,
      status: form.status,
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
    <DashboardLayout title="Fechamentos Diários" subtitle="Sinais recebidos e valores previstos para entrar" actions={actions}>
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
                <Wallet className="h-4 w-4 text-success" /> Sinal recebido
              </CardTitle>
            </CardHeader>
            <CardContent className="font-display text-2xl font-bold">{formatBRL(totals.sinal)}</CardContent>
          </Card>
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Clock3 className="h-4 w-4 text-amber-500" /> Para entrar
              </CardTitle>
            </CardHeader>
            <CardContent className="font-display text-2xl font-bold">{formatBRL(totals.aEntrar)}</CardContent>
          </Card>
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <CalendarClock className="h-4 w-4 text-primary" /> Total previsto
              </CardTitle>
            </CardHeader>
            <CardContent className="font-display text-2xl font-bold">{formatBRL(totals.previsto)}</CardContent>
          </Card>
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent" /> Fechamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="font-display text-2xl font-bold">{totals.quantidade}</CardContent>
          </Card>
        </div>

        <Card className="border-border/50 bg-card/70">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Lista de fechamentos</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Controle os sinais recebidos no dia e os valores que ainda vão entrar.
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
                    <TableHead>Produto/serviço</TableHead>
                    <TableHead className="text-right">Sinal</TableHead>
                    <TableHead className="text-right">Para entrar</TableHead>
                    <TableHead>Previsão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Nenhum fechamento encontrado.</TableCell>
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
                          <div>{item.produto_servico || "-"}</div>
                          {item.observacao && <div className="max-w-xs truncate text-xs text-muted-foreground">{item.observacao}</div>}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-success">{formatBRL(item.valor_sinal)}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-500">{formatBRL(item.valor_a_entrar)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(item.previsao_entrada)}</TableCell>
                        <TableCell><StatusBadge status={item.status} /></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {item.status === "para entrar" && (
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
                Lance o sinal recebido e o valor que ainda está previsto para entrar.
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
                <Label>Produto ou serviço</Label>
                <Input value={form.produto_servico} onChange={(event) => setForm((prev) => ({ ...prev, produto_servico: event.target.value }))} placeholder="Curso, CRM, Site, Upsell..." />
              </div>
              <div className="space-y-2">
                <Label>Valor de sinal recebido</Label>
                <Input type="number" step="0.01" value={form.valor_sinal || ""} onChange={(event) => setForm((prev) => ({ ...prev, valor_sinal: Number(event.target.value) }))} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Valor para entrar</Label>
                <Input type="number" step="0.01" value={form.valor_a_entrar || ""} onChange={(event) => setForm((prev) => ({ ...prev, valor_a_entrar: Number(event.target.value) }))} placeholder="0,00" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Previsão de entrada</Label>
                <Input type="date" value={form.previsao_entrada} onChange={(event) => setForm((prev) => ({ ...prev, previsao_entrada: event.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observação</Label>
                <Textarea value={form.observacao} onChange={(event) => setForm((prev) => ({ ...prev, observacao: event.target.value }))} placeholder="Forma de pagamento, condição combinada, parcelas..." rows={3} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full" disabled={createFechamento.isPending || updateFechamento.isPending}>
                  {editing ? "Salvar alterações" : "Registrar fechamento"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </DashboardLayout>
  );
}
