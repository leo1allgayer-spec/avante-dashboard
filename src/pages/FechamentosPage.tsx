import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import DateFilterBar from "@/components/DateFilterBar";
import { useLocalDateFilter } from "@/hooks/useLocalDateFilter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useClients as useGestaoClients } from "@/hooks/clients/useGestaoClients";
import {
  FechamentoDiario,
  useCreateFechamentoDiario,
  useDeleteFechamentoDiario,
  useFechamentosDiarios,
  useUpdateFechamentoDiario,
} from "@/hooks/useFechamentosDiarios";
import { useVendas } from "@/hooks/useVendas";
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
import { CalendarClock, CheckCircle2, Clock3, Layers3, Pencil, Plus, Search, ShoppingCart, Trash2, TrendingUp, Wallet } from "lucide-react";

const STATUS_OPTIONS = ["a receber", "recebido", "cancelado"];
const ORIGEM_OPTIONS = ["Anuncio", "Upsell", "Indicacao", "Social Seller", "Influencers"];

const defaultItem = {
  produto_servico: "",
  categoria: "",
  valor_sinal: 0,
  valor_a_entrar: 0,
  valor_recorrente: 0,
  parcelas_total: "",
  valor_parcela: 0,
  previsao_entrada: "",
  parcelas_datas: [] as string[],
  observacao: "",
};

const defaultForm = {
  data: new Date().toISOString().split("T")[0],
  cliente: "",
  vendedor: "",
  origem: "",
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
  items: [{ ...defaultItem }],
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatDate = (date?: string | null) => {
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const normalizeStatus = (status?: string | null) => (status === "para entrar" ? "a receber" : status || "a receber");

const addMonths = (date: string, months: number) => {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, month - 1 + months, day);
  return next.toISOString().split("T")[0];
};

const buildParcelDates = (total: string | number | null | undefined, firstDate: string, current: string[] = []) => {
  const count = Math.max(0, Number(total || 0));
  if (count <= 1) return [];
  return Array.from({ length: count }, (_, index) => current[index] || addMonths(firstDate, index));
};

const getStoredParcelDates = (item: Pick<FechamentoDiario, "parcelas_datas">) =>
  Array.isArray(item.parcelas_datas) ? item.parcelas_datas.filter((date): date is string => typeof date === "string" && !!date) : [];

const getCategoria = (item: Pick<FechamentoDiario, "categoria" | "produto_servico">) =>
  item.categoria || item.produto_servico || "Sem categoria";

const getVendaCategoria = (item: { servico?: string | null; produto?: string | null }) =>
  item.servico || item.produto || "Sem categoria";

const nameKey = (value: string) => value.trim().toLowerCase().replace(/^@/, "");

type FechamentoForm = typeof defaultForm;
type FechamentoItemForm = typeof defaultItem;

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
  const { data: vendas = [], isLoading: loadingVendas } = useVendas();
  const createFechamento = useCreateFechamentoDiario();
  const updateFechamento = useUpdateFechamentoDiario();
  const deleteFechamento = useDeleteFechamentoDiario();
  const { clients: gestaoClients } = useGestaoClients();
  const dateFilter = useLocalDateFilter();
  const { session } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [origemFilter, setOrigemFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FechamentoDiario | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  const dateInRange = (date?: string | null) => !!date && date >= dateFilter.range.start && date <= dateFilter.range.end;

  const getAReceberNoPeriodo = (item: FechamentoDiario) => {
    const parcelasNoPeriodo = getStoredParcelDates(item).filter(dateInRange);
    if (parcelasNoPeriodo.length > 0 && Number(item.valor_parcela || 0) > 0) {
      return parcelasNoPeriodo.length * Number(item.valor_parcela || 0);
    }
    if (dateInRange(item.previsao_entrada)) return Number(item.valor_a_entrar || 0);
    if (dateInRange(item.data) && !item.previsao_entrada && getStoredParcelDates(item).length === 0) {
      return Number(item.valor_a_entrar || 0);
    }
    return 0;
  };

  const periodItems = useMemo(() => {
    return fechamentos.filter((item) => {
      const hasRecurringInPeriod = Number(item.valor_recorrente || 0) > 0 && item.data <= dateFilter.range.end;
      return (
        dateInRange(item.data) ||
        dateInRange(item.previsao_entrada) ||
        getStoredParcelDates(item).some(dateInRange) ||
        hasRecurringInPeriod
      );
    });
  }, [fechamentos, dateFilter.range.start, dateFilter.range.end]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodItems.filter((item) => {
      if (statusFilter !== "todos" && normalizeStatus(item.status) !== statusFilter) return false;
      if (origemFilter !== "todos" && (item.origem || "") !== origemFilter) return false;
      if (!q) return true;
      return [item.cliente, item.vendedor, item.origem || "", getCategoria(item), item.produto_servico, item.observacao || ""]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [periodItems, search, statusFilter, origemFilter]);

  const totals = useMemo(() => {
    const ativos = filtered.filter((item) => normalizeStatus(item.status) !== "cancelado");
    const coletado = ativos.reduce((sum, item) => sum + (dateInRange(item.data) ? Number(item.valor_sinal || 0) : 0), 0);
    const aReceber = ativos.reduce((sum, item) => sum + getAReceberNoPeriodo(item), 0);
    const recorrente = origemFilter === "todos"
      ? gestaoClients
          .filter((client) => client.status === "Ativo")
          .reduce((sum, client) => sum + Number(client.contractValue || 0), 0)
      : ativos.reduce((sum, item) => sum + Number(item.valor_recorrente || 0), 0);
    return {
      coletado,
      aReceber,
      total: coletado + aReceber,
      recorrente,
      quantidade: ativos.length,
    };
  }, [filtered, gestaoClients, origemFilter, dateFilter.range.start, dateFilter.range.end]);

  const categoryTotals = useMemo(() => {
    const totalsByCategory = filtered
      .filter((item) => normalizeStatus(item.status) !== "cancelado")
      .reduce<Record<string, { total: number; coletado: number; aReceber: number; recorrente: number }>>((acc, item) => {
        const categoria = getCategoria(item);
        if (!acc[categoria]) acc[categoria] = { total: 0, coletado: 0, aReceber: 0, recorrente: 0 };

        const coletado = dateInRange(item.data) ? Number(item.valor_sinal || 0) : 0;
        const aReceber = getAReceberNoPeriodo(item);
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

  const vendasPeriodo = useMemo(() => {
    return vendas.filter((venda) => dateInRange(venda.data));
  }, [vendas, dateFilter.range.start, dateFilter.range.end]);

  const vendasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendasPeriodo.filter((venda) => {
      if (statusFilter !== "todos" && venda.status !== statusFilter) return false;
      if (origemFilter !== "todos" && (venda.origem || "") !== origemFilter) return false;
      if (!q) return true;
      return [venda.cliente, venda.vendedor, venda.produto, venda.servico || "", venda.origem || "", venda.pagamento]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [vendasPeriodo, search, statusFilter, origemFilter]);

  const vendasAprovadas = useMemo(
    () => vendasFiltradas.filter((venda) => venda.status === "aprovada"),
    [vendasFiltradas],
  );

  const vendasTotals = useMemo(() => {
    const feito = vendasAprovadas.reduce((sum, venda) => sum + Number(venda.valor || 0), 0);
    const liquido = vendasAprovadas.reduce((sum, venda) => sum + Number(venda.valor_com_juros || venda.valor || 0), 0);
    const comissao = vendasAprovadas.reduce((sum, venda) => sum + Number(venda.comissao || 0), 0);
    return {
      feito,
      liquido,
      comissao,
      quantidade: vendasAprovadas.length,
    };
  }, [vendasAprovadas]);

  const integratedCategoryRows = useMemo(() => {
    const map = new Map<string, {
      categoria: string;
      coletado: number;
      aReceber: number;
      recorrente: number;
      feito: number;
      vendas: number;
    }>();

    const getRow = (categoria: string) => {
      if (!map.has(categoria)) {
        map.set(categoria, { categoria, coletado: 0, aReceber: 0, recorrente: 0, feito: 0, vendas: 0 });
      }
      return map.get(categoria)!;
    };

    filtered
      .filter((item) => normalizeStatus(item.status) !== "cancelado")
      .forEach((item) => {
        const row = getRow(getCategoria(item));
        row.coletado += dateInRange(item.data) ? Number(item.valor_sinal || 0) : 0;
        row.aReceber += getAReceberNoPeriodo(item);
        row.recorrente += Number(item.valor_recorrente || 0);
      });

    vendasAprovadas.forEach((venda) => {
      const row = getRow(getVendaCategoria(venda));
      row.feito += Number(venda.valor || 0);
      row.vendas += 1;
    });

    return Array.from(map.values()).sort((a, b) => (b.coletado + b.aReceber + b.feito) - (a.coletado + a.aReceber + a.feito));
  }, [filtered, vendasAprovadas, dateFilter.range.start, dateFilter.range.end]);

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
      origem: item.origem || "",
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
      items: [{
        produto_servico: item.produto_servico,
        categoria: getCategoria(item),
        valor_sinal: item.valor_sinal,
        valor_a_entrar: item.valor_a_entrar,
        valor_recorrente: item.valor_recorrente,
        parcelas_total: item.parcelas_total ? String(item.parcelas_total) : "",
        valor_parcela: item.valor_parcela,
        previsao_entrada: item.previsao_entrada || "",
        parcelas_datas: item.parcelas_datas || [],
        observacao: item.observacao || "",
      }],
    });
    setDialogOpen(true);
  };

  const findGestaoClient = (clienteNome: string) => {
    const query = nameKey(clienteNome);
    if (!query) return null;

    const exactMatch = gestaoClients.find((client) =>
      [client.name, client.company, client.instagram].some((value) => nameKey(value || "") === query),
    );
    if (exactMatch) return exactMatch;

    const partialMatches = gestaoClients.filter((client) =>
      [client.name, client.company, client.instagram].some((value) => nameKey(value || "").includes(query)),
    );

    return partialMatches.length === 1 ? partialMatches[0] : null;
  };

  const applyClientFromGestao = (clienteNome: string) => {
    const selectedClient = findGestaoClient(clienteNome);

    if (!selectedClient) {
      setForm((prev) => ({ ...prev, cliente: clienteNome }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      cliente: selectedClient.name,
      vendedor: prev.vendedor || selectedClient.manager,
      valor_recorrente: selectedClient.status === "Ativo" ? Number(selectedClient.contractValue || 0) : 0,
      previsao_entrada: prev.previsao_entrada || selectedClient.nextChargeDate || "",
      items: prev.items.map((item, index) => index === 0
        ? {
            ...item,
            valor_recorrente: item.valor_recorrente || (selectedClient.status === "Ativo" ? Number(selectedClient.contractValue || 0) : 0),
            previsao_entrada: item.previsao_entrada || selectedClient.nextChargeDate || "",
            parcelas_datas: buildParcelDates(item.parcelas_total, item.previsao_entrada || selectedClient.nextChargeDate || "", item.parcelas_datas),
          }
        : item),
    }));
  };

  const updateItem = (index: number, updates: Partial<FechamentoItemForm>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, ...updates };
        if ("parcelas_total" in updates || "previsao_entrada" in updates) {
          next.parcelas_datas = buildParcelDates(next.parcelas_total, next.previsao_entrada, next.parcelas_datas);
        }
        return next;
      }),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...defaultItem }] }));
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.user?.id) return;

    const filledItems = form.items.filter((item) =>
      item.categoria ||
      item.produto_servico.trim() ||
      Number(item.valor_sinal || 0) ||
      Number(item.valor_a_entrar || 0) ||
      Number(item.valor_recorrente || 0) ||
      Number(item.parcelas_total || 0) ||
      item.observacao.trim(),
    );

    if (filledItems.length === 0) {
      toast({ title: "Preencha pelo menos uma informacao do fechamento", variant: "destructive" });
      return;
    }

    const buildPayload = (item: FechamentoItemForm) => {
      const categoria = item.categoria || item.produto_servico.trim() || "Sem categoria";
      const parcelasDatas = buildParcelDates(item.parcelas_total, item.previsao_entrada, item.parcelas_datas).filter(Boolean);
      return {
      user_id: session.user.id,
      data: form.data || new Date().toISOString().split("T")[0],
      cliente: form.cliente.trim() || "Sem cliente",
      vendedor: form.vendedor.trim(),
      origem: form.origem || null,
      produto_servico: categoria,
      categoria,
      valor_sinal: Number(item.valor_sinal || 0),
      valor_a_entrar: Number(item.valor_a_entrar || 0),
      valor_recorrente: Number(item.valor_recorrente || 0),
      parcelas_total: item.parcelas_total ? Number(item.parcelas_total) : null,
      valor_parcela: Number(item.valor_parcela || 0),
      previsao_entrada: item.previsao_entrada || parcelasDatas[0] || null,
      parcelas_datas: parcelasDatas,
      status: normalizeStatus(form.status),
      observacao: item.observacao.trim() || null,
    };
    };

    if (editing) {
      updateFechamento.mutate(
        { id: editing.id, ...buildPayload(filledItems[0]) },
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

    Promise.all(filledItems.map((item) => createFechamento.mutateAsync(buildPayload(item))))
      .then(() => {
        toast({ title: filledItems.length > 1 ? "Fechamentos registrados!" : "Fechamento registrado!" });
        setDialogOpen(false);
        setForm({ ...defaultForm });
      })
      .catch((error) => toast({ title: "Erro", description: error.message, variant: "destructive" }));
  };

  const actions = (
    <Button onClick={openNewDialog} className="gap-2">
      <Plus className="h-4 w-4" />
      Registrar fechamento
    </Button>
  );

  return (
    <DashboardLayout title="Fechamentos Diarios" subtitle="Valores coletados, a receber e recorrentes vindos da Gestao de Clientes" actions={actions}>
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
                <Layers3 className="h-4 w-4 text-accent" /> Recorrente clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="font-display text-2xl font-bold">{formatBRL(totals.recorrente)}</CardContent>
          </Card>
        </div>

        <Card className="border-border/50 bg-card/70">
          <CardHeader>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Resumo integrado de vendas e fechamentos</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bate o faturamento marcado/coletado com o faturamento feito por categoria no mesmo periodo.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-lg border border-success/20 bg-success/10 px-3 py-2">
                  <span className="text-muted-foreground">Coletado</span>
                  <strong className="block text-success">{formatBRL(totals.coletado)}</strong>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                  <span className="text-muted-foreground">A receber</span>
                  <strong className="block text-amber-500">{formatBRL(totals.aReceber)}</strong>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2">
                  <span className="text-muted-foreground">Feito</span>
                  <strong className="block text-primary">{formatBRL(vendasTotals.feito)}</strong>
                </div>
                <div className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-2">
                  <span className="text-muted-foreground">Vendas</span>
                  <strong className="block text-accent">{vendasTotals.quantidade}</strong>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {integratedCategoryRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma venda ou fechamento encontrado no periodo.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/40">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Marcado / coletado</TableHead>
                      <TableHead className="text-right">A receber</TableHead>
                      <TableHead className="text-right">Recorrente</TableHead>
                      <TableHead className="text-right">Faturamento feito</TableHead>
                      <TableHead className="text-center">Vendas feitas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integratedCategoryRows.map((row) => (
                      <TableRow key={row.categoria}>
                        <TableCell className="font-semibold">{row.categoria}</TableCell>
                        <TableCell className="text-right font-semibold text-success">{formatBRL(row.coletado)}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-500">{formatBRL(row.aReceber)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatBRL(row.recorrente)}</TableCell>
                        <TableCell className="text-right font-semibold text-foreground">{formatBRL(row.feito)}</TableCell>
                        <TableCell className="text-center">{row.vendas}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Vendas registradas no periodo
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vendas puxadas da tela de Vendas para facilitar a conferencia junto dos fechamentos.
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2">
                  <span className="text-muted-foreground">Faturamento feito</span>
                  <strong className="block text-primary">{formatBRL(vendasTotals.feito)}</strong>
                </div>
                <div className="rounded-lg border border-success/20 bg-success/10 px-3 py-2">
                  <span className="text-muted-foreground">Liquido</span>
                  <strong className="block text-success">{formatBRL(vendasTotals.liquido)}</strong>
                </div>
                <div className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-2">
                  <span className="text-muted-foreground">Comissao</span>
                  <strong className="block text-accent">{formatBRL(vendasTotals.comissao)}</strong>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border/40">
              <Table className="table-fixed text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[8%]">Data</TableHead>
                    <TableHead className="w-[18%]">Cliente</TableHead>
                    <TableHead className="w-[18%]">Categoria</TableHead>
                    <TableHead className="w-[12%]">Origem</TableHead>
                    <TableHead className="w-[12%]">Pagamento</TableHead>
                    <TableHead className="w-[10%] text-right">Valor</TableHead>
                    <TableHead className="w-[10%] text-right">Liquido</TableHead>
                    <TableHead className="w-[8%] text-center">Status</TableHead>
                    <TableHead className="w-[4%] text-center">
                      <TrendingUp className="mx-auto h-4 w-4" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingVendas ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Carregando vendas...</TableCell>
                    </TableRow>
                  ) : vendasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhuma venda encontrada no periodo.</TableCell>
                    </TableRow>
                  ) : (
                    vendasFiltradas.map((venda) => (
                      <TableRow key={venda.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(venda.data)}</TableCell>
                        <TableCell>
                          <div className="truncate font-medium" title={venda.cliente}>{venda.cliente}</div>
                          <div className="truncate text-[11px] text-muted-foreground" title={venda.vendedor}>{venda.vendedor}</div>
                        </TableCell>
                        <TableCell>
                          <div className="truncate font-medium" title={getVendaCategoria(venda)}>{getVendaCategoria(venda)}</div>
                          {venda.produto && venda.servico && (
                            <div className="truncate text-[11px] text-muted-foreground" title={venda.produto}>{venda.produto}</div>
                          )}
                        </TableCell>
                        <TableCell className="truncate" title={venda.origem || "-"}>{venda.origem || "-"}</TableCell>
                        <TableCell>
                          <div className="truncate" title={venda.pagamento}>{venda.pagamento}</div>
                          {venda.parcelas && <div className="truncate text-[11px] text-muted-foreground">{venda.parcelas}</div>}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatBRL(Number(venda.valor || 0))}</TableCell>
                        <TableCell className="text-right font-semibold text-success">{formatBRL(Number(venda.valor_com_juros || venda.valor || 0))}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={venda.status === "aprovada" ? "default" : venda.status === "cancelada" ? "destructive" : "outline"}
                            className="text-[11px]"
                          >
                            {venda.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {venda.status === "aprovada" ? "feito" : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
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
                <Select value={origemFilter} onValueChange={setOrigemFilter}>
                  <SelectTrigger className="sm:w-44">
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas origens</SelectItem>
                    {ORIGEM_OPTIONS.map((origem) => (
                      <SelectItem key={origem} value={origem}>{origem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border/40">
              <Table className="table-fixed text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[7%] px-2">Data</TableHead>
                    <TableHead className="w-[12%] px-2">Cliente</TableHead>
                    <TableHead className="w-[21%] px-2">Categoria</TableHead>
                    <TableHead className="w-[10%] px-2">Origem</TableHead>
                    <TableHead className="w-[9%] px-2 text-right">Coletado</TableHead>
                    <TableHead className="w-[9%] px-2 text-right">A receber</TableHead>
                    <TableHead className="w-[9%] px-2 text-right">Recorr.</TableHead>
                    <TableHead className="w-[8%] px-2">Previsao</TableHead>
                    <TableHead className="w-[8%] px-2">Status</TableHead>
                    <TableHead className="w-[7%] px-2 text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Nenhum fechamento encontrado.</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="px-2 whitespace-nowrap">{formatDate(item.data)}</TableCell>
                        <TableCell className="px-2">
                          <div className="truncate font-medium" title={item.cliente}>{item.cliente}</div>
                          {item.vendedor && <div className="truncate text-[11px] text-muted-foreground" title={item.vendedor}>{item.vendedor}</div>}
                        </TableCell>
                        <TableCell className="px-2">
                          <div className="truncate font-medium" title={getCategoria(item)}>{getCategoria(item)}</div>
                          {item.parcelas_total && (
                            <div className="truncate text-[11px] text-muted-foreground">
                              {item.parcelas_total}x de {formatBRL(Number(item.valor_parcela || 0))}
                            </div>
                          )}
                          {item.observacao && <div className="truncate text-[11px] text-muted-foreground" title={item.observacao}>{item.observacao}</div>}
                        </TableCell>
                        <TableCell className="truncate px-2" title={item.origem || "-"}>{item.origem || "-"}</TableCell>
                        <TableCell className="px-2 text-right font-semibold text-success">{formatBRL(item.valor_sinal)}</TableCell>
                        <TableCell className="px-2 text-right font-semibold text-amber-500">{formatBRL(item.valor_a_entrar)}</TableCell>
                        <TableCell className="px-2 text-right font-semibold text-primary">{formatBRL(item.valor_recorrente)}</TableCell>
                        <TableCell className="px-2 whitespace-nowrap">{formatDate(item.previsao_entrada)}</TableCell>
                        <TableCell className="px-2"><StatusBadge status={item.status} /></TableCell>
                        <TableCell className="px-2">
                          <div className="flex justify-end gap-0.5">
                            {normalizeStatus(item.status) === "a receber" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-success"
                                title="Marcar como recebido"
                                onClick={() => updateFechamento.mutate({ id: item.id, status: "recebido" })}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => deleteFechamento.mutate(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
          <DialogContent
            className="max-h-[90vh] overflow-hidden sm:max-w-2xl"
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Editar fechamento" : "Registrar fechamento"}</DialogTitle>
              <DialogDescription>
                Lance o valor coletado, o que esta a receber, recorrentes e parcelas.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="grid max-h-[calc(90vh-120px)] gap-4 overflow-y-auto overscroll-contain pr-2 sm:grid-cols-2">
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
                <Label>Origem</Label>
                <Select value={form.origem} onValueChange={(origem) => setForm((prev) => ({ ...prev, origem }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a origem" /></SelectTrigger>
                  <SelectContent>
                    {ORIGEM_OPTIONS.map((origem) => (
                      <SelectItem key={origem} value={origem}>{origem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input
                  value={form.cliente}
                  list="gestao-clientes-list"
                  onChange={(event) => setForm((prev) => ({ ...prev, cliente: event.target.value }))}
                  placeholder="Nome do cliente"
                />
                <datalist id="gestao-clientes-list">
                  {gestaoClients.map((client) => (
                    <option key={client.id} value={client.name}>
                      {client.status} - Contrato {formatBRL(Number(client.contractValue || 0))}
                    </option>
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  Campo livre. Se quiser puxar recorrente e previsao da Gestao de Clientes, digite o nome exato e clique no botao.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => applyClientFromGestao(form.cliente)}>
                  Puxar dados da Gestao
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Input value={form.vendedor} onChange={(event) => setForm((prev) => ({ ...prev, vendedor: event.target.value }))} placeholder="Quem fechou" />
              </div>
              <div className="space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Itens do fechamento</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Adicione um item para cada categoria ou servico vendido para o mesmo cliente.
                    </p>
                  </div>
                  {!editing && (
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addItem}>
                      <Plus className="h-4 w-4" />
                      Adicionar item
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {form.items.map((item, index) => (
                    <div key={index} className="rounded-xl border border-border/50 bg-background/40 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">Item {index + 1}</div>
                        {!editing && form.items.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Categoria</Label>
                          <Select value={item.categoria} onValueChange={(categoria) => updateItem(index, { categoria, produto_servico: categoria })}>
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
                          <Input type="number" step="0.01" value={item.valor_sinal || ""} onChange={(event) => updateItem(index, { valor_sinal: Number(event.target.value) })} placeholder="0,00" />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor a receber</Label>
                          <Input type="number" step="0.01" value={item.valor_a_entrar || ""} onChange={(event) => updateItem(index, { valor_a_entrar: Number(event.target.value) })} placeholder="0,00" />
                        </div>
                        <div className="space-y-2">
                          <Label>Recorrente mensal</Label>
                          <Input type="number" step="0.01" value={item.valor_recorrente || ""} onChange={(event) => updateItem(index, { valor_recorrente: Number(event.target.value) })} placeholder="0,00" />
                        </div>
                        <div className="space-y-2">
                          <Label>Previsao de entrada</Label>
                          <Input type="date" value={item.previsao_entrada} onChange={(event) => updateItem(index, { previsao_entrada: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Quantidade de parcelas</Label>
                          <Input type="number" min="1" step="1" value={item.parcelas_total} onChange={(event) => updateItem(index, { parcelas_total: event.target.value })} placeholder="Ex: 3" />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor da parcela</Label>
                          <Input type="number" step="0.01" value={item.valor_parcela || ""} onChange={(event) => updateItem(index, { valor_parcela: Number(event.target.value) })} placeholder="0,00" />
                        </div>
                        {Number(item.parcelas_total || 0) > 1 && (
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Datas das parcelas</Label>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {buildParcelDates(item.parcelas_total, item.previsao_entrada, item.parcelas_datas).map((date, parcelIndex) => (
                                <div key={parcelIndex} className="space-y-1">
                                  <span className="text-xs text-muted-foreground">Parcela {parcelIndex + 1}</span>
                                  <Input
                                    type="date"
                                    value={date}
                                    onChange={(event) => {
                                      const parcelas_datas = buildParcelDates(item.parcelas_total, item.previsao_entrada, item.parcelas_datas);
                                      parcelas_datas[parcelIndex] = event.target.value;
                                      updateItem(index, { parcelas_datas });
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Observacao do item</Label>
                          <Textarea value={item.observacao} onChange={(event) => updateItem(index, { observacao: event.target.value })} placeholder="Forma de pagamento, condicao combinada, parcelas..." rows={2} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
