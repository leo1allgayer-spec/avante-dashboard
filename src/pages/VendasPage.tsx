import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import DateFilterBar from "@/components/DateFilterBar";
import { useLocalDateFilter } from "@/hooks/useLocalDateFilter";
import { useVendas, useCreateVenda, useUpdateVenda, useDeleteVenda, useClearVendas, type Venda } from "@/hooks/useVendas";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Search, Pencil } from "lucide-react";


const PRODUTOS = [
  "Meta Ads",
  "Google Ads",
  "YouTube Ads",
  "TikTok Ads",
  "Social Media",
  "Edição e Captação",
  "IA",
];

const SERVICOS = ["Tráfego", "Captação", "Site", "CRM"];
const ORIGENS = ["Anúncio", "Upsell", "Indicação Direta", "Indicação Comercial"];

const TAXAS_CARTAO_GATEWAY: Record<number, number> = {
  1: 0, 2: 4.78, 3: 5.78, 4: 6.78, 5: 7.78, 6: 8.78,
  7: 9.78, 8: 10.78, 9: 11.78, 10: 12.78, 11: 13.78, 12: 14.78,
};

const TAXAS_INFINITY_VISA_MASTER: Record<number, number> = {
  1: 2.89, 2: 4.22, 3: 4.83, 4: 5.44, 5: 6.05, 6: 6.64,
  7: 7.24, 8: 7.82, 9: 8.41, 10: 8.98, 11: 9.56, 12: 10.12,
};

const TAXAS_ELO_AMEX: Record<number, number> = {
  1: 4.65, 2: 6.09, 3: 6.69, 4: 7.28, 5: 7.87, 6: 8.46,
  7: 9.05, 8: 9.63, 9: 10.2, 10: 10.76, 11: 11.33, 12: 11.88,
};

const TAXAS_LINK_NOVAS: Record<number, number> = {
  1: 4.2, 2: 6.09, 3: 7.01, 4: 7.91, 5: 8.8, 6: 9.67,
  7: 12.59, 8: 13.42, 9: 14.25, 10: 15.06, 11: 15.87, 12: 16.66,
};

const TAXAS_MAQUININHA_VISA_NOVAS: Record<number, number> = {
  1: 2.79, 2: 4.08, 3: 4.65, 4: 5.21, 5: 5.77, 6: 6.32,
  7: 6.87, 8: 7.42, 9: 7.96, 10: 8.49, 11: 9.03, 12: 9.56,
};

type TaxProfile = "opcao1" | "opcao2";

const PAGAMENTOS_COM_PARCELA = ["Infinity (Visa/Master)", "Elo/Amex", "Link Gateway"];

const getTaxas = (pagamento: string, profile: TaxProfile): Record<number, number> => {
  if (profile === "opcao2" && pagamento === "Link Gateway") return TAXAS_LINK_NOVAS;
  if (profile === "opcao2" && pagamento === "Infinity (Visa/Master)") return TAXAS_MAQUININHA_VISA_NOVAS;
  if (pagamento === "Infinity (Visa/Master)") return TAXAS_INFINITY_VISA_MASTER;
  if (pagamento === "Elo/Amex") return TAXAS_ELO_AMEX;
  return TAXAS_CARTAO_GATEWAY; // Cartão and Link Gateway use same rates
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const defaultForm = {
  data: new Date().toISOString().split("T")[0],
  vendedor: "",
  cliente: "",
  produto: "",
  valor: 0,
  pagamento: "Dinheiro",
  parcelas: 1,
  status: "pendente",
  servico: "",
  origem: "",
};

const VendasPage = () => {
  const { data: allVendas = [], isLoading } = useVendas();
  const dateFilter = useLocalDateFilter();
  const vendas = dateFilter.filterByDate(allVendas);
  const createVenda = useCreateVenda();
  const updateVenda = useUpdateVenda();
  const deleteVenda = useDeleteVenda();
  const clearVendas = useClearVendas();
  const { session } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [vendedorFilter, setVendedorFilter] = useState("todos");
  const [pagamentoFilter, setPagamentoFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [taxProfile, setTaxProfile] = useState<TaxProfile>("opcao1");

  const [form, setForm] = useState({ ...defaultForm });

  const temParcela = PAGAMENTOS_COM_PARCELA.includes(form.pagamento);
  const taxasAtivas = getTaxas(form.pagamento, taxProfile);
  const taxa = temParcela ? (taxasAtivas[form.parcelas] || 0) : 0;
  const valorComJuros = temParcela && form.parcelas >= 1
    ? +(form.valor * (1 - taxa / 100)).toFixed(2)
    : null;
  const valorBase = valorComJuros ?? form.valor;
  const comissao = +(valorBase * 0.05).toFixed(2);

  const vendedores = useMemo(() => [...new Set(vendas.map((v) => v.vendedor))].sort(), [vendas]);

  const filtered = useMemo(() => {
    return vendas.filter((v) => {
      if (search && !v.cliente.toLowerCase().includes(search.toLowerCase()) && !v.produto.toLowerCase().includes(search.toLowerCase()) && !v.vendedor.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "todos" && v.status !== statusFilter) return false;
      if (vendedorFilter !== "todos" && v.vendedor !== vendedorFilter) return false;
      if (pagamentoFilter !== "todos" && v.pagamento !== pagamentoFilter) return false;
      return true;
    });
  }, [vendas, search, statusFilter, vendedorFilter, pagamentoFilter]);

  const getVendaValores = (v: Venda) => {
    const parcelasNum = v.parcelas ? parseInt(v.parcelas) : 1;
    const temParcelaVenda = PAGAMENTOS_COM_PARCELA.includes(v.pagamento) && !!v.parcelas && !isNaN(parcelasNum);

    if (!temParcelaVenda) {
      const valorLiquido = v.valor_com_juros ?? v.valor;
      return {
        valorLiquido,
        comissao: v.comissao,
        taxa: null as number | null,
      };
    }

    const taxaVenda = getTaxas(v.pagamento, taxProfile)[parcelasNum] || 0;
    const valorLiquido = +(Number(v.valor) * (1 - taxaVenda / 100)).toFixed(2);
    return {
      valorLiquido,
      comissao: +(valorLiquido * 0.05).toFixed(2),
      taxa: taxaVenda,
    };
  };


  const openNewDialog = () => {
    setEditingVenda(null);
    setForm({ ...defaultForm });
    setDialogOpen(true);
  };

  const openEditDialog = (v: Venda) => {
    setEditingVenda(v);
    const parcelasNum = v.parcelas ? parseInt(v.parcelas) : 1;
    setForm({
      data: v.data,
      vendedor: v.vendedor,
      cliente: v.cliente,
      produto: v.produto,
      valor: v.valor,
      pagamento: v.pagamento,
      parcelas: isNaN(parcelasNum) ? 1 : parcelasNum,
      status: v.status,
      servico: v.servico || "",
      origem: v.origem || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    const payload = {
      user_id: session.user.id,
      data: form.data,
      vendedor: form.vendedor,
      cliente: form.cliente,
      produto: form.produto,
      valor: form.valor,
      pagamento: form.pagamento,
      parcelas: temParcela ? `${form.parcelas}x (${taxa}%)` : null,
      valor_com_juros: valorComJuros,
      comissao,
      status: form.status,
      servico: form.servico,
      origem: form.origem,
    };

    if (editingVenda) {
      updateVenda.mutate(
        { id: editingVenda.id, ...payload },
        {
          onSuccess: () => {
            toast({ title: "Venda atualizada!" });
            setDialogOpen(false);
            setEditingVenda(null);
            setForm({ ...defaultForm });
          },
          onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createVenda.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Venda registrada!" });
          setDialogOpen(false);
          setForm({ ...defaultForm });
        },
        onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleClear = () => {
    clearVendas.mutate(undefined, {
      onSuccess: () => toast({ title: "Dados limpos!" }),
      onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
    });
  };

  const isSaving = createVenda.isPending || updateVenda.isPending;

  const vendaFormDialog = (
    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/40 bg-card">
      <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 pb-4 border-b border-border/20">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              {editingVenda ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
            </div>
            {editingVenda ? "Editar Venda" : "Nova Venda"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/70">
            {editingVenda ? "Altere os dados da venda" : "Preencha os dados para registrar uma nova venda"}
          </DialogDescription>
        </DialogHeader>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Informações Principais */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Informações Principais</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))} className="bg-secondary/30 border-border/30 focus:border-primary/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Input value={form.cliente} onChange={(e) => setForm((p) => ({ ...p, cliente: e.target.value }))} required placeholder="Nome do cliente" className="bg-secondary/30 border-border/30 focus:border-primary/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Produto</Label>
              <Select value={form.produto} onValueChange={(v) => setForm((p) => ({ ...p, produto: v }))}>
                <SelectTrigger className="bg-secondary/30 border-border/30"><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                <SelectContent>
                  {PRODUTOS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Serviço</Label>
              <Select value={form.servico} onValueChange={(v) => setForm((p) => ({ ...p, servico: v }))}>
                <SelectTrigger className="bg-secondary/30 border-border/30"><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                <SelectContent>
                  {SERVICOS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Origem</Label>
              <Select value={form.origem} onValueChange={(v) => setForm((p) => ({ ...p, origem: v }))}>
                <SelectTrigger className="bg-secondary/30 border-border/30"><SelectValue placeholder="Selecione a origem" /></SelectTrigger>
                <SelectContent>
                  {ORIGENS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="h-px bg-border/20" />

        {/* Valores & Pagamento */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Valores & Pagamento</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.valor || ""} onChange={(e) => setForm((p) => ({ ...p, valor: Number(e.target.value) }))} placeholder="0,00" className="bg-secondary/30 border-border/30 focus:border-primary/50 font-semibold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pagamento</Label>
              <Select value={form.pagamento} onValueChange={(v) => setForm((p) => ({ ...p, pagamento: v, parcelas: !PAGAMENTOS_COM_PARCELA.includes(v) ? 1 : p.parcelas }))}>
                <SelectTrigger className="bg-secondary/30 border-border/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">💵 Dinheiro</SelectItem>
                  <SelectItem value="Débito">💳 Débito</SelectItem>
                  
                  <SelectItem value="Infinity (Visa/Master)">💳 Infinity (Visa/Master)</SelectItem>
                  <SelectItem value="Elo/Amex">💳 Elo/Amex</SelectItem>
                  <SelectItem value="Link Gateway">🔗 Link Gateway</SelectItem>
                  <SelectItem value="PIX">⚡ PIX</SelectItem>
                  <SelectItem value="Boleto">📄 Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {temParcela && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Parcelas</Label>
                  <Select value={String(form.parcelas)} onValueChange={(v) => setForm((p) => ({ ...p, parcelas: Number(v) }))}>
                    <SelectTrigger className="bg-secondary/30 border-border/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(taxasAtivas).map(([n, t]) => (
                        <SelectItem key={n} value={n}>{n}x {Number(n) > 1 ? `(${t}%)` : `(${t}%)`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Valor Líquido</Label>
                  <div className="h-10 flex items-center px-3 rounded-md bg-secondary/30 border border-border/30 text-sm font-semibold text-foreground">
                    {valorComJuros ? formatBRL(valorComJuros) : formatBRL(form.valor)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="h-px bg-border/20" />

        {/* Comissão & Status */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Comissão & Status</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Comissão (15%)</Label>
              <div className="h-10 flex items-center px-3 rounded-md bg-secondary/30 border border-border/30 text-sm font-semibold text-emerald-400">
                {formatBRL(comissao)}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-secondary/30 border-border/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">🟡 Pendente</SelectItem>
                  <SelectItem value="aprovada">🟢 Aprovada</SelectItem>
                  <SelectItem value="cancelada">🔴 Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full h-11 text-sm font-semibold mt-2" disabled={isSaving}>
          {isSaving ? "Salvando..." : editingVenda ? "✓ Atualizar Venda" : "✓ Registrar Venda"}
        </Button>
      </form>
    </DialogContent>
  );

  return (
    <PageTransition>
      <DashboardLayout
        title="Vendas"
        subtitle="Registro e acompanhamento de vendas"
        actions={
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
                  <Trash2 className="h-4 w-4" /> Limpar Dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar todos os dados?</AlertDialogTitle>
                  <AlertDialogDescription>Todas as vendas serão removidas permanentemente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClear}>Limpar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button size="sm" className="gap-2" onClick={openNewDialog}>
              <Plus className="h-4 w-4" /> Nova Venda
            </Button>
          </div>
        }
      >
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingVenda(null); }}>
          {vendaFormDialog}
        </Dialog>

        <DateFilterBar mode={dateFilter.mode} onModeChange={dateFilter.setMode} label={dateFilter.label} onBack={dateFilter.goBack} onForward={dateFilter.goForward} />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-lg border border-border/30 bg-secondary/20 px-3 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Tabela de taxas</p>
            <p className="text-xs text-muted-foreground">Escolha a opção para recalcular os valores líquidos e comissões exibidos.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={taxProfile === "opcao1" ? "default" : "outline"}
              onClick={() => setTaxProfile("opcao1")}
            >
              Opção 1
            </Button>
            <Button
              type="button"
              size="sm"
              variant={taxProfile === "opcao2" ? "default" : "outline"}
              onClick={() => setTaxProfile("opcao2")}
            >
              Opção 2
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Buscar cliente ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[220px] h-9 text-sm bg-secondary/30 border-border/30"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm bg-secondary/30 border-border/30">
              <SelectValue placeholder="Todos os Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="aprovada">Aprovada</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm bg-secondary/30 border-border/30">
              <SelectValue placeholder="Todos Vendedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Vendedores</SelectItem>
              {vendedores.filter(v => v.trim() !== "").map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pagamentoFilter} onValueChange={setPagamentoFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm bg-secondary/30 border-border/30">
              <SelectValue placeholder="Todos Pagamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Pagamentos</SelectItem>
              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
              <SelectItem value="Débito">Débito</SelectItem>
              <SelectItem value="Cartão">Cartão</SelectItem>
              <SelectItem value="PIX">PIX</SelectItem>
              <SelectItem value="Boleto">Boleto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden border border-border/30">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30" style={{ background: "hsl(260, 22%, 9%)" }}>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Data</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Produto</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Serviço</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Origem</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-center">Pagamento</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-center">Parcelas</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Valor Líquido</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Comissão</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-8">Carregando...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((v) => {
                    const valores = getVendaValores(v);
                    return (
                    <TableRow key={v.id} className="border-border/20 hover:bg-secondary/20" style={{ background: "hsl(260, 22%, 7%)" }}>
                      <TableCell className="text-sm">{formatDate(v.data)}</TableCell>
                      <TableCell className="text-sm">{v.cliente}</TableCell>
                      <TableCell className="text-sm">{v.produto}</TableCell>
                      <TableCell className="text-sm">{v.servico || "—"}</TableCell>
                      <TableCell className="text-sm">{v.origem || "—"}</TableCell>
                      <TableCell className="text-sm text-right font-semibold">{formatBRL(v.valor)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={v.pagamento === "Cartão" ? "secondary" : "outline"} className="text-xs">
                          {v.pagamento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground">
                        {v.parcelas ? `${parseInt(v.parcelas)}x (${valores.taxa ?? "—"}%)` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-right text-muted-foreground">{formatBRL(valores.valorLiquido)}</TableCell>
                      <TableCell className="text-sm text-right">{formatBRL(valores.comissao)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className="text-xs"
                          variant={v.status === "aprovada" ? "default" : v.status === "cancelada" ? "destructive" : "outline"}
                        >
                          {v.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => openEditDialog(v)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteVenda.mutate(v.id, {
                              onSuccess: () => toast({ title: "Venda removida" }),
                              onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
                            })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
                {filtered.length > 0 && (() => {
                  const totalValor = filtered.reduce((s, v) => s + Number(v.valor), 0);
                  const totalLiquido = filtered.reduce((s, v) => s + getVendaValores(v).valorLiquido, 0);
                  const totalComissao = filtered.reduce((s, v) => s + getVendaValores(v).comissao, 0);
                  return (
                    <TableRow className="border-t-2 border-accent/30" style={{ background: "hsl(260, 22%, 11%)" }}>
                      <TableCell className="text-sm font-bold text-accent py-3">TOTAL</TableCell>
                      <TableCell className="py-3"></TableCell>
                      <TableCell className="text-sm font-bold py-3">{filtered.length} vendas</TableCell>
                      <TableCell className="py-3"></TableCell>
                      <TableCell className="py-3"></TableCell>
                      <TableCell className="text-sm text-right font-bold py-3">{formatBRL(totalValor)}</TableCell>
                      <TableCell className="py-3"></TableCell>
                      <TableCell className="py-3"></TableCell>
                      <TableCell className="text-sm text-right font-bold py-3">{formatBRL(totalLiquido)}</TableCell>
                      <TableCell className="text-sm text-right font-bold py-3">{formatBRL(totalComissao)}</TableCell>
                      <TableCell className="py-3"></TableCell>
                      <TableCell className="py-3"></TableCell>
                    </TableRow>
                  );
                })()}
              </TableBody>
            </Table>
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
};

export default VendasPage;
