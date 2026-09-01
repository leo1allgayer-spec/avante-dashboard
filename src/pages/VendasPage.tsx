import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import DateFilterBar from "@/components/DateFilterBar";
import { useLocalDateFilter } from "@/hooks/useLocalDateFilter";
import { useVendas, useCreateVenda, useUpdateVenda, useDeleteVenda, useClearVendas, type Venda } from "@/hooks/useVendas";
import { useFechamentosDiarios, useCreateFechamentoDiario, useUpdateFechamentoDiario, useDeleteFechamentoDiario, useClearFechamentosDiarios, type FechamentoDiario } from "@/hooks/useFechamentosDiarios";
import { useCreateCriativoVenda, useCriativosVendas, useUpdateCriativoVenda, type CriativoVenda } from "@/hooks/useCriativos";
import { useMetaAdCreatives } from "@/hooks/useMetaAds";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMonthMetrics } from "@/hooks/useMetrics";
import { useCursosDados } from "@/hooks/useCursosDados";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { useCourseBookings } from "@/hooks/clients/useCourseBookings";
import { getMonthlyContractValue } from "@/types/clients/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarClock, Clock3, Layers3, Pencil, Plus, Search, Trash2, TrendingUp, Wallet } from "lucide-react";
import { COURSE_PRODUCTS, GENERAL_SERVICE_OPTIONS, PRODUCT_OPTIONS, SERVICE_OPTIONS, canonicalizeSaleCategory } from "@/constants/serviceCategories";


const PRODUTOS = PRODUCT_OPTIONS;
const SERVICOS = SERVICE_OPTIONS;
const ORIGENS = ["Anuncio", "Upsell", "Indicacao", "Social Seller", "Influencers"];

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

const PAGAMENTOS_COM_PARCELA = ["Infinity (Visa/Master)", "Infinity Elo/Amex", "Elo/Amex", "Link Infinity", "Link Gateway"];

const getTaxas = (pagamento: string, profile: TaxProfile): Record<number, number> => {
  if (profile === "opcao2" && (pagamento === "Link Infinity" || pagamento === "Link Gateway")) return TAXAS_LINK_NOVAS;
  if (profile === "opcao2" && pagamento === "Infinity (Visa/Master)") return TAXAS_MAQUININHA_VISA_NOVAS;
  if (pagamento === "Infinity (Visa/Master)") return TAXAS_INFINITY_VISA_MASTER;
  if (pagamento === "Infinity Elo/Amex" || pagamento === "Elo/Amex") return TAXAS_ELO_AMEX;
  return TAXAS_CARTAO_GATEWAY; // Link Infinity e registros antigos como Link Gateway usam estas taxas
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const addMonths = (date: string, months: number) => {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, month - 1 + months, day);
  return next.toISOString().split("T")[0];
};

const buildParcelDates = (total: string | number | null | undefined, firstDate: string, current: string[] = []) => {
  const count = Math.max(0, Number(total || 0));
  return Array.from({ length: count }, (_, index) => current[index] || addMonths(firstDate, index));
};

const normalizeFechamentoStatus = (status?: string | null) => (status === "para entrar" ? "a receber" : status || "a receber");

const getStoredParcelDates = (item: Pick<FechamentoDiario, "parcelas_datas">) =>
  Array.isArray(item.parcelas_datas) ? item.parcelas_datas.filter((date): date is string => typeof date === "string" && !!date) : [];

const getFechamentoCategoria = (item: Pick<FechamentoDiario, "categoria" | "produto_servico">) =>
  canonicalizeSaleCategory(item.categoria || item.produto_servico);

const getVendaCategoria = (item: Pick<Venda, "servico" | "produto">) =>
  canonicalizeSaleCategory(item.servico || item.produto);

const normalizeText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getSalesCommissionRate = (origin?: string | null) =>
  normalizeText(origin) === "social seller" ? 0.10 : 0.15;

const getSalesCommissionPercent = (origin?: string | null) =>
  Math.round(getSalesCommissionRate(origin) * 100);

const getPaidCommissionValue = (sale: Pick<Venda, "comissao" | "comissao_paga_valor" | "status_comissao">) =>
  Math.min(
    Number(sale.comissao || 0),
    Math.max(0, Number(sale.comissao_paga_valor ?? (sale.status_comissao === "paga" ? sale.comissao : 0))),
  );

const getUniqueSaleNames = (products: string[], services: string[]) => {
  const unique = new Map<string, string>();
  [...products, ...services].filter(Boolean).forEach((name) => {
    const canonical = canonicalizeSaleCategory(name);
    const key = normalizeText(canonical);
    if (key && !unique.has(key)) unique.set(key, canonical);
  });
  return [...unique.values()];
};

const getLocalCreatedDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const getPaymentInstallments = (payment: string, fallback = 1) => {
  const match = String(payment || "").match(/(\d+)x/i);
  return match ? Number(match[1]) : fallback;
};

const getPaymentMethod = (payment: string) => String(payment || "").split("—")[0].trim();

const getNetPaymentValue = (amount: number, payment: string, installments: number, profile: TaxProfile) => {
  const method = getPaymentMethod(payment);
  if (!PAGAMENTOS_COM_PARCELA.includes(method)) return +Number(amount || 0).toFixed(2);
  const fee = getTaxas(method, profile)[Math.max(1, installments)] || 0;
  return +(Number(amount || 0) * (1 - fee / 100)).toFixed(2);
};

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const MonthYearPicker = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const [year = "", month = ""] = value ? value.split("-") : [];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, index) => String(currentYear - 1 + index));
  const setPart = (nextYear: string, nextMonth: string) => onChange(`${nextYear || currentYear}-${nextMonth || "01"}-01`);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
      <Select value={month} onValueChange={(nextMonth) => setPart(year, nextMonth)}>
        <SelectTrigger><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
        <SelectContent>{MONTHS.map((label, index) => <SelectItem key={label} value={String(index + 1).padStart(2, "0")}>{label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={year} onValueChange={(nextYear) => setPart(nextYear, month)}>
        <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
        <SelectContent>{years.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
};

const formatMonthYear = (date?: string | null) => {
  if (!date) return "Sem previsão";
  const [year, month] = date.split("-");
  return `${MONTHS[Number(month) - 1]?.slice(0, 3) || month}/${year?.slice(-2)}`;
};

type PaymentHistoryEntry = { id: string; date: string; amount: number; method: string; netAmount?: number };
const PAYMENT_HISTORY_PREFIX = "[PAGAMENTO_VENDA]";

const getPaymentHistory = (observation?: string | null): PaymentHistoryEntry[] =>
  (observation || "").split("\n").flatMap((line) => {
    if (!line.startsWith(PAYMENT_HISTORY_PREFIX)) return [];
    try {
      const entry = JSON.parse(line.slice(PAYMENT_HISTORY_PREFIX.length));
      return entry?.id && entry?.date && Number(entry?.amount) > 0 ? [{ ...entry, amount: Number(entry.amount), netAmount: entry.netAmount == null ? undefined : Number(entry.netAmount) }] : [];
    } catch {
      return [];
    }
  });

const getUniquePaymentHistory = (observation?: string | null): PaymentHistoryEntry[] => {
  const entriesById = new Map<string, PaymentHistoryEntry>();
  getPaymentHistory(observation).forEach((entry) => {
    const previous = entriesById.get(entry.id);
    if (!previous || entry.amount > previous.amount) entriesById.set(entry.id, entry);
  });
  return [...entriesById.values()];
};

const appendPaymentHistory = (observation: string | null | undefined, entry: PaymentHistoryEntry) =>
  [observation?.trim(), `${PAYMENT_HISTORY_PREFIX}${JSON.stringify(entry)}`].filter(Boolean).join("\n");

const getManualObservation = (observation?: string | null) =>
  (observation || "").split("\n").filter((line) => !line.startsWith(PAYMENT_HISTORY_PREFIX)).join("\n").trim();

const mergeObservationWithPaymentHistory = (manualObservation: string, previousObservation?: string | null) => {
  const historyLines = (previousObservation || "").split("\n").filter((line) => line.startsWith(PAYMENT_HISTORY_PREFIX));
  return [manualObservation.trim(), ...historyLines].filter(Boolean).join("\n") || null;
};

const getSalePaymentLabel = (sale: Venda) => {
  const installments = Number.parseInt(String(sale.parcelas || ""), 10);
  return PAGAMENTOS_COM_PARCELA.includes(sale.pagamento) && installments > 1
    ? `${sale.pagamento} — ${installments}x`
    : sale.pagamento;
};

const defaultForm = {
  data: new Date().toISOString().split("T")[0],
  vendedor: "",
  cliente: "",
  produto: "",
  valor: 0,
  pagamento: "Dinheiro",
  pagamento_saldo: "PIX",
  parcelas: 1,
  parcelas_saldo: 1,
  status: "pendente",
  servico: "",
  origem: "",
  criativo: "",
  valor_sinal: 0,
  valor_a_entrar: 0,
  valor_recorrente: 0,
  parcelas_total: "",
  valor_parcela: 0,
  previsao_entrada: "",
  parcelas_datas: [] as string[],
  observacao: "",
  condicao_pagamento: "pago",
};

type VendaItemForm = {
  produto: string;
  servico: string;
  origem: string;
  criativo: string;
  valor: number;
  pagamento: string;
  pagamento_saldo: string;
  parcelas: number;
  parcelas_saldo: number;
  status: string;
  valor_sinal: number;
  valor_a_entrar: number;
  valor_recorrente: number;
  parcelas_total: string;
  valor_parcela: number;
  previsao_entrada: string;
  parcelas_datas: string[];
  observacao: string;
  condicao_pagamento: string;
};

const defaultVendaItem: VendaItemForm = {
  produto: "",
  servico: "",
  origem: "",
  criativo: "",
  valor: 0,
  pagamento: "Dinheiro",
  pagamento_saldo: "PIX",
  parcelas: 1,
  parcelas_saldo: 1,
  status: "pendente",
  valor_sinal: 0,
  valor_a_entrar: 0,
  valor_recorrente: 0,
  parcelas_total: "",
  valor_parcela: 0,
  previsao_entrada: "",
  parcelas_datas: [],
  observacao: "",
  condicao_pagamento: "pago",
};

const VendasPage = () => {
  const [searchParams] = useSearchParams();
  const { data: allVendas = [], isLoading } = useVendas();
  const { data: fechamentos = [], isLoading: isLoadingFechamentos } = useFechamentosDiarios();
  const { data: criativosVendas = [] } = useCriativosVendas();
  const { data: metaAdCreatives = [], isLoading: isLoadingMetaAds, isError: isMetaAdsError } = useMetaAdCreatives();
  const { data: cursosDados = [] } = useCursosDados();
  const { clients: gestaoClients = [] } = useClients();
  const { bookings: courseBookings = [] } = useCourseBookings();
  const dateFilter = useLocalDateFilter();
  const [filterYear, filterMonth] = dateFilter.range.start.split("-").map(Number);
  const { data: monthMetrics = [] } = useMonthMetrics(filterYear, (filterMonth || 1) - 1);
  const vendas = allVendas;
  const monthRange = useMemo(() => {
    const start = `${filterYear}-${String(filterMonth || 1).padStart(2, "0")}-01`;
    const endDate = new Date(filterYear, filterMonth || 1, 0);
    const end = `${filterYear}-${String(filterMonth || 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    return { start, end };
  }, [filterYear, filterMonth]);
  const vendasRegistradasNoMes = useMemo(
    () => allVendas.filter((venda) =>
      venda.data >= monthRange.start &&
      venda.data <= monthRange.end &&
      venda.status !== "cancelada"
    ),
    [allVendas, monthRange.start, monthRange.end],
  );
  const createVenda = useCreateVenda();
  const createFechamento = useCreateFechamentoDiario();
  const createCriativoVenda = useCreateCriativoVenda();
  const updateCriativoVenda = useUpdateCriativoVenda();
  const updateVenda = useUpdateVenda();
  const deleteVenda = useDeleteVenda();
  const clearVendas = useClearVendas();
  const updateFechamento = useUpdateFechamentoDiario();
  const deleteFechamento = useDeleteFechamentoDiario();
  const clearFechamentos = useClearFechamentosDiarios();
  const { session } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") === "pendente" ? "pendente" : "todos");
  const [vendedorFilter, setVendedorFilter] = useState("todos");
  const [pagamentoFilter, setPagamentoFilter] = useState("todos");
  const [origemFilter, setOrigemFilter] = useState("todos");
  const [salesTableSection, setSalesTableSection] = useState<"todos" | "cursos" | "servicos">(
    () => searchParams.get("escopo") === "todos" ? "todos" : "cursos",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [editingFechamento, setEditingFechamento] = useState<FechamentoDiario | null>(null);
  const [editingCriativoVenda, setEditingCriativoVenda] = useState<CriativoVenda | null>(null);
  const [editingRecords, setEditingRecords] = useState<Array<{ venda: Venda; fechamento: FechamentoDiario | null; criativo: CriativoVenda | null }>>([]);
  const [taxProfile, setTaxProfile] = useState<TaxProfile>("opcao1");
  const [quickPayments, setQuickPayments] = useState<Record<string, string>>({});
  const [quickCardInstallments, setQuickCardInstallments] = useState<Record<string, string>>({});
  const [quickPaymentAmounts, setQuickPaymentAmounts] = useState<Record<string, string>>({});
  const [quickPaymentDates, setQuickPaymentDates] = useState<Record<string, string>>({});
  const [settlingSaleKey, setSettlingSaleKey] = useState<string | null>(null);

  const [form, setForm] = useState({ ...defaultForm });
  const [additionalItems, setAdditionalItems] = useState<VendaItemForm[]>([]);
  const metaAdsWithEmoji = useMemo(
    () => metaAdCreatives.filter((ad) => /\p{Extended_Pictographic}/u.test(ad.name) || /\p{Extended_Pictographic}/u.test(ad.campaignName)),
    [metaAdCreatives],
  );

  const temParcela = PAGAMENTOS_COM_PARCELA.includes(form.pagamento);
  const taxasAtivas = getTaxas(form.pagamento, taxProfile);
  const taxa = temParcela ? (taxasAtivas[form.parcelas] || 0) : 0;
  const valorComJuros = temParcela && form.parcelas >= 1
    ? +(form.valor * (1 - taxa / 100)).toFixed(2)
    : null;
  const valorBase = valorComJuros ?? form.valor;
  const valorRecebido = form.condicao_pagamento === "pago" ? valorBase : Number(form.valor_sinal || 0);
  const comissao = +(valorRecebido * getSalesCommissionRate(form.origem)).toFixed(2);

  const vendedores = useMemo(() => [...new Set(vendas.map((v) => v.vendedor))].sort(), [vendas]);

  const dateInRange = (date?: string | null) => !!date && date >= dateFilter.range.start && date <= dateFilter.range.end;

  const hasPaymentInRange = (item: FechamentoDiario) =>
    getUniquePaymentHistory(item.observacao).some((entry) => dateInRange(entry.date));

  const getCollectedGrossInPeriod = (item: FechamentoDiario) => {
    const history = getUniquePaymentHistory(item.observacao);
    if (history.length > 0) {
      const historyTotal = history.reduce((sum, entry) => sum + entry.amount, 0);
      const legacyAmount = Math.max(0, Number(item.valor_sinal || 0) - historyTotal);
      const legacyDate = getLocalCreatedDate(item.created_at) || item.data;
      const collectedInPeriod = history.filter((entry) => dateInRange(entry.date)).reduce((sum, entry) => sum + entry.amount, 0) +
        (dateInRange(legacyDate) ? legacyAmount : 0);
      return collectedInPeriod;
    }
    return dateInRange(item.data) || dateInRange(getLocalCreatedDate(item.created_at))
      ? Number(item.valor_sinal || 0)
      : 0;
  };

  const getCollectedNetInPeriod = (item: FechamentoDiario) => {
    const history = getUniquePaymentHistory(item.observacao);
    if (history.length > 0) {
      const historyNetTotal = history.reduce(
        (sum, entry) => sum + Number(entry.netAmount ?? getNetPaymentValue(entry.amount, entry.method, getPaymentInstallments(entry.method), taxProfile)),
        0,
      );
      const legacyNetAmount = Math.max(0, getFechamentoCollectedNet(item) - historyNetTotal);
      const legacyDate = getLocalCreatedDate(item.created_at) || item.data;
      const collectedInPeriod = history
        .filter((entry) => dateInRange(entry.date))
        .reduce((sum, entry) => sum + Number(entry.netAmount ?? getNetPaymentValue(entry.amount, entry.method, getPaymentInstallments(entry.method), taxProfile)), 0) +
        (dateInRange(legacyDate) ? legacyNetAmount : 0);
      return collectedInPeriod;
    }
    return dateInRange(item.data) || dateInRange(getLocalCreatedDate(item.created_at))
      ? getFechamentoCollectedNet(item)
      : 0;
  };

  const isCarriedOverReceivable = (item: FechamentoDiario) => {
    if (dateFilter.mode !== "mes" || Number(item.valor_a_entrar || 0) <= 0) return false;
    if (["cancelado", "recebido"].includes(normalizeFechamentoStatus(item.status))) return false;
    const storedDates = getStoredParcelDates(item).filter(Boolean).sort();
    const dueDate = storedDates.length > 0
      ? storedDates[storedDates.length - 1]
      : item.previsao_entrada || item.data;
    return Boolean(dueDate && dueDate < dateFilter.range.start);
  };

  const getAReceberNoPeriodo = (item: FechamentoDiario) => {
    if (dateFilter.mode !== "mes" && (dateInRange(item.data) || dateInRange(getLocalCreatedDate(item.created_at)))) {
      return Number(item.valor_a_entrar || 0);
    }
    if (isCarriedOverReceivable(item)) return Number(item.valor_a_entrar || 0);
    const parcelasNoPeriodo = getStoredParcelDates(item).filter(dateInRange);
    const isBoletoParcelado = Number(item.parcelas_total || 0) > 1;
    if (isBoletoParcelado && parcelasNoPeriodo.length > 0 && Number(item.valor_parcela || 0) > 0) {
      return parcelasNoPeriodo.length * Number(item.valor_parcela || 0);
    }
    // Em vendas comuns, a previsão atual é a fonte principal. Isso evita que
    // datas antigas mantidas no registro façam um saldo reagendado entrar no
    // mês errado (por exemplo, uma previsão alterada de agosto para outubro).
    if (item.previsao_entrada) {
      return dateInRange(item.previsao_entrada) ? Number(item.valor_a_entrar || 0) : 0;
    }
    if (parcelasNoPeriodo.length > 0 && Number(item.valor_parcela || 0) > 0) {
      return parcelasNoPeriodo.length * Number(item.valor_parcela || 0);
    }
    if (dateInRange(item.data) && !item.previsao_entrada && getStoredParcelDates(item).length === 0) {
      return Number(item.valor_a_entrar || 0);
    }
    return 0;
  };

  const fechamentosPeriodo = useMemo(() => {
    return fechamentos.filter((item) => {
      const hasRecurringInPeriod = Number(item.valor_recorrente || 0) > 0 && item.data <= dateFilter.range.end;
      return (
        dateInRange(item.data) ||
        dateInRange(getLocalCreatedDate(item.created_at)) ||
        hasPaymentInRange(item) ||
        isCarriedOverReceivable(item) ||
        dateInRange(item.previsao_entrada) ||
        getStoredParcelDates(item).some(dateInRange) ||
        hasRecurringInPeriod
      );
    });
  }, [fechamentos, dateFilter.range.start, dateFilter.range.end]);

  const filtered = useMemo(() => {
    return vendas.filter((v) => {
      const categoria = normalizeText(getVendaCategoria(v));
      const hasRelatedFinancialActivity = fechamentos.some((item) =>
        normalizeFechamentoStatus(item.status) !== "cancelado" &&
        normalizeText(item.cliente) === normalizeText(v.cliente) &&
        normalizeText(item.vendedor) === normalizeText(v.vendedor) &&
        normalizeText(getFechamentoCategoria(item)) === categoria &&
        (dateInRange(item.data) || dateInRange(getLocalCreatedDate(item.created_at)) || hasPaymentInRange(item) || isCarriedOverReceivable(item))
      );
      if (!dateInRange(v.data) && !dateInRange(getLocalCreatedDate(v.created_at)) && !hasRelatedFinancialActivity) return false;
      if (search && !v.cliente.toLowerCase().includes(search.toLowerCase()) && !v.produto.toLowerCase().includes(search.toLowerCase()) && !v.vendedor.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === "cancelada" && v.status !== "cancelada") return false;
      if ((statusFilter === "paga" || statusFilter === "pendente") && v.status === "cancelada") return false;
      if (vendedorFilter !== "todos" && v.vendedor !== vendedorFilter) return false;
      if (pagamentoFilter !== "todos" && v.pagamento !== pagamentoFilter) return false;
      if (origemFilter !== "todos" && (v.origem || "") !== origemFilter) return false;
      return true;
    });
  }, [vendas, fechamentos, search, statusFilter, vendedorFilter, pagamentoFilter, origemFilter, dateFilter.range.start, dateFilter.range.end]);

  const fechamentosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fechamentosPeriodo.filter((item) => {
      const fechamentoStatus = normalizeFechamentoStatus(item.status);
      if (origemFilter !== "todos" && (item.origem || "") !== origemFilter) return false;
      if (statusFilter === "cancelada") {
        if (fechamentoStatus !== "cancelado") return false;
      } else if (fechamentoStatus === "cancelado") {
        return false;
      }
      if (!q) return true;
      return [item.cliente, item.vendedor, item.origem || "", getFechamentoCategoria(item), item.produto_servico, item.observacao || ""]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [fechamentosPeriodo, search, origemFilter, statusFilter]);

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
      comissao: +(valorLiquido * getSalesCommissionRate(v.origem)).toFixed(2),
      taxa: taxaVenda,
    };
  };

  const isCourseSale = (venda: Venda) => COURSE_PRODUCTS.some(
    (produto) => normalizeText(produto) === normalizeText(getVendaCategoria(venda)),
  );

  const tableFilteredSales = useMemo(
    () => filtered.filter((venda) => {
      if (salesTableSection === "todos") return true;
      return salesTableSection === "cursos" ? isCourseSale(venda) : !isCourseSale(venda);
    }),
    [filtered, salesTableSection],
  );

  const getFechamentoCollectedNet = (fechamento: FechamentoDiario) => {
    // Fonte única para todos os painéis: o valor líquido consolidado salvo no
    // fechamento. O histórico continua disponível para auditoria, mas não é
    // reprocessado aqui porque edições antigas podem conter eventos repetidos.
    return Number(fechamento.valor_sinal_liquido ?? fechamento.valor_sinal ?? 0);
  };

  const vendasAgrupadas = useMemo(() => {
    const grupos = new Map<string, Venda[]>();
    tableFilteredSales.forEach((venda) => {
      const chave = [venda.data, venda.cliente.trim().toLowerCase(), venda.vendedor.trim().toLowerCase()].join("|");
      grupos.set(chave, [...(grupos.get(chave) || []), venda]);
    });

    return [...grupos.entries()].map(([chave, itens]) => {
      const itensPorLancamento = [...itens].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const principal = itensPorLancamento[0];
      const produtos = [...new Set(itens.map((item) => item.produto).filter(Boolean))];
      const servicos = [...new Set(itens.map((item) => item.servico).filter(Boolean))];
      const categoriasGrupo = new Set(itens.map((item) => normalizeText(getVendaCategoria(item))));
      const valoresPositivos = itens.map((item) => Number(item.valor || 0)).filter((valor) => valor > 0);
      const valorTotal = valoresPositivos.reduce((total, valor) => total + valor, 0);
      const liquidosPositivos = itens.map((item) => getVendaValores(item).valorLiquido).filter((valor) => valor > 0);
      const valorLiquido = liquidosPositivos.reduce((total, valor) => total + valor, 0);
      // O fechamento precisa permanecer ligado à venda mesmo quando a previsão
      // de recebimento está em outro mês. O período só é aplicado ao somar
      // os indicadores, não ao localizar o registro financeiro da venda.
      const fechamentosRelacionados = fechamentos.filter((item) =>
        normalizeFechamentoStatus(item.status) !== "cancelado" &&
        item.cliente.trim().toLowerCase() === principal.cliente.trim().toLowerCase() &&
        item.vendedor.trim().toLowerCase() === principal.vendedor.trim().toLowerCase() &&
        categoriasGrupo.has(normalizeText(getFechamentoCategoria(item))),
      );
      const sinalBruto = Math.min(
        valorTotal,
        fechamentosRelacionados.reduce((total, item) => total + Number(item.valor_sinal || 0), 0),
      );
      const sinalLiquido = Math.min(
        sinalBruto,
        fechamentosRelacionados.reduce((total, item) => total + getFechamentoCollectedNet(item), 0),
      );
      const historyById = new Map<string, PaymentHistoryEntry>();
      fechamentosRelacionados.flatMap((item) => getUniquePaymentHistory(item.observacao)).forEach((entry) => {
        const previous = historyById.get(entry.id);
        if (!previous || entry.amount > previous.amount) historyById.set(entry.id, entry);
      });
      const paymentHistory = [...historyById.values()].sort((a, b) => b.date.localeCompare(a.date));
      const historyTotal = paymentHistory.reduce((total, entry) => total + entry.amount, 0);
      if (sinalBruto > historyTotal + 0.01) {
        paymentHistory.push({ id: `legacy-${chave}`, date: getLocalCreatedDate(principal.created_at) || principal.data, amount: sinalBruto - historyTotal, netAmount: Math.max(0, sinalLiquido - paymentHistory.reduce((total, entry) => total + Number(entry.netAmount ?? entry.amount), 0)), method: getSalePaymentLabel(principal) });
      }

      const coletadoPeriodo = paymentHistory
        .filter((entry) => dateInRange(entry.date))
        .reduce((total, entry) => total + Number(entry.netAmount ?? getNetPaymentValue(entry.amount, entry.method, getPaymentInstallments(entry.method), taxProfile)), 0);
      const aReceberPeriodo = fechamentosRelacionados.reduce((total, item) => total + getAReceberNoPeriodo(item), 0);
      const previsoesRecebimento = [...new Set(fechamentosRelacionados
        .flatMap((item) => getStoredParcelDates(item).length ? getStoredParcelDates(item) : [item.previsao_entrada])
        .filter((date): date is string => Boolean(date)))]
        .sort();

      const saleCategories = new Set(itens.map(getVendaCategoria).map(normalizeText));
      const datasPrevistasCurso = [...new Set(courseBookings
        .filter((booking) =>
          booking.status !== "cancelled" &&
          normalizeText(booking.studentName) === normalizeText(principal.cliente) &&
          saleCategories.has(normalizeText(canonicalizeSaleCategory(booking.courseName))),
        )
        .map((booking) => booking.date))]
        .sort();
      const comissaoTotal = itens.reduce((total, item) => total + Number(item.comissao || 0), 0);
      const comissaoPaga = itens.reduce((total, item) => total + getPaidCommissionValue(item), 0);

      return {
        chave,
        principal,
        itens: itensPorLancamento,
        produtos,
        servicos,
        quantidade: itens.length,
        valorTotal,
        valorLiquido,
        sinal: sinalLiquido,
        sinalBruto,
        saldo: Math.max(0, valorTotal - sinalBruto),
        comissao: +comissaoTotal.toFixed(2),
        comissaoPaga: +comissaoPaga.toFixed(2),
        comissaoPendente: +Math.max(0, comissaoTotal - comissaoPaga).toFixed(2),
        paymentHistory,
        coletadoPeriodo,
        aReceberPeriodo,
        pendenciaMesAnterior: fechamentosRelacionados.some(isCarriedOverReceivable),
        previsoesRecebimento,
        datasPrevistasCurso,
      };
    }).filter((grupo) => {
      if (statusFilter === "paga") return grupo.saldo <= 0;
      if (statusFilter === "pendente") return grupo.saldo > 0;
      return true;
    }).sort((a, b) => {
      const porDataDoLancamento = b.principal.data.localeCompare(a.principal.data);
      if (porDataDoLancamento !== 0) return porDataDoLancamento;
      const ultimoLancamentoA = Math.max(...a.itens.map((item) => new Date(item.created_at).getTime()));
      const ultimoLancamentoB = Math.max(...b.itens.map((item) => new Date(item.created_at).getTime()));
      return ultimoLancamentoB - ultimoLancamentoA;
    });
  }, [tableFilteredSales, fechamentos, courseBookings, taxProfile, statusFilter, dateFilter.range.start, dateFilter.range.end]);

  const recurringContractsTotal = useMemo(
    () => gestaoClients
      .filter((client) => client.status === "Ativo")
      .reduce((total, client) => total + getMonthlyContractValue(client), 0),
    [gestaoClients],
  );

  const getItemValores = (item: VendaItemForm) => {
    const itemTemParcela = PAGAMENTOS_COM_PARCELA.includes(item.pagamento);
    const itemTaxa = itemTemParcela ? (getTaxas(item.pagamento, taxProfile)[item.parcelas] || 0) : 0;
    const valorLiquido = itemTemParcela
      ? +(Number(item.valor || 0) * (1 - itemTaxa / 100)).toFixed(2)
      : Number(item.valor || 0);

    return {
      taxa: itemTemParcela ? itemTaxa : null,
      valorLiquido,
      valorRecebidoLiquido: getNetPaymentValue(
        item.condicao_pagamento === "pago" ? Number(item.valor || 0) : Number(item.valor_sinal || 0),
        item.pagamento,
        item.parcelas,
        taxProfile,
      ),
      comissao: +(getNetPaymentValue(item.condicao_pagamento === "pago" ? Number(item.valor || 0) : Number(item.valor_sinal || 0), item.pagamento, item.parcelas, taxProfile) * getSalesCommissionRate(item.origem)).toFixed(2),
      parcelas: itemTemParcela ? `${item.parcelas}x (${itemTaxa}%)` : null,
    };
  };

  const updateCommissionStatus = async (items: Venda[], status_comissao: string) => {
    try {
      const paidAt = new Date().toISOString().split("T")[0];
      await Promise.all(items.map((item) => updateVenda.mutateAsync({
        id: item.id,
        status_comissao,
        ...(status_comissao === "paga" ? {
          comissao_paga_valor: Number(item.comissao || 0),
          data_ultimo_pagamento_comissao: paidAt,
        } : {
          // Uma nova entrada pode gerar comissão pendente, mas nunca apaga o
          // valor que já foi efetivamente pago sobre o sinal.
          comissao_paga_valor: getPaidCommissionValue(item),
          data_ultimo_pagamento_comissao: item.data_ultimo_pagamento_comissao || null,
        }),
      })));
      toast({ title: status_comissao === "paga" ? "Comissão marcada como paga" : "Comissão marcada como pendente" });
    } catch (error) {
      toast({ title: "Erro ao atualizar comissão", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  const settleRemainingBalance = async (saleKey: string, items: Venda[]) => {
    const paymentMethod = quickPayments[saleKey] || "PIX";
    const paymentDate = quickPaymentDates[saleKey] || new Date().toISOString().split("T")[0];
    const installments = Math.max(1, Number(quickCardInstallments[saleKey] || 1));
    const paymentLabel = PAGAMENTOS_COM_PARCELA.includes(paymentMethod) ? `${paymentMethod} — ${installments}x` : paymentMethod;
    const paymentId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${saleKey}`;
    const usedFechamentos = new Set<string>();
    const usedCriativos = new Set<string>();

    const linkedItems = items.map((venda) => {
      const categoria = getVendaCategoria(venda);
      const fechamento = fechamentos.find((item) =>
        !usedFechamentos.has(item.id) &&
        normalizeFechamentoStatus(item.status) !== "cancelado" &&
        item.cliente.trim().toLowerCase() === venda.cliente.trim().toLowerCase() &&
        item.vendedor.trim().toLowerCase() === venda.vendedor.trim().toLowerCase() &&
        getFechamentoCategoria(item) === categoria
      ) || null;
      if (fechamento) usedFechamentos.add(fechamento.id);
      return { venda, categoria, fechamento };
    });
    usedFechamentos.clear();

    const groupBalance = linkedItems.reduce((total, { venda, fechamento }) =>
      total + Math.max(0, Number(venda.valor || 0) - Number(fechamento?.valor_sinal || 0)), 0);
    const requestedAmount = Number(String(quickPaymentAmounts[saleKey] || "").replace(",", "."));
    const paymentAmount = Number.isFinite(requestedAmount) && requestedAmount > 0 ? requestedAmount : groupBalance;
    if (paymentAmount <= 0 || paymentAmount > groupBalance) {
      toast({ title: "Valor inválido", description: `Informe um valor entre R$ 0,01 e ${formatBRL(groupBalance)}.`, variant: "destructive" });
      return;
    }
    const netPaymentAmount = getNetPaymentValue(paymentAmount, paymentMethod, installments, taxProfile);

    const allocations = new Map<string, number>();
    const balances = linkedItems.map(({ venda, fechamento }) => ({
      id: venda.id,
      balance: Math.max(0, Number(venda.valor || 0) - Number(fechamento?.valor_sinal || 0)),
    }));
    let amountToAllocate = paymentAmount;
    while (amountToAllocate > 0.001) {
      const available = balances.filter((item) => item.balance > 0.001);
      if (available.length === 0) break;
      const exact = available.find((item) => Math.abs(item.balance - amountToAllocate) < 0.01);
      const larger = available
        .filter((item) => item.balance > amountToAllocate)
        .sort((a, b) => a.balance - b.balance)[0];
      const target = exact || larger || available.sort((a, b) => b.balance - a.balance)[0];
      const allocated = Math.min(target.balance, amountToAllocate);
      allocations.set(target.id, (allocations.get(target.id) || 0) + allocated);
      target.balance -= allocated;
      amountToAllocate -= allocated;
    }

    try {
      setSettlingSaleKey(saleKey);
      const updates: Promise<unknown>[] = [];

      linkedItems.forEach(({ venda, categoria, fechamento }) => {

        const criativo = criativosVendas.find((item) =>
          !usedCriativos.has(item.id) &&
          item.data === venda.data &&
          item.nome_aluno.trim().toLowerCase() === venda.cliente.trim().toLowerCase() &&
          Number(item.valor_curso || 0) === Number(venda.valor || 0),
        );
        if (criativo) usedCriativos.add(criativo.id);

        const valorTotal = Number(venda.valor || 0);
        const valorJaColetado = Math.min(valorTotal, Number(fechamento?.valor_sinal || 0));
        const baixaItem = allocations.get(venda.id) || 0;
        const novoColetado = valorJaColetado + baixaItem;
        const valorLiquidoJaColetado = fechamento ? getFechamentoCollectedNet(fechamento) : 0;
        const baixaLiquidaItem = paymentAmount > 0 ? +(netPaymentAmount * (baixaItem / paymentAmount)).toFixed(2) : 0;
        const novoColetadoLiquido = valorLiquidoJaColetado + baixaLiquidaItem;
        const novoSaldo = Math.max(0, valorTotal - novoColetado);
        const novaComissao = +(novoColetadoLiquido * getSalesCommissionRate(venda.origem)).toFixed(2);
        const comissaoJaPaga = getPaidCommissionValue(venda);
        updates.push(updateVenda.mutateAsync({
          id: venda.id,
          pagamento_saldo: paymentLabel,
          comissao: novaComissao,
          status_comissao: baixaItem > 0 && novaComissao > comissaoJaPaga + 0.009 ? "pendente" : venda.status_comissao,
          status: novoSaldo <= 0 ? "pago" : "pendente",
        }));

        const fechamentoPayload = {
          data: paymentDate,
          valor_sinal: novoColetado,
          valor_sinal_liquido: novoColetadoLiquido,
          valor_a_entrar: novoSaldo,
          valor_recorrente: 0,
          parcelas_total: null,
          valor_parcela: 0,
          previsao_entrada: novoSaldo <= 0 ? null : (fechamento?.previsao_entrada || venda.data),
          parcelas_datas: [],
          status: novoSaldo <= 0 ? "recebido" : "a receber",
          pagamento_saldo: paymentLabel,
          observacao: baixaItem > 0
            ? appendPaymentHistory(fechamento?.observacao, { id: paymentId, date: paymentDate, amount: baixaItem, netAmount: baixaLiquidaItem, method: paymentLabel })
            : (fechamento?.observacao || null),
        };
        if (fechamento) {
          updates.push(updateFechamento.mutateAsync({ id: fechamento.id, ...fechamentoPayload }));
        } else if (session?.user?.id) {
          updates.push(createFechamento.mutateAsync({
            user_id: session.user.id,
            vendedor: venda.vendedor,
            cliente: venda.cliente,
            produto_servico: categoria,
            categoria,
            origem: venda.origem || null,
            ...fechamentoPayload,
            pagamento_sinal: null,
          }));
        }
        if (criativo) updates.push(updateCriativoVenda.mutateAsync({ id: criativo.id, sinal: novoColetado }));
      });

      await Promise.all(updates);
      setQuickPaymentAmounts((current) => ({ ...current, [saleKey]: "" }));
      setQuickPaymentDates((current) => ({ ...current, [saleKey]: "" }));
      toast({
        title: paymentAmount >= groupBalance ? "Saldo quitado" : "Pagamento parcial registrado",
        description: `${formatBRL(paymentAmount)} recebido via ${paymentLabel}.`,
      });
    } catch (error) {
      toast({ title: "Erro ao quitar saldo", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setSettlingSaleKey(null);
    }
  };

  const getPrimaryItem = (): VendaItemForm => ({
    produto: form.produto,
    servico: form.servico,
    origem: form.origem,
    criativo: form.criativo,
    valor: form.valor,
    pagamento: form.pagamento,
    pagamento_saldo: form.pagamento_saldo,
    parcelas: form.parcelas,
    parcelas_saldo: form.parcelas_saldo,
    status: form.status,
    valor_sinal: form.valor_sinal,
    valor_a_entrar: form.valor_a_entrar,
    valor_recorrente: form.valor_recorrente,
    parcelas_total: form.parcelas_total,
    valor_parcela: form.valor_parcela,
    previsao_entrada: form.previsao_entrada,
    parcelas_datas: form.parcelas_datas,
    observacao: form.observacao,
    condicao_pagamento: form.condicao_pagamento,
  });

  const addVendaItem = () => {
    setAdditionalItems((prev) => [...prev, {
      ...defaultVendaItem,
      origem: form.origem,
      criativo: form.criativo,
    }]);
  };

  const syncSaleOrigin = (updates: Pick<VendaItemForm, "origem"> | Pick<VendaItemForm, "criativo">) => {
    setAdditionalItems((prev) => prev.map((item) => ({ ...item, ...updates })));
  };

  const updateVendaItem = (index: number, updates: Partial<VendaItemForm>) => {
    setAdditionalItems((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item));
  };

  const removeVendaItem = (index: number) => {
    setAdditionalItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const vendasAprovadas = useMemo(() => filtered.filter((venda) => {
    const status = normalizeText(venda.status);
    if (["aprovada", "aprovado", "paga", "pago"].includes(status)) return true;

    return fechamentosFiltrados.some((fechamento) =>
      fechamento.data === venda.data &&
      normalizeText(fechamento.cliente) === normalizeText(venda.cliente) &&
      normalizeText(fechamento.vendedor) === normalizeText(venda.vendedor) &&
      normalizeFechamentoStatus(fechamento.status) === "recebido"
    );
  }), [filtered, fechamentosFiltrados]);
  const vendasRegistradas = useMemo(() => filtered.filter((v) => v.status !== "cancelada"), [filtered]);

  const fechamentoTotals = useMemo(() => {
    const ativos = fechamentosFiltrados.filter((item) => normalizeFechamentoStatus(item.status) !== "cancelado");
    const coletado = ativos.reduce((sum, item) => sum + getCollectedNetInPeriod(item), 0);
    const aReceber = ativos.reduce((sum, item) => sum + getAReceberNoPeriodo(item), 0);
    const recorrente = ativos.reduce((sum, item) => sum + Number(item.valor_recorrente || 0), 0);
    return {
      coletado,
      aReceber,
      recorrente,
      totalPrevisto: coletado + aReceber,
      quantidade: ativos.length,
    };
  }, [fechamentosFiltrados, dateFilter.range.start, dateFilter.range.end]);

  const vendaTotals = useMemo(() => {
    const feito = vendasAprovadas.reduce((sum, venda) => sum + Number(venda.valor || 0), 0);
    const liquido = vendasAprovadas.reduce((sum, venda) => sum + getVendaValores(venda).valorLiquido, 0);
    const comissao = vendasAprovadas.reduce((sum, venda) => sum + getVendaValores(venda).comissao, 0);
    return {
      feito,
      liquido,
      comissao,
      quantidade: vendasAprovadas.length,
    };
  }, [vendasAprovadas, taxProfile]);

  const integratedCategoryRows = useMemo(() => {
    const map = new Map<string, {
      categoria: string;
      coletado: number;
      aReceber: number;
      recorrente: number;
      feito: number;
      vendas: number;
      comissaoPaga: number;
      taxasMaquininha: number;
      fechamentos: FechamentoDiario[];
    }>();

    const getRow = (categoria: string) => {
      if (!map.has(categoria)) {
        map.set(categoria, { categoria, coletado: 0, aReceber: 0, recorrente: 0, feito: 0, vendas: 0, comissaoPaga: 0, taxasMaquininha: 0, fechamentos: [] });
      }
      return map.get(categoria)!;
    };

    fechamentosFiltrados
      .filter((item) => normalizeFechamentoStatus(item.status) !== "cancelado")
      .forEach((item) => {
        const row = getRow(getFechamentoCategoria(item));
        const coletadoLiquido = getCollectedNetInPeriod(item);
        if (coletadoLiquido > 0) {
          const coletadoBruto = getCollectedGrossInPeriod(item);
          row.coletado += coletadoLiquido;
          row.taxasMaquininha += Math.max(0, coletadoBruto - coletadoLiquido);
        }
        row.aReceber += getAReceberNoPeriodo(item);
        row.recorrente += Number(item.valor_recorrente || 0);
        row.fechamentos.push(item);
      });

    vendasAprovadas.forEach((venda) => {
      const row = getRow(getVendaCategoria(venda));
      row.feito += Number(venda.valor || 0);
      row.vendas += 1;
      row.comissaoPaga += Math.min(
        Number(venda.comissao || 0),
        Number(venda.comissao_paga_valor ?? (venda.status_comissao === "paga" ? venda.comissao : 0)),
      );
    });

    return Array.from(map.values()).sort((a, b) => (b.coletado + b.aReceber + b.feito) - (a.coletado + a.aReceber + a.feito));
  }, [fechamentosFiltrados, vendasAprovadas, dateFilter.range.start, dateFilter.range.end, taxProfile]);

  const salesTotalsBreakdown = useMemo(() => integratedCategoryRows.reduce((totals, row) => {
    const isCourse = COURSE_PRODUCTS.some((produto) => normalizeText(produto) === normalizeText(row.categoria));
    const target = isCourse ? totals.cursos : totals.servicos;
    target.coletado += row.coletado;
    target.aReceber += row.aReceber;
    target.vendas += row.vendas;
    totals.total.coletado += row.coletado;
    totals.total.aReceber += row.aReceber;
    totals.total.vendas += row.vendas;
    return totals;
  }, {
    total: { coletado: 0, aReceber: 0, vendas: 0 },
    cursos: { coletado: 0, aReceber: 0, vendas: 0 },
    servicos: { coletado: 0, aReceber: 0, vendas: 0 },
  }), [integratedCategoryRows]);

  const accumulatedTotalsBreakdown = useMemo(() => fechamentos
    .filter((item) => normalizeFechamentoStatus(item.status) !== "cancelado")
    .reduce((totals, item) => {
      const isCourse = COURSE_PRODUCTS.some((produto) => normalizeText(produto) === normalizeText(getFechamentoCategoria(item)));
      const target = isCourse ? totals.cursos : totals.servicos;
      const historyNetTotal = getUniquePaymentHistory(item.observacao).reduce(
        (sum, entry) => sum + Number(entry.netAmount ?? getNetPaymentValue(entry.amount, entry.method, getPaymentInstallments(entry.method), taxProfile)),
        0,
      );
      const coletado = Math.max(getFechamentoCollectedNet(item), historyNetTotal);
      const aReceber = Number(item.valor_a_entrar || 0);
      target.coletado += coletado;
      target.aReceber += aReceber;
      totals.total.coletado += coletado;
      totals.total.aReceber += aReceber;
      return totals;
    }, {
      total: { coletado: 0, aReceber: 0 },
      cursos: { coletado: 0, aReceber: 0 },
      servicos: { coletado: 0, aReceber: 0 },
    }), [fechamentos, taxProfile]);

  const visiblePeriodTotals = salesTableSection === "cursos"
    ? salesTotalsBreakdown.cursos
    : salesTableSection === "servicos"
      ? salesTotalsBreakdown.servicos
      : salesTotalsBreakdown.total;

  const metasPrincipais = useMemo(() => {
    const rows = monthMetrics || [];
    const lastWithTarget = (keys: Array<"meta_cursos" | "super_meta_cursos" | "meta_servicos" | "super_meta_servicos" | "meta_suporte_extra" | "super_meta_suporte_extra" | "meta_site" | "super_meta_site" | "meta_negocio_local" | "super_meta_negocio_local" | "meta_crm" | "super_meta_crm" | "meta_upsell" | "super_meta_upsell">) => {
      for (const key of keys) {
        const found = [...rows].reverse().find((item) => Number(item?.[key] || 0) > 0);
        if (found) return Number(found[key] || 0);
      }
      return 0;
    };

    const metas = {
      cursosMarcados: lastWithTarget(["meta_cursos", "super_meta_cursos"]),
      cursosFeitos: lastWithTarget(["meta_cursos", "super_meta_cursos"]),
      servicos: lastWithTarget(["meta_servicos", "super_meta_servicos"]),
      suporteExtra: lastWithTarget(["meta_suporte_extra", "super_meta_suporte_extra"]),
      site: lastWithTarget(["meta_site", "super_meta_site"]),
      negocioLocal: lastWithTarget(["meta_negocio_local", "super_meta_negocio_local"]),
      crm: lastWithTarget(["meta_crm", "super_meta_crm"]),
      upsell: lastWithTarget(["meta_upsell", "super_meta_upsell"]),
    };

    const cursosFeitosNoMes = cursosDados.filter((item) => item.data >= monthRange.start && item.data <= monthRange.end);
    const cursosFeitosNoPeriodo = cursosDados.filter((item) => item.data >= dateFilter.range.start && item.data <= dateFilter.range.end);
    const vendasRegistradasNoPeriodo = allVendas.filter((venda) =>
      venda.data >= dateFilter.range.start &&
      venda.data <= dateFilter.range.end &&
      venda.status !== "cancelada"
    );
    const diasUteisNoMes = (() => {
      const totalDias = new Date(filterYear, filterMonth || 1, 0).getDate();
      let total = 0;
      for (let dia = 1; dia <= totalDias; dia += 1) {
        const semana = new Date(filterYear, (filterMonth || 1) - 1, dia).getDay();
        if (semana >= 1 && semana <= 5) total += 1;
      }
      return Math.max(total, 1);
    })();

    const countRegisteredSales = (category: string) => vendasRegistradasNoMes.filter(
      (venda) => normalizeText(getVendaCategoria(venda)) === normalizeText(category),
    ).length;
    const countPeriodSales = (category: string) => vendasRegistradasNoPeriodo.filter(
      (venda) => normalizeText(getVendaCategoria(venda)) === normalizeText(category),
    ).length;

    const counts = {
      cursosMarcados: vendasRegistradasNoMes.filter((venda) => COURSE_PRODUCTS.some((produto) => normalizeText(produto) === normalizeText(getVendaCategoria(venda)))).length,
      cursosFeitos: cursosFeitosNoMes.filter((item) => !!item.survey_response_id).length,
      servicos: vendasRegistradasNoMes.filter((venda) => GENERAL_SERVICE_OPTIONS.some((servico) => normalizeText(servico) === normalizeText(getVendaCategoria(venda)))).length,
      suporteExtra: countRegisteredSales("Suporte Extra"),
      site: countRegisteredSales("Desenvolvimento de Site"),
      negocioLocal: countRegisteredSales("Captacao/Edicao de Conteudo"),
      crm: countRegisteredSales("CRM/Treinamento Comercial"),
      upsell: vendasRegistradasNoMes.filter((venda) => normalizeText(venda.origem) === normalizeText("Upsell") || normalizeText(getVendaCategoria(venda)) === normalizeText("Upsell")).length,
    };

    const periodCounts = {
      cursosMarcados: vendasRegistradasNoPeriodo.filter((venda) => COURSE_PRODUCTS.some((produto) => normalizeText(produto) === normalizeText(getVendaCategoria(venda)))).length,
      cursosFeitos: cursosFeitosNoPeriodo.filter((item) => !!item.survey_response_id).length,
      servicos: vendasRegistradasNoPeriodo.filter((venda) => GENERAL_SERVICE_OPTIONS.some((servico) => normalizeText(servico) === normalizeText(getVendaCategoria(venda)))).length,
      suporteExtra: countPeriodSales("Suporte Extra"),
      site: countPeriodSales("Desenvolvimento de Site"),
      negocioLocal: countPeriodSales("Captacao/Edicao de Conteudo"),
      crm: countPeriodSales("CRM/Treinamento Comercial"),
      upsell: vendasRegistradasNoPeriodo.filter((venda) => normalizeText(venda.origem) === normalizeText("Upsell") || normalizeText(getVendaCategoria(venda)) === normalizeText("Upsell")).length,
    };

    const withPeriodGoals = (label: string, atualMes: number, atualPeriodo: number, meta: number) => ({
      label,
      atualMes,
      atualPeriodo,
      meta,
      metaDia: meta > 0 ? Math.ceil(meta / diasUteisNoMes) : 0,
      metaSemana: meta > 0 ? Math.ceil((meta / diasUteisNoMes) * 5) : 0,
    });

    return [
      withPeriodGoals("Cursos marcados", counts.cursosMarcados, periodCounts.cursosMarcados, metas.cursosMarcados),
      withPeriodGoals("Cursos feitos", counts.cursosFeitos, periodCounts.cursosFeitos, metas.cursosFeitos),
      withPeriodGoals("Serviços", counts.servicos, periodCounts.servicos, metas.servicos),
      withPeriodGoals("Suporte Extra", counts.suporteExtra, periodCounts.suporteExtra, metas.suporteExtra),
      withPeriodGoals("Site", counts.site, periodCounts.site, metas.site),
      withPeriodGoals("Captação", counts.negocioLocal, periodCounts.negocioLocal, metas.negocioLocal),
      withPeriodGoals("CRM", counts.crm, periodCounts.crm, metas.crm),
      withPeriodGoals("Upsell", counts.upsell, periodCounts.upsell, metas.upsell),
    ];
  }, [monthMetrics, vendasRegistradasNoMes, cursosDados, monthRange.start, monthRange.end, allVendas, dateFilter.range.start, dateFilter.range.end, filterYear, filterMonth]);

  const renameCategoryFechamentos = async (categoria: string, items: FechamentoDiario[]) => {
    if (items.length === 0) {
      toast({
        title: "Categoria gerada pelas vendas",
        description: "Edite a categoria diretamente na venda para alterar essa linha.",
      });
      return;
    }

    const nextCategory = window.prompt("Novo nome da categoria", categoria)?.trim();
    if (!nextCategory || nextCategory === categoria) return;

    try {
      await Promise.all(items.map((item) => updateFechamento.mutateAsync({
        id: item.id,
        categoria: nextCategory,
        produto_servico: nextCategory,
      })));
      toast({ title: "Categoria atualizada", description: `${items.length} lancamento(s) ajustado(s).` });
    } catch (err: any) {
      toast({ title: "Erro ao atualizar categoria", description: err.message, variant: "destructive" });
    }
  };

  const deleteCategoryFechamentos = async (categoria: string, items: FechamentoDiario[]) => {
    if (items.length === 0) {
      toast({
        title: "Categoria gerada pelas vendas",
        description: "Essa linha nao tem lancamentos de fechamento para remover.",
      });
      return;
    }

    const confirmed = window.confirm(`Remover ${items.length} lancamento(s) de fechamento da categoria "${categoria}" neste periodo?`);
    if (!confirmed) return;

    try {
      await Promise.all(items.map((item) => deleteFechamento.mutateAsync(item.id)));
      toast({ title: "Lancamentos removidos", description: `${items.length} item(ns) removido(s) da central.` });
    } catch (err: any) {
      toast({ title: "Erro ao remover lancamentos", description: err.message, variant: "destructive" });
    }
  };


  const openNewDialog = () => {
    setEditingVenda(null);
    setEditingFechamento(null);
    setEditingCriativoVenda(null);
    setEditingRecords([]);
    setForm({ ...defaultForm });
    setAdditionalItems([]);
    setDialogOpen(true);
  };

  const openEditDialog = (groupItems: Venda[]) => {
    const v = groupItems[0];
    setEditingVenda(v);
    const usedFechamentos = new Set<string>();
    const usedCriativos = new Set<string>();
    const records = groupItems.map((venda) => {
      const categoria = getVendaCategoria(venda);
      const fechamento = fechamentos
        .filter((item) =>
          !usedFechamentos.has(item.id) &&
          normalizeFechamentoStatus(item.status) !== "cancelado" &&
          item.cliente.trim().toLowerCase() === venda.cliente.trim().toLowerCase() &&
          item.vendedor.trim().toLowerCase() === venda.vendedor.trim().toLowerCase() &&
          getFechamentoCategoria(item) === categoria,
        )
        .sort((a, b) => {
          const updatedDiff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          if (updatedDiff !== 0) return updatedDiff;
          const score = (item: FechamentoDiario) =>
            (normalizeFechamentoStatus(item.status) === "recebido" ? 1_000_000 : 0) +
            (getPaymentHistory(item.observacao).length > 0 ? 100_000 : 0) +
            Number(item.valor_sinal || 0);
          return score(b) - score(a);
        })[0] || null;
      if (fechamento) usedFechamentos.add(fechamento.id);
      const criativo = criativosVendas.find((item) =>
        !usedCriativos.has(item.id) && item.data === venda.data &&
        item.nome_aluno.trim().toLowerCase() === venda.cliente.trim().toLowerCase() &&
        Number(item.valor_curso || 0) === Number(venda.valor || 0),
      ) || null;
      if (criativo) usedCriativos.add(criativo.id);
      return { venda, fechamento, criativo };
    });
    const toItemForm = ({ venda, fechamento, criativo }: typeof records[number]): VendaItemForm => {
      const parcelasNum = venda.parcelas ? parseInt(venda.parcelas) : 1;
      const pagamentoSaldoRegistrado = venda.pagamento_saldo || fechamento?.pagamento_saldo || "PIX";
      const valorSinal = Number(fechamento?.valor_sinal || 0);
      const valorAEntrar = Number(fechamento?.valor_a_entrar || 0);
      const condicaoPagamento = fechamento?.parcelas_total ? "boleto" : valorAEntrar > 0 && valorSinal > 0 ? "sinal" : valorAEntrar > 0 ? "a_receber" : "pago";
      return {
        produto: venda.produto,
        servico: venda.servico || "",
        origem: venda.origem || "",
        criativo: criativo?.criativo || "",
        valor: Number(venda.valor || 0),
        pagamento: venda.pagamento,
        pagamento_saldo: getPaymentMethod(pagamentoSaldoRegistrado),
        parcelas: isNaN(parcelasNum) ? 1 : parcelasNum,
        parcelas_saldo: getPaymentInstallments(pagamentoSaldoRegistrado),
        status: venda.status,
        valor_sinal: valorSinal,
        valor_a_entrar: valorAEntrar,
        valor_recorrente: Number(fechamento?.valor_recorrente || 0),
        parcelas_total: fechamento?.parcelas_total ? String(fechamento.parcelas_total) : "",
        valor_parcela: Number(fechamento?.valor_parcela || 0),
        previsao_entrada: fechamento?.previsao_entrada || "",
        parcelas_datas: fechamento ? getStoredParcelDates(fechamento) : [],
        observacao: getManualObservation(fechamento?.observacao),
        condicao_pagamento: condicaoPagamento,
      };
    };
    const primaryItem = toItemForm(records[0]);
    const fechamento = records[0].fechamento;
    const criativoVenda = records[0].criativo;
    setEditingFechamento(fechamento);
    setEditingCriativoVenda(criativoVenda);
    setEditingRecords(records);
    setForm({
      ...defaultForm,
      data: v.data,
      vendedor: v.vendedor,
      cliente: v.cliente,
      ...primaryItem,
    });
    setAdditionalItems(records.slice(1).map(toItemForm));
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    const buildPayload = (item: VendaItemForm) => {
      const itemValores = getItemValores(item);
      const pagamentoSaldo = PAGAMENTOS_COM_PARCELA.includes(item.pagamento_saldo)
        ? `${item.pagamento_saldo} — ${item.parcelas_saldo}x`
        : item.pagamento_saldo;
      return {
      user_id: session.user.id,
      data: form.data,
      vendedor: form.vendedor,
      cliente: form.cliente,
      produto: item.produto,
      valor: Number(item.valor || 0),
      pagamento: item.pagamento,
      pagamento_saldo: pagamentoSaldo,
      parcelas: itemValores.parcelas,
      valor_com_juros: itemValores.parcelas ? itemValores.valorLiquido : null,
      comissao: itemValores.comissao,
      status: item.status === "cancelada" ? "cancelada" : item.condicao_pagamento === "pago" ? "pago" : item.status,
      servico: item.servico,
      origem: item.origem,
    };
    };

    const buildFechamentoPayload = (item: VendaItemForm, previousObservation?: string | null) => {
      const valorTotal = Number(item.valor || 0);
      const pagoIntegralmente = item.condicao_pagamento === "pago";
      const valorSinal = pagoIntegralmente ? valorTotal : Math.min(Number(item.valor_sinal || 0), valorTotal);
      const valorSinalLiquido = getNetPaymentValue(valorSinal, item.pagamento, item.parcelas, taxProfile);
      const valorAEntrar = pagoIntegralmente ? 0 : Math.max(0, valorTotal - valorSinal);
      const parcelasTotal = item.condicao_pagamento === "boleto" ? Math.max(1, Number(item.parcelas_total || 1)) : null;
      const parcelasDatas = parcelasTotal ? buildParcelDates(parcelasTotal, item.previsao_entrada || form.data, item.parcelas_datas) : [];
      const pagamentoSaldo = PAGAMENTOS_COM_PARCELA.includes(item.pagamento_saldo)
        ? `${item.pagamento_saldo} — ${item.parcelas_saldo}x`
        : item.pagamento_saldo;

      return {
        user_id: session.user.id,
        data: form.data,
        vendedor: form.vendedor,
        cliente: form.cliente,
        produto_servico: item.servico || item.produto || "Sem categoria",
        categoria: item.servico || item.produto || null,
        origem: item.origem || null,
        valor_sinal: valorSinal,
        valor_sinal_liquido: valorSinalLiquido,
        valor_a_entrar: valorAEntrar,
        valor_recorrente: 0,
        parcelas_total: parcelasTotal,
        valor_parcela: parcelasTotal ? +(valorAEntrar / parcelasTotal).toFixed(2) : 0,
        previsao_entrada: pagoIntegralmente ? null : (item.previsao_entrada || parcelasDatas[0] || null),
        parcelas_datas: parcelasDatas,
        status: item.status === "cancelada" ? "cancelado" : pagoIntegralmente ? "recebido" : "a receber",
        observacao: mergeObservationWithPaymentHistory(item.observacao, previousObservation),
        pagamento_sinal: item.condicao_pagamento === "sinal" || item.condicao_pagamento === "boleto" ? item.pagamento : null,
        pagamento_saldo: pagoIntegralmente ? null : pagamentoSaldo,
      };
    };

    const buildCriativoPayload = (item: VendaItemForm) => {
      const metaAd = metaAdCreatives.find((ad) => ad.name === item.criativo);
      return {
        user_id: session.user.id,
        nome_aluno: form.cliente,
        data: form.data,
        criativo: item.criativo.trim(),
        codigo: metaAd?.id || null,
        valor_curso: Number(item.valor || 0),
        valor_ads: Number(metaAd?.spend || 0),
        roas: Number(metaAd?.spend || 0) > 0 ? Number(item.valor || 0) / Number(metaAd?.spend || 0) : 0,
        sinal: item.condicao_pagamento === "pago" ? Number(item.valor || 0) : Number(item.valor_sinal || 0),
        status: item.status,
        quantidade_cursos: 1,
      };
    };

    if (editingVenda) {
      const saleItems = [getPrimaryItem(), ...additionalItems];
      const updates: Promise<unknown>[] = [];
      saleItems.forEach((item, index) => {
        const record = editingRecords[index];
        if (record) {
          updates.push(updateVenda.mutateAsync({ id: record.venda.id, ...buildPayload(item) }));
          updates.push(record.fechamento
            ? updateFechamento.mutateAsync({ id: record.fechamento.id, ...buildFechamentoPayload(item, record.fechamento.observacao) })
            : createFechamento.mutateAsync(buildFechamentoPayload(item)));
          if (item.criativo.trim()) {
            updates.push(record.criativo
              ? updateCriativoVenda.mutateAsync({ id: record.criativo.id, ...buildCriativoPayload(item) })
              : createCriativoVenda.mutateAsync(buildCriativoPayload(item)));
          }
        } else if (item.produto || item.servico || Number(item.valor || 0)) {
          updates.push(createVenda.mutateAsync(buildPayload(item)));
          updates.push(createFechamento.mutateAsync(buildFechamentoPayload(item)));
          if (item.criativo.trim()) updates.push(createCriativoVenda.mutateAsync(buildCriativoPayload(item)));
        }
      });
      Promise.all(updates)
        .then(() => {
          toast({ title: "Venda atualizada!", description: `${saleItems.length} curso(s) e seus dados financeiros foram atualizados.` });
          setDialogOpen(false);
          setEditingVenda(null);
          setEditingFechamento(null);
          setEditingCriativoVenda(null);
          setEditingRecords([]);
          setForm({ ...defaultForm });
          setAdditionalItems([]);
        })
        .catch((err) => toast({ title: "Erro", description: err.message, variant: "destructive" }));
    } else {
      const saleItems = [getPrimaryItem(), ...additionalItems].filter((item) =>
        item.produto || item.servico || item.origem || Number(item.valor || 0),
      );

      if (saleItems.length === 0) {
        toast({ title: "Preencha pelo menos um item da venda", variant: "destructive" });
        return;
      }

      Promise.all(saleItems.flatMap((item) => [
        createVenda.mutateAsync(buildPayload(item)),
        createFechamento.mutateAsync(buildFechamentoPayload(item)),
        ...(item.criativo ? [createCriativoVenda.mutateAsync(buildCriativoPayload(item))] : []),
      ]))
        .then(() => {
          toast({ title: saleItems.length > 1 ? "Vendas registradas!" : "Venda registrada!" });
          setDialogOpen(false);
          setForm({ ...defaultForm });
          setAdditionalItems([]);
        })
        .catch((err) => toast({ title: "Erro", description: err.message, variant: "destructive" }));
    }
  };

  const handleClear = () => {
    Promise.all([clearVendas.mutateAsync(), clearFechamentos.mutateAsync()])
      .then(() => toast({ title: "Dados limpos!", description: "Vendas e fechamentos foram removidos." }))
      .catch((err) => toast({ title: "Erro", description: err.message, variant: "destructive" }));
  };

  const isSaving = createVenda.isPending || createFechamento.isPending || createCriativoVenda.isPending || updateVenda.isPending || updateFechamento.isPending || updateCriativoVenda.isPending;
  const isClearing = clearVendas.isPending || clearFechamentos.isPending;

  const vendaFormDialog = (
    <DialogContent
      className="w-[calc(100vw-1rem)] sm:max-w-[96vw] xl:max-w-7xl max-h-[94vh] overflow-hidden p-0 gap-0 border-border/40 bg-card"
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onInteractOutside={(event) => event.preventDefault()}
      onPointerDownOutside={(event) => event.preventDefault()}
      onFocusOutside={(event) => event.preventDefault()}
    >
      <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-4 py-3 sm:px-5 border-b border-border/20">
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
      <form onSubmit={handleSubmit} className="flex max-h-[calc(94vh-82px)] min-h-0 flex-col">
        <datalist id="meta-ad-names">
          {metaAdsWithEmoji.map((ad) => (
            <option key={ad.id} value={ad.name}>{ad.campaignName}</option>
          ))}
        </datalist>
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3">
        <div className="rounded-xl border border-border/30 bg-secondary/10 p-3 sm:p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Cliente da venda</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Data</Label><Input type="date" value={form.data} onChange={(event) => setForm((previous) => ({ ...previous, data: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Nome do cliente</Label><Input value={form.cliente} onChange={(event) => setForm((previous) => ({ ...previous, cliente: event.target.value }))} required placeholder="Nome do cliente" /></div>
          </div>
        </div>
        {(
          <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">Planilha de produtos e serviços</p>
                <p className="text-xs text-muted-foreground/70">Todos os itens desta venda, um abaixo do outro e editáveis na linha.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addVendaItem}><Plus className="h-4 w-4" /> Adicionar linha</Button>
            </div>
            <div className="space-y-3">
              {([form, ...additionalItems] as VendaItemForm[]).map((saleItem, rowIndex) => {
                const updateRow = (updates: Partial<VendaItemForm>) => rowIndex === 0 ? setForm((previous) => ({ ...previous, ...updates })) : updateVendaItem(rowIndex - 1, updates);
                const fieldClass = "min-w-0 space-y-1.5";
                const itemValores = getItemValores(saleItem);
                const itemTemParcela = PAGAMENTOS_COM_PARCELA.includes(saleItem.pagamento);
                return <div key={rowIndex} className="rounded-lg border border-border/40 bg-background/30 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">Item {rowIndex + 1}</span>
                    {rowIndex > 0 && rowIndex - 1 >= editingRecords.length - 1 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeVendaItem(rowIndex - 1)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <div className={fieldClass}><Label className="text-xs text-muted-foreground">Produto</Label><Select value={saleItem.produto || "__none__"} onValueChange={(produto) => updateRow({ produto: produto === "__none__" ? "" : produto })}><SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Nenhum produto</SelectItem>{PRODUTOS.map((produto) => <SelectItem key={produto} value={produto}>{produto}</SelectItem>)}</SelectContent></Select></div>
                    <div className={fieldClass}><Label className="text-xs text-muted-foreground">Serviço</Label><Select value={saleItem.servico || "__none__"} onValueChange={(servico) => updateRow({ servico: servico === "__none__" ? "" : servico })}><SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Nenhum serviço</SelectItem>{SERVICOS.map((servico) => <SelectItem key={servico} value={servico}>{servico}</SelectItem>)}</SelectContent></Select></div>
                    <div className={fieldClass}><Label className="text-xs text-muted-foreground">Origem</Label><Select value={saleItem.origem} onValueChange={(origem) => updateRow({ origem })}><SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent>{ORIGENS.map((origem) => <SelectItem key={origem} value={origem}>{origem}</SelectItem>)}</SelectContent></Select></div>
                    <div className={fieldClass}><Label className="text-xs text-muted-foreground">Valor (R$)</Label><Input className="h-9 w-full" type="number" min="0" step="0.01" value={saleItem.valor || ""} onChange={(event) => updateRow({ valor: Number(event.target.value) })} /></div>
                    <div className={fieldClass}><Label className="text-xs text-muted-foreground">Pagamento</Label><Select value={saleItem.pagamento} onValueChange={(pagamento) => updateRow({ pagamento, parcelas: PAGAMENTOS_COM_PARCELA.includes(pagamento) ? saleItem.parcelas : 1 })}><SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent>{["Dinheiro", "PIX", "Débito", "Conta de anúncio", "Infinity (Visa/Master)", "Infinity Elo/Amex", "Link Infinity", "Boleto"].map((pagamento) => <SelectItem key={pagamento} value={pagamento}>{pagamento}</SelectItem>)}</SelectContent></Select></div>
                    <div className={fieldClass}><Label className="text-xs text-muted-foreground">Situação financeira</Label><Select value={saleItem.condicao_pagamento} onValueChange={(condicao_pagamento) => updateRow({ condicao_pagamento, valor_sinal: condicao_pagamento === "pago" ? saleItem.valor : condicao_pagamento === "a_receber" ? 0 : saleItem.valor_sinal })}><SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pago">Pago integralmente</SelectItem><SelectItem value="sinal">Sinal + saldo</SelectItem><SelectItem value="a_receber">Total a receber</SelectItem><SelectItem value="boleto">Boleto parcelado</SelectItem></SelectContent></Select></div>
                    <div className={fieldClass}><Label className="text-xs text-muted-foreground">Coletado (R$)</Label><Input className="h-9 w-full" type="number" min="0" max={saleItem.valor} step="0.01" disabled={saleItem.condicao_pagamento === "pago"} value={saleItem.condicao_pagamento === "pago" ? saleItem.valor : saleItem.valor_sinal || ""} onChange={(event) => updateRow({ valor_sinal: Number(event.target.value) })} /></div>
                    <div className={fieldClass}><Label className="text-xs text-muted-foreground">Status</Label><Select value={saleItem.status} onValueChange={(status) => updateRow({ status })}><SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="aprovada">Aprovada</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border/30 pt-3 sm:grid-cols-2 md:grid-cols-4">
                    {itemTemParcela && <div className={fieldClass}><Label className="text-xs text-muted-foreground">Parcelas</Label><Select value={String(saleItem.parcelas)} onValueChange={(parcelas) => updateRow({ parcelas: Number(parcelas) })}><SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5,6,7,8,9,10,11,12].map((parcela) => <SelectItem key={parcela} value={String(parcela)}>{parcela}x</SelectItem>)}</SelectContent></Select></div>}
                    {itemTemParcela && <div className={fieldClass}><Label className="text-xs text-muted-foreground">Líquido coletado</Label><div className="flex h-9 items-center rounded-md border border-border/30 bg-secondary/30 px-3 text-sm font-semibold text-emerald-400">{formatBRL(itemValores.valorRecebidoLiquido)}</div></div>}
                    <div className={fieldClass}><Label className="text-xs text-muted-foreground">Comissão sobre recebido ({getSalesCommissionPercent(saleItem.origem)}%)</Label><div className="flex h-9 items-center rounded-md border border-border/30 bg-secondary/30 px-3 text-sm font-semibold text-emerald-400">{formatBRL(itemValores.comissao)}</div></div>
                    {saleItem.condicao_pagamento !== "pago" && <div className={fieldClass}><Label className="text-xs text-muted-foreground">Saldo restante</Label><div className="flex h-9 items-center rounded-md border border-border/30 bg-secondary/30 px-3 text-sm font-semibold text-amber-400">{formatBRL(Math.max(0, Number(saleItem.valor || 0) - Number(saleItem.valor_sinal || 0)))}</div></div>}
                    {saleItem.condicao_pagamento !== "pago" && saleItem.condicao_pagamento !== "boleto" && <div className={fieldClass}><Label className="text-xs text-muted-foreground">Pagamento do saldo</Label><Select value={saleItem.pagamento_saldo} onValueChange={(pagamento_saldo) => updateRow({ pagamento_saldo })}><SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent>{["Dinheiro", "PIX", "Débito", "Conta de anúncio", "Infinity (Visa/Master)", "Infinity Elo/Amex", "Link Infinity", "Boleto"].map((pagamento) => <SelectItem key={pagamento} value={pagamento}>{pagamento}</SelectItem>)}</SelectContent></Select></div>}
                    {saleItem.condicao_pagamento !== "pago" && saleItem.condicao_pagamento !== "boleto" && PAGAMENTOS_COM_PARCELA.includes(saleItem.pagamento_saldo) && <div className={fieldClass}><Label className="text-xs text-muted-foreground">Parcelas do saldo</Label><Select value={String(saleItem.parcelas_saldo)} onValueChange={(parcelas_saldo) => updateRow({ parcelas_saldo: Number(parcelas_saldo) })}><SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5,6,7,8,9,10,11,12].map((parcela) => <SelectItem key={parcela} value={String(parcela)}>{parcela}x</SelectItem>)}</SelectContent></Select></div>}
                    {saleItem.condicao_pagamento !== "pago" && <div className={fieldClass}><Label className="text-xs text-muted-foreground">{saleItem.condicao_pagamento === "boleto" ? "Primeiro vencimento" : "Previsão do saldo"}</Label>{saleItem.condicao_pagamento === "boleto" ? <Input className="h-9" type="date" value={saleItem.previsao_entrada} onChange={(event) => updateRow({ previsao_entrada: event.target.value, parcelas_datas: buildParcelDates(saleItem.parcelas_total, event.target.value, saleItem.parcelas_datas) })} /> : <MonthYearPicker value={saleItem.previsao_entrada} onChange={(previsao_entrada) => updateRow({ previsao_entrada })} />}</div>}
                    {saleItem.condicao_pagamento === "boleto" && <div className={fieldClass}><Label className="text-xs text-muted-foreground">Quantidade de boletos</Label><Input className="h-9" type="number" min="1" max="48" value={saleItem.parcelas_total} onChange={(event) => { const parcelas_total = event.target.value; updateRow({ parcelas_total, parcelas_datas: buildParcelDates(parcelas_total, saleItem.previsao_entrada, saleItem.parcelas_datas), valor_parcela: Number(parcelas_total) ? +(Math.max(0, saleItem.valor - saleItem.valor_sinal) / Number(parcelas_total)).toFixed(2) : 0 }); }} /></div>}
                    {saleItem.condicao_pagamento === "boleto" && <div className={fieldClass}><Label className="text-xs text-muted-foreground">Valor por boleto</Label><div className="flex h-9 items-center rounded-md border border-border/30 bg-secondary/30 px-3 text-sm font-semibold">{formatBRL(Number(saleItem.parcelas_total) ? Math.max(0, saleItem.valor - saleItem.valor_sinal) / Number(saleItem.parcelas_total) : 0)}</div></div>}
                    <div className="min-w-0 space-y-1.5 md:col-span-2"><Label className="text-xs text-muted-foreground">Criativo de origem</Label><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Select value={metaAdsWithEmoji.some((ad) => ad.name === saleItem.criativo) ? saleItem.criativo : undefined} onValueChange={(criativo) => updateRow({ criativo })}><SelectTrigger className="h-9 w-full"><SelectValue placeholder={isLoadingMetaAds ? "Carregando anúncios..." : "Selecionar anúncio da Meta"} /></SelectTrigger><SelectContent className="max-h-72">{metaAdsWithEmoji.map((ad) => <SelectItem key={ad.id} value={ad.name}>{ad.name} · {ad.campaignName}</SelectItem>)}</SelectContent></Select><Input className="h-9" list="meta-ad-names" value={saleItem.criativo} onChange={(event) => updateRow({ criativo: event.target.value })} placeholder="Emoji ou nome do anúncio" /></div></div>
                    <div className="min-w-0 space-y-1.5 md:col-span-2"><div className="flex items-center justify-between gap-2"><Label className="text-xs text-muted-foreground">Observação financeira</Label>{editingRecords[rowIndex]?.fechamento && getPaymentHistory(editingRecords[rowIndex].fechamento?.observacao).length > 0 && <span className="text-[11px] font-medium text-primary">{getPaymentHistory(editingRecords[rowIndex].fechamento?.observacao).length} pagamento(s) registrado(s)</span>}</div><Input className="h-9" value={saleItem.observacao} onChange={(event) => updateRow({ observacao: event.target.value })} placeholder="Ex.: entrada via PIX; boletos enviados por e-mail" /></div>
                    {saleItem.condicao_pagamento === "boleto" && saleItem.parcelas_datas.map((date, dateIndex) => <div key={dateIndex} className={fieldClass}><Label className="text-xs text-muted-foreground">Vencimento {dateIndex + 1}</Label><Input className="h-9" type="date" value={date} onChange={(event) => updateRow({ parcelas_datas: saleItem.parcelas_datas.map((item, itemIndex) => itemIndex === dateIndex ? event.target.value : item) })} /></div>)}
                  </div>
                </div>;
              })}
            </div>
          </div>
        )}
        <details className="hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">Detalhes financeiros avançados, parcelas, comissão e criativos</summary>
          <div className="space-y-3 border-t border-border/20 p-3 sm:p-4">
        {/* Valores & Pagamento */}
        <div className="rounded-xl border border-border/30 bg-secondary/10 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Valores & Pagamento</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor total (R$)</Label>
              <Input type="number" step="0.01" value={form.valor || ""} onChange={(e) => setForm((p) => ({ ...p, valor: Number(e.target.value) }))} placeholder="0,00" className="bg-secondary/30 border-border/30 focus:border-primary/50 font-semibold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{form.condicao_pagamento === "sinal" ? "Forma de pagamento do sinal" : "Pagamento"}</Label>
              <Select value={form.pagamento} onValueChange={(v) => setForm((p) => ({ ...p, pagamento: v, parcelas: !PAGAMENTOS_COM_PARCELA.includes(v) ? 1 : p.parcelas, condicao_pagamento: v === "Boleto" ? "boleto" : p.condicao_pagamento }))}>
                <SelectTrigger className="bg-secondary/30 border-border/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">💵 Dinheiro</SelectItem>
                  <SelectItem value="Débito">💳 Débito</SelectItem>
                  <SelectItem value="Conta de anúncio">📣 Conta de anúncio</SelectItem>
                  
                  <SelectItem value="Infinity (Visa/Master)">💳 Infinity (Visa/Master)</SelectItem>
                  <SelectItem value="Infinity Elo/Amex">💳 Infinity Elo/Amex</SelectItem>
                  <SelectItem value="Link Infinity">🔗 Link Infinity</SelectItem>
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

          <div className="mt-3 rounded-lg border border-border/30 bg-background/20 p-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Situação financeira</Label>
                <Select
                  value={form.condicao_pagamento}
                  onValueChange={(condicao_pagamento) => setForm((p) => ({
                    ...p,
                    condicao_pagamento,
                    valor_sinal: condicao_pagamento === "pago" ? p.valor : condicao_pagamento === "a_receber" ? 0 : p.valor_sinal,
                    parcelas_total: condicao_pagamento === "boleto" ? (p.parcelas_total || "1") : "",
                    valor_parcela: condicao_pagamento === "boleto" ? p.valor_parcela : 0,
                    parcelas_datas: condicao_pagamento === "boleto" ? p.parcelas_datas : [],
                  }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Pago integralmente</SelectItem>
                    <SelectItem value="sinal">Sinal pago + saldo a receber</SelectItem>
                    <SelectItem value="a_receber">Total a receber</SelectItem>
                    <SelectItem value="boleto">Boleto parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.condicao_pagamento !== "pago" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(form.condicao_pagamento === "sinal" || form.condicao_pagamento === "boleto") && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Valor do sinal pago (R$)</Label>
                      <Input type="number" min="0" max={form.valor} step="0.01" value={form.valor_sinal || ""} onChange={(e) => setForm((p) => ({ ...p, valor_sinal: Number(e.target.value) }))} placeholder="0,00" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Saldo restante</Label>
                    <div className="h-10 flex items-center px-3 rounded-md bg-secondary/30 border border-border/30 text-sm font-semibold text-amber-400">
                      {formatBRL(Math.max(0, Number(form.valor || 0) - Number(form.valor_sinal || 0)))}
                    </div>
                  </div>
                  {form.condicao_pagamento !== "boleto" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Forma de pagamento do saldo</Label>
                      <Select value={form.pagamento_saldo} onValueChange={(pagamento_saldo) => setForm((p) => ({ ...p, pagamento_saldo }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="Débito">Débito</SelectItem>
                          <SelectItem value="Conta de anúncio">Conta de anúncio</SelectItem>
                          <SelectItem value="Infinity (Visa/Master)">Infinity (Visa/Master)</SelectItem>
                          <SelectItem value="Infinity Elo/Amex">Infinity Elo/Amex</SelectItem>
                          <SelectItem value="Link Infinity">Link Infinity</SelectItem>
                          <SelectItem value="Boleto">Boleto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{form.condicao_pagamento === "boleto" ? "Primeiro vencimento" : "Mês previsto do saldo"}</Label>
                    {form.condicao_pagamento === "boleto" ? (
                      <Input type="date" value={form.previsao_entrada} onChange={(e) => setForm((p) => ({ ...p, previsao_entrada: e.target.value, parcelas_datas: buildParcelDates(p.parcelas_total, e.target.value, p.parcelas_datas) }))} />
                    ) : (
                      <MonthYearPicker value={form.previsao_entrada} onChange={(previsao_entrada) => setForm((p) => ({ ...p, previsao_entrada }))} />
                    )}
                  </div>
                  {form.condicao_pagamento === "boleto" && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Quantidade de parcelas</Label>
                        <Input type="number" min="1" max="48" value={form.parcelas_total} onChange={(e) => { const parcelas_total = e.target.value; setForm((p) => ({ ...p, parcelas_total, parcelas_datas: buildParcelDates(parcelas_total, p.previsao_entrada, p.parcelas_datas), valor_parcela: Number(parcelas_total) ? +(Math.max(0, p.valor - p.valor_sinal) / Number(parcelas_total)).toFixed(2) : 0 })); }} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Valor de cada parcela (R$)</Label>
                        <div className="h-10 flex items-center px-3 rounded-md bg-secondary/30 border border-border/30 text-sm font-semibold text-foreground">
                          {formatBRL(Number(form.parcelas_total) ? Math.max(0, Number(form.valor || 0) - Number(form.valor_sinal || 0)) / Number(form.parcelas_total) : 0)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {form.condicao_pagamento === "boleto" && form.parcelas_datas.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {form.parcelas_datas.map((date, index) => (
                    <div key={index} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Vencimento {index + 1}</Label>
                      <Input type="date" value={date} onChange={(e) => setForm((p) => ({ ...p, parcelas_datas: p.parcelas_datas.map((item, itemIndex) => itemIndex === index ? e.target.value : item) }))} />
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Observação financeira</Label>
                <Input value={form.observacao} onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))} placeholder="Ex.: entrada via PIX; boletos enviados por e-mail" />
              </div>
            </div>
        </div>

        {/* Comissão & Status */}
        <div className="rounded-xl border border-border/30 bg-secondary/10 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Comissão & Status</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Comissão sobre recebido ({getSalesCommissionPercent(form.origem)}%)</Label>
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

          <div className="rounded-xl border border-border/30 bg-secondary/10 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Itens extras</p>
                <p className="text-xs text-muted-foreground/70">Adicione outros produtos ou servicos para o mesmo cliente.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addVendaItem}>
                <Plus className="h-4 w-4" />
                Adicionar item
              </Button>
            </div>

            {additionalItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/40 px-4 py-3 text-sm text-muted-foreground">
                Nenhum item extra adicionado.
              </div>
            ) : (
              <div className="space-y-4">
                {additionalItems.map((item, index) => {
                  const itemTemParcela = PAGAMENTOS_COM_PARCELA.includes(item.pagamento);
                  const itemValores = getItemValores(item);

                  return (
                    <div key={index} className="rounded-lg border border-border/30 bg-background/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold">Item {index + 2}</p>
                        {(!editingVenda || index >= editingRecords.length - 1) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeVendaItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Produto</Label>
                          <Select value={item.produto || "__none__"} onValueChange={(produto) => updateVendaItem(index, { produto: produto === "__none__" ? "" : produto })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Nenhum produto</SelectItem>
                              {PRODUTOS.map((produto) => <SelectItem key={produto} value={produto}>{produto}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Servico</Label>
                          <Select value={item.servico || "__none__"} onValueChange={(servico) => updateVendaItem(index, { servico: servico === "__none__" ? "" : servico })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Nenhum serviço</SelectItem>
                              {SERVICOS.map((servico) => <SelectItem key={servico} value={servico}>{servico}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Origem</Label>
                          <Select value={item.origem} onValueChange={(origem) => updateVendaItem(index, { origem })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {ORIGENS.map((origem) => <SelectItem key={origem} value={origem}>{origem}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.valor || ""}
                            onChange={(e) => updateVendaItem(index, { valor: Number(e.target.value) })}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{item.condicao_pagamento === "sinal" ? "Pagamento do sinal" : "Pagamento"}</Label>
                          <Select
                            value={item.pagamento}
                            onValueChange={(pagamento) => updateVendaItem(index, {
                              pagamento,
                              parcelas: PAGAMENTOS_COM_PARCELA.includes(pagamento) ? item.parcelas : 1,
                              condicao_pagamento: pagamento === "Boleto" ? "boleto" : item.condicao_pagamento,
                            })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="PIX">PIX</SelectItem>
                              <SelectItem value="Débito">Debito</SelectItem>
                              <SelectItem value="Conta de anúncio">Conta de anúncio</SelectItem>
                              <SelectItem value="Infinity (Visa/Master)">Infinity (Visa/Master)</SelectItem>
                              <SelectItem value="Infinity Elo/Amex">Infinity Elo/Amex</SelectItem>
                              <SelectItem value="Link Infinity">Link Infinity</SelectItem>
                              <SelectItem value="Boleto">Boleto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Status</Label>
                          <Select value={item.status} onValueChange={(status) => updateVendaItem(index, { status })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="aprovada">Aprovada</SelectItem>
                              <SelectItem value="recusada">Recusada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {itemTemParcela && (
                          <>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Parcelas</Label>
                              <Select value={item.parcelas.toString()} onValueChange={(value) => updateVendaItem(index, { parcelas: Number(value) })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                                    <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Valor liquido</Label>
                              <div className="flex h-10 items-center rounded-md border border-border/30 bg-secondary/30 px-3 text-sm font-semibold text-emerald-400">
                                {formatBRL(itemValores.valorLiquido)}
                              </div>
                            </div>
                          </>
                        )}

                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Situação financeira</Label>
                          <Select value={item.condicao_pagamento} onValueChange={(condicao_pagamento) => updateVendaItem(index, {
                            condicao_pagamento,
                            valor_sinal: condicao_pagamento === "pago" ? item.valor : condicao_pagamento === "a_receber" ? 0 : item.valor_sinal,
                            parcelas_total: condicao_pagamento === "boleto" ? (item.parcelas_total || "1") : "",
                          })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pago">Pago integralmente</SelectItem>
                              <SelectItem value="sinal">Sinal pago + saldo a receber</SelectItem>
                              <SelectItem value="a_receber">Total a receber</SelectItem>
                              <SelectItem value="boleto">Boleto parcelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Criativo de origem</Label>
                          <Select value={metaAdsWithEmoji.some((ad) => ad.name === item.criativo) ? item.criativo : undefined} onValueChange={(criativo) => updateVendaItem(index, { criativo })}>
                            <SelectTrigger><SelectValue placeholder={isLoadingMetaAds ? "Carregando anúncios..." : "Selecionar anúncio da Meta"} /></SelectTrigger>
                            <SelectContent className="max-h-72">
                              {metaAdsWithEmoji.map((ad) => <SelectItem key={ad.id} value={ad.name}>{ad.name} · {ad.campaignName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input
                            list="meta-ad-names"
                            value={item.criativo}
                            onChange={(event) => updateVendaItem(index, { criativo: event.target.value })}
                            placeholder="Emoji ou nome do anúncio"
                          />
                        </div>

                        {item.condicao_pagamento !== "pago" && (
                          <>
                            {(item.condicao_pagamento === "sinal" || item.condicao_pagamento === "boleto") && (
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Sinal pago (R$)</Label>
                                <Input type="number" min="0" max={item.valor} step="0.01" value={item.valor_sinal || ""} onChange={(e) => updateVendaItem(index, { valor_sinal: Number(e.target.value) })} />
                              </div>
                            )}
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Saldo restante</Label>
                              <div className="flex h-10 items-center rounded-md border border-border/30 bg-secondary/30 px-3 text-sm font-semibold text-amber-400">
                                {formatBRL(Math.max(0, Number(item.valor || 0) - Number(item.valor_sinal || 0)))}
                              </div>
                            </div>
                            {item.condicao_pagamento !== "boleto" && (
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Pagamento do saldo</Label>
                                <Select value={item.pagamento_saldo} onValueChange={(pagamento_saldo) => updateVendaItem(index, { pagamento_saldo })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="Débito">Débito</SelectItem><SelectItem value="Conta de anúncio">Conta de anúncio</SelectItem>
                                    <SelectItem value="Infinity (Visa/Master)">Infinity (Visa/Master)</SelectItem><SelectItem value="Infinity Elo/Amex">Infinity Elo/Amex</SelectItem>
                                    <SelectItem value="Link Infinity">Link Infinity</SelectItem><SelectItem value="Boleto">Boleto</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">{item.condicao_pagamento === "boleto" ? "Primeiro vencimento" : "Data prevista"}</Label>
                              {item.condicao_pagamento === "boleto" ? (
                                <Input type="date" value={item.previsao_entrada} onChange={(e) => updateVendaItem(index, { previsao_entrada: e.target.value, parcelas_datas: buildParcelDates(item.parcelas_total, e.target.value, item.parcelas_datas) })} />
                              ) : (
                                <MonthYearPicker value={item.previsao_entrada} onChange={(previsao_entrada) => updateVendaItem(index, { previsao_entrada })} />
                              )}
                            </div>
                            {item.condicao_pagamento === "boleto" && (
                              <>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Quantidade de boletos</Label>
                                  <Input type="number" min="1" max="48" value={item.parcelas_total} onChange={(e) => { const parcelas_total = e.target.value; updateVendaItem(index, { parcelas_total, parcelas_datas: buildParcelDates(parcelas_total, item.previsao_entrada, item.parcelas_datas), valor_parcela: Number(parcelas_total) ? +(Math.max(0, item.valor - item.valor_sinal) / Number(parcelas_total)).toFixed(2) : 0 }); }} />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Valor por boleto (R$)</Label>
                                  <div className="flex h-10 items-center rounded-md border border-border/30 bg-secondary/30 px-3 text-sm font-semibold text-foreground">
                                    {formatBRL(Number(item.parcelas_total) ? Math.max(0, Number(item.valor || 0) - Number(item.valor_sinal || 0)) / Number(item.parcelas_total) : 0)}
                                  </div>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        </details>
        </div>
        <div className="shrink-0 border-t border-border/30 bg-card/95 p-3 backdrop-blur sm:px-5">
          <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isSaving}>
            {isSaving ? "Salvando..." : editingVenda ? "✓ Atualizar Venda" : "✓ Registrar Venda"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  return (
    <PageTransition>
      <DashboardLayout
        title="Vendas"
        subtitle="Registro e acompanhamento de vendas"
        contentClassName="!max-w-none"
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
                  <AlertDialogDescription>Todas as vendas e fechamentos serao removidos permanentemente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClear} disabled={isClearing}>
                    {isClearing ? "Limpando..." : "Limpar tudo"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button size="sm" className="gap-2" onClick={openNewDialog}>
              <Plus className="h-4 w-4" /> Nova Venda
            </Button>
          </div>
        }
      >
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingVenda(null); setEditingFechamento(null); setEditingCriativoVenda(null); setEditingRecords([]); } }}>
          {vendaFormDialog}
        </Dialog>

        <DateFilterBar mode={dateFilter.mode} onModeChange={dateFilter.setMode} label={dateFilter.label} onBack={dateFilter.goBack} onForward={dateFilter.goForward} />

        <div className="grid gap-4 mb-4 md:grid-cols-3">
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Wallet className="h-4 w-4 text-success" /> Coletado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <div className="font-display text-2xl font-bold">{formatBRL(salesTotalsBreakdown.total.coletado)}</div>
                <span className="text-xs text-muted-foreground">Total já coletado: {formatBRL(accumulatedTotalsBreakdown.total.coletado)}</span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{dateFilter.mode === "mes" ? "No mês selecionado" : "No período selecionado"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Cursos: {formatBRL(salesTotalsBreakdown.cursos.coletado)} · Serviços: {formatBRL(salesTotalsBreakdown.servicos.coletado)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Clock3 className="h-4 w-4 text-amber-500" /> A receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <div className="font-display text-2xl font-bold">{formatBRL(salesTotalsBreakdown.total.aReceber)}</div>
                <span className="text-xs text-muted-foreground">Total ainda pendente: {formatBRL(accumulatedTotalsBreakdown.total.aReceber)}</span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{dateFilter.mode === "mes" ? "No mês selecionado" : "No período selecionado"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Cursos: {formatBRL(salesTotalsBreakdown.cursos.aReceber)} · Serviços: {formatBRL(salesTotalsBreakdown.servicos.aReceber)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Layers3 className="h-4 w-4 text-accent" /> Recorrente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold">{formatBRL(recurringContractsTotal)}</div>
              <p className="mt-1 text-xs text-muted-foreground">Contratos dos clientes ativos</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4 border-border/50 bg-card/70">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Metas principais do mês, semana e dia</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acompanhe a meta mensal e o ritmo necessário por semana e por dia útil.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Baseado nas metas da planilha de métricas
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {metasPrincipais.map((item) => {
                const falta = item.meta > 0 ? Math.max(item.meta - item.atualMes, 0) : 0;
                return (
                  <div key={item.label} className="rounded-xl border border-border/30 bg-secondary/20 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                      <Badge variant="outline" className="text-[10px]">Meta mês {item.meta || "—"}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-border/20 bg-background/20 p-2 text-center">
                      <div>
                        <span className="block text-[9px] uppercase text-muted-foreground">Meta dia</span>
                        <strong className="mt-1 block text-xs text-foreground">{item.metaDia || "—"}</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase text-muted-foreground">Meta semana</span>
                        <strong className="mt-1 block text-xs text-foreground">{item.metaSemana || "—"}</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase text-muted-foreground">Meta mês</span>
                        <strong className="mt-1 block text-xs text-foreground">{item.meta || "—"}</strong>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="block text-[10px] uppercase text-muted-foreground">Realizado no período</span>
                        <strong className="mt-1 block text-foreground">{item.atualPeriodo}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-muted-foreground">Falta no mês</span>
                        <strong className="mt-1 block text-amber-400">{item.meta > 0 ? falta : "—"}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 border-border/50 bg-card/70">
          <CardHeader>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Central de vendas e fechamentos</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Conferencia por categoria: valores coletados, a receber e recorrentes.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                <div className="rounded-lg border border-success/20 bg-success/10 px-3 py-2">
                  <span className="text-muted-foreground">Coletado</span>
                  <strong className="block text-success">{formatBRL(salesTotalsBreakdown.total.coletado)}</strong>
                  <small className="mt-1 block text-[10px] text-muted-foreground">Cursos {formatBRL(salesTotalsBreakdown.cursos.coletado)} · Serviços {formatBRL(salesTotalsBreakdown.servicos.coletado)}</small>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                  <span className="text-muted-foreground">A receber</span>
                  <strong className="block text-amber-500">{formatBRL(salesTotalsBreakdown.total.aReceber)}</strong>
                  <small className="mt-1 block text-[10px] text-muted-foreground">Cursos {formatBRL(salesTotalsBreakdown.cursos.aReceber)} · Serviços {formatBRL(salesTotalsBreakdown.servicos.aReceber)}</small>
                </div>
                <div className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-2">
                  <span className="text-muted-foreground">Vendas</span>
                  <strong className="block text-accent">{salesTotalsBreakdown.total.vendas}</strong>
                  <small className="mt-1 block text-[10px] text-muted-foreground">Cursos {salesTotalsBreakdown.cursos.vendas} · Serviços {salesTotalsBreakdown.servicos.vendas}</small>
                </div>
                <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Comissão paga</span>
                  <strong className="block text-sky-400">{formatBRL(integratedCategoryRows.reduce((total, row) => total + row.comissaoPaga, 0))}</strong>
                </div>
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2">
                  <span className="text-muted-foreground">Taxas descontadas</span>
                  <strong className="block text-rose-400">{formatBRL(integratedCategoryRows.reduce((total, row) => total + row.taxasMaquininha, 0))}</strong>
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
                      <TableHead className="text-right">Taxas descontadas</TableHead>
                      <TableHead className="text-right">Comissão paga</TableHead>
                      <TableHead className="text-center">Vendas feitas</TableHead>
                      <TableHead className="w-20 text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integratedCategoryRows.map((row) => (
                      <TableRow key={row.categoria}>
                        <TableCell className="font-semibold">{row.categoria}</TableCell>
                        <TableCell className="text-right font-semibold text-success">{formatBRL(row.coletado)}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-500">{formatBRL(row.aReceber)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatBRL(row.recorrente)}</TableCell>
                        <TableCell className="text-right font-semibold text-rose-400">{formatBRL(row.taxasMaquininha)}</TableCell>
                        <TableCell className="text-right font-semibold text-sky-400">{formatBRL(row.comissaoPaga)}</TableCell>
                        <TableCell className="text-center">{row.vendas}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              title="Editar categoria dos fechamentos"
                              onClick={() => renameCategoryFechamentos(row.categoria, row.fechamentos)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Remover fechamentos desta categoria"
                              onClick={() => deleteCategoryFechamentos(row.categoria, row.fechamentos)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
              20/40
            </Button>
            <Button
              type="button"
              size="sm"
              variant={taxProfile === "opcao2" ? "default" : "outline"}
              onClick={() => setTaxProfile("opcao2")}
            >
              40/80
            </Button>
          </div>
        </div>

        <div id="a-receber" className="mb-4 scroll-mt-24 rounded-xl border border-border/40 bg-card/60 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Planilhas de vendas</p>
              <p className="text-xs text-muted-foreground">Cursos e serviços ficam separados somente na visualização, sem alterar os registros salvos.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button type="button" size="sm" variant={salesTableSection === "todos" ? "default" : "outline"} onClick={() => setSalesTableSection("todos")}>
                Todos ({filtered.length})
              </Button>
              <Button type="button" size="sm" variant={salesTableSection === "cursos" ? "default" : "outline"} onClick={() => setSalesTableSection("cursos")}>
                Cursos ({filtered.filter(isCourseSale).length})
              </Button>
              <Button type="button" size="sm" variant={salesTableSection === "servicos" ? "default" : "outline"} onClick={() => setSalesTableSection("servicos")}>
                Serviços ({filtered.filter((venda) => !isCourseSale(venda)).length})
              </Button>
            </div>
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
              <SelectItem value="paga">Pagas</SelectItem>
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
              <SelectItem value="Conta de anúncio">Conta de anúncio</SelectItem>
              <SelectItem value="Cartão">Cartão</SelectItem>
              <SelectItem value="PIX">PIX</SelectItem>
              <SelectItem value="Boleto">Boleto</SelectItem>
            </SelectContent>
          </Select>
          <Select value={origemFilter} onValueChange={setOrigemFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm bg-secondary/30 border-border/30">
              <SelectValue placeholder="Todas origens" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas origens</SelectItem>
              {ORIGENS.map((origem) => (
                <SelectItem key={origem} value={origem}>{origem}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Compact cards keep every action visible without horizontal scrolling. */}
        <div className="hidden">
          {isLoading ? (
            <div className="rounded-lg border border-border/30 p-8 text-center text-muted-foreground">Carregando...</div>
          ) : vendasAgrupadas.length === 0 ? (
            <div className="rounded-lg border border-border/30 p-8 text-center text-muted-foreground">Nenhuma venda encontrada</div>
          ) : vendasAgrupadas.map((grupo) => {
            const v = grupo.principal;
            const nomes = getUniqueSaleNames(grupo.produtos, grupo.servicos);
            return (
              <div key={grupo.chave} className="rounded-xl border border-border/30 bg-[hsl(260,22%,7%)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{v.cliente}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(v.data)} · {v.origem || "Sem origem"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(grupo.itens)} title="Editar venda">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => Promise.all(grupo.itens.map((item) => deleteVenda.mutateAsync(item.id))).then(() => toast({ title: "Venda removida" })).catch((err) => toast({ title: "Erro", description: err.message, variant: "destructive" }))} title="Remover venda">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {nomes.length > 0 ? nomes.map((nome) => <Badge key={nome} variant="secondary" className="font-normal">{nome}</Badge>) : <span className="text-xs text-muted-foreground">Sem produto ou serviço</span>}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border/20 bg-background/25 p-3 text-center">
                  <div><span className="block text-[10px] uppercase text-muted-foreground">Total</span><strong className="mt-1 block text-sm text-foreground">{formatBRL(grupo.valorTotal)}</strong></div>
                  <div><span className="block text-[10px] uppercase text-muted-foreground">Coletado</span><strong className="mt-1 block text-sm text-success">{formatBRL(grupo.sinal)}</strong></div>
                  <div><span className="block text-[10px] uppercase text-muted-foreground">Saldo</span><strong className="mt-1 block text-sm text-amber-500">{formatBRL(grupo.saldo)}</strong></div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Pagamento</span><p className="mt-1 font-medium">{v.pagamento}{v.pagamento_saldo ? ` / saldo: ${v.pagamento_saldo}` : ""}</p></div>
                  <div><span className="text-muted-foreground">Comissão ({getSalesCommissionPercent(v.origem)}%)</span><p className="mt-1 font-medium">{formatBRL(grupo.comissao)}</p></div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Select value={grupo.itens.every((item) => item.status_comissao === "paga") ? "paga" : "pendente"} onValueChange={(value) => updateCommissionStatus(grupo.itens, value)}>
                    <SelectTrigger className="h-9 border-border/30 bg-secondary/30 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pendente">Comissão pendente</SelectItem><SelectItem value="paga">Comissão paga</SelectItem></SelectContent>
                  </Select>
                  <div className="flex h-9 items-center justify-center rounded-md border border-border/30 bg-secondary/20 text-xs capitalize">{v.status}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Flat spreadsheet-style sales table: one piece of information per column. */}
        <div className="overflow-hidden rounded-lg border border-border/30">
          <Table className="table-fixed text-sm">
            <TableHeader>
              <TableRow className="border-border/30 bg-secondary/30">
                <TableHead className="w-[10%] px-2 text-xs">Cliente</TableHead>
                <TableHead className="w-[12%] px-2 text-xs">{salesTableSection === "todos" ? "Produto / serviço" : salesTableSection === "cursos" ? "Curso" : "Serviço"}</TableHead>
                <TableHead className="w-[6%] px-2 text-right text-xs">Total</TableHead>
                <TableHead className="w-[11%] px-2 text-right text-xs">Coletado / comissão paga</TableHead>
                <TableHead className="w-[9%] px-2 text-right">A receber / comissão</TableHead>
                <TableHead className="w-[5%] px-2">Pagamento</TableHead>
                <TableHead className="w-[8%] px-2">Valor recebido</TableHead>
                <TableHead className="w-[8%] px-2">Data</TableHead>
                <TableHead className="w-[11%] px-2">Forma / parcelas</TableHead>
                <TableHead className="w-[7%] px-2"></TableHead>
                <TableHead className="w-[5%] px-2">Venda</TableHead>
                <TableHead className="w-[4%] px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={12} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : vendasAgrupadas.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="py-8 text-center text-muted-foreground">Nenhuma venda encontrada</TableCell></TableRow>
              ) : vendasAgrupadas.map((grupo, index) => {
                const v = grupo.principal;
                const nomes = getUniqueSaleNames(grupo.produtos, grupo.servicos);
                const nomesTexto = nomes.join(" · ") || "Sem produto ou serviço";
                const statusVenda = grupo.saldo <= 0 ? "paga" : v.status;
                return (
                  <TableRow
                    key={grupo.chave}
                    className="cursor-pointer border-border/20 hover:bg-secondary/20"
                    style={{ background: index % 2 === 0 ? "hsl(260, 22%, 6.2%)" : "hsl(260, 22%, 10%)" }}
                    title="Clique duas vezes para editar esta venda"
                    onMouseDown={(event) => {
                      if (event.detail !== 2) return;
                      const target = event.target as HTMLElement;
                      if (target.closest("button, input, select, [role='combobox'], [role='button']")) return;
                      event.preventDefault();
                      openEditDialog(grupo.itens);
                    }}
                  >
                    <TableCell className="px-2 py-4" title={`${v.cliente} · ${formatDate(v.data)} · ${v.origem || "Sem origem"}`}>
                      <p className="truncate font-semibold">{v.cliente}</p><p className="truncate text-[11px] text-muted-foreground">{formatDate(v.data)} · {v.origem || "Sem origem"}</p>
                    </TableCell>
                    <TableCell className="px-2 py-3" title={nomesTexto}>
                      <p className="truncate font-semibold">{nomesTexto}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {grupo.quantidade} {grupo.quantidade === 1 ? "item" : "itens"}
                        {grupo.datasPrevistasCurso.length > 0 ? ` · Curso: ${grupo.datasPrevistasCurso.map(formatDate).join(", ")}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-right text-[15px] font-semibold">{formatBRL(grupo.valorTotal)}</TableCell>
                    <TableCell className="px-2 py-3 text-right" title={grupo.paymentHistory.length ? `${grupo.paymentHistory.length} pagamento(s) registrado(s)` : ""}>
                      <span className="block text-[15px] font-semibold text-success">{formatBRL(grupo.sinal)}</span>
                      <div className="mt-1 space-y-0.5 text-right text-[9px]">
                        <p className="whitespace-nowrap text-sky-400">Comissão paga {formatBRL(grupo.comissaoPaga)}</p>
                        <div className="flex items-center justify-end gap-1">
                          <span className="whitespace-nowrap text-amber-400">Pendente {formatBRL(grupo.comissaoPendente)}</span>
                          {grupo.comissao > 0 && <Select value={grupo.comissaoPendente <= 0.009 ? "paga" : "pendente"} onValueChange={(value) => updateCommissionStatus(grupo.itens, value)}><SelectTrigger className="h-6 w-[76px] px-1.5 text-[9px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="paga">Pagar agora</SelectItem></SelectContent></Select>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-right font-semibold text-amber-500">
                      <span className="block text-[15px]">{formatBRL(grupo.saldo)}</span>
                      <span className="mt-1 block whitespace-nowrap text-[9px] font-normal text-muted-foreground">Comissão futura {formatBRL(grupo.saldo * getSalesCommissionRate(v.origem))}</span>
                      {grupo.pendenciaMesAnterior && grupo.saldo > 0 && (
                        <span className="mt-1 block whitespace-nowrap text-[9px] font-semibold text-amber-400">Pendente do mês passado</span>
                      )}
                      {grupo.saldo > 0 && (
                        <span className="block truncate text-[9px] font-normal text-muted-foreground">
                          {grupo.previsoesRecebimento.length > 0
                            ? `Prev. ${grupo.previsoesRecebimento.map(formatMonthYear).join(", ")}`
                            : "Sem previsão"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-3"><Badge variant="outline" className="max-w-full truncate px-1.5 text-[9px]">{getSalePaymentLabel(v)}</Badge></TableCell>
                    <TableCell className="px-2 py-4">{grupo.saldo > 0 ? <Input type="number" min="0.01" max={grupo.saldo} step="0.01" value={quickPaymentAmounts[grupo.chave] || ""} onChange={(event) => setQuickPaymentAmounts((current) => ({ ...current, [grupo.chave]: event.target.value }))} placeholder={`Até ${formatBRL(grupo.saldo)}`} className="h-8 px-2 text-xs" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="px-2 py-4">{grupo.saldo > 0 ? <Input type="date" value={quickPaymentDates[grupo.chave] || new Date().toISOString().split("T")[0]} onChange={(event) => setQuickPaymentDates((current) => ({ ...current, [grupo.chave]: event.target.value }))} className="h-8 px-1.5 text-[11px]" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="px-2 py-4">
                      {grupo.saldo > 0 ? (
                        <div className="flex items-center gap-1">
                          <Select value={quickPayments[grupo.chave] || "PIX"} onValueChange={(value) => setQuickPayments((current) => ({ ...current, [grupo.chave]: value }))}>
                            <SelectTrigger className="h-8 min-w-0 flex-1 px-2 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="PIX">PIX</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Débito">Débito</SelectItem><SelectItem value="Conta de anúncio">Conta de anúncio</SelectItem><SelectItem value="Infinity (Visa/Master)">Infinity (Visa/Master)</SelectItem><SelectItem value="Infinity Elo/Amex">Infinity Elo/Amex</SelectItem><SelectItem value="Link Infinity">Link Infinity</SelectItem></SelectContent>
                          </Select>
                          {PAGAMENTOS_COM_PARCELA.includes(quickPayments[grupo.chave] || "PIX") && (
                            <Select value={quickCardInstallments[grupo.chave] || "1"} onValueChange={(value) => setQuickCardInstallments((current) => ({ ...current, [grupo.chave]: value }))}>
                              <SelectTrigger className="h-8 w-[58px] shrink-0 px-2 text-xs" title="Quantidade de parcelas"><SelectValue /></SelectTrigger>
                              <SelectContent>{Array.from({ length: 12 }, (_, installment) => <SelectItem key={installment + 1} value={String(installment + 1)}>{installment + 1}x</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="px-2 py-4">{grupo.saldo > 0 ? <Button type="button" size="sm" className="h-8 w-full px-2 text-xs" disabled={settlingSaleKey === grupo.chave} onClick={() => settleRemainingBalance(grupo.chave, grupo.itens)}>{settlingSaleKey === grupo.chave ? "..." : "Registrar"}</Button> : <Badge variant="secondary" className="px-2 text-[10px]">Quitado</Badge>}</TableCell>
                    <TableCell className="px-2 py-3"><Badge className="max-w-full truncate px-1.5 text-[9px]" variant={statusVenda === "paga" || statusVenda === "aprovada" ? "default" : statusVenda === "cancelada" ? "destructive" : "outline"}>{statusVenda === "paga" ? "pago" : statusVenda}</Badge></TableCell>
                    <TableCell className="px-1 py-3"><div className="flex items-center justify-end gap-0.5"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(grupo.itens)} title="Editar venda"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => Promise.all(grupo.itens.map((item) => deleteVenda.mutateAsync(item.id))).then(() => toast({ title: "Venda removida" })).catch((err) => toast({ title: "Erro", description: err.message, variant: "destructive" }))} title="Remover venda"><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {vendasAgrupadas.length > 0 && (() => {
            const totalVendido = vendasAgrupadas.reduce((total, grupo) => total + grupo.valorTotal, 0);
            const totalItens = vendasAgrupadas.reduce((total, grupo) => total + grupo.quantidade, 0);
            const totalComissaoPendente = vendasAgrupadas.reduce((total, grupo) => total + grupo.comissaoPendente, 0);
            return (
              <div className="grid grid-cols-5 gap-6 border-t-2 border-accent/40 bg-secondary/50 px-5 py-4 text-xs">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Registros</p>
                  <p className="mt-1 whitespace-nowrap font-bold text-accent">{vendasAgrupadas.length} clientes · {totalItens} {salesTableSection === "todos" ? "itens" : salesTableSection === "cursos" ? "cursos" : "serviços"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total vendido</p>
                  <p className="mt-1 whitespace-nowrap font-bold">{formatBRL(totalVendido)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Coletado</p>
                  <p className="mt-1 whitespace-nowrap font-bold text-success">{formatBRL(visiblePeriodTotals.coletado)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">A receber</p>
                  <p className="mt-1 whitespace-nowrap font-bold text-amber-500">{formatBRL(visiblePeriodTotals.aReceber)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Comissão pendente</p>
                  <p className="mt-1 whitespace-nowrap font-bold">{formatBRL(totalComissaoPendente)}</p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Previous detailed table kept out of view while the flat layout is in use. */}
        <div className="hidden rounded-lg overflow-hidden border border-border/30">
          <div>
            <Table>
              <TableHeader>
                <TableRow className="border-border/30" style={{ background: "hsl(260, 22%, 9%)" }}>
                  <TableHead className="w-[12%] px-3 text-xs font-semibold text-muted-foreground">Cliente / venda</TableHead>
                  <TableHead className="w-[14%] px-3 text-xs font-semibold text-muted-foreground">Produtos / serviços</TableHead>
                  <TableHead className="w-[12%] px-3 text-xs font-semibold text-muted-foreground">Valores</TableHead>
                  <TableHead className="w-[41%] px-3 text-xs font-semibold text-muted-foreground">Pagamento / comissão</TableHead>
                  <TableHead className="w-[16%] px-3 text-xs font-semibold text-muted-foreground">Status / comissão</TableHead>
                  <TableHead className="w-[5%] px-2 text-xs font-semibold text-muted-foreground"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell>
                  </TableRow>
                ) : vendasAgrupadas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</TableCell>
                  </TableRow>
                ) : (
                  vendasAgrupadas.map((grupo, index) => {
                    const v = grupo.principal;
                    const nomes = getUniqueSaleNames(grupo.produtos, grupo.servicos);
                    const statusVenda = grupo.saldo <= 0 ? "paga" : v.status;
                    return (
                    <TableRow
                      key={grupo.chave}
                      className="border-border/20 hover:bg-secondary/20"
                      style={{
                        background: index % 2 === 0 ? "hsl(260, 22%, 6.2%)" : "hsl(260, 22%, 10%)",
                        boxShadow: `inset 4px 0 0 ${index % 2 === 0 ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.35)"}`,
                      }}
                    >
                      <TableCell className="px-3 py-3 align-top">
                        <p className="text-sm font-semibold leading-tight">{v.cliente}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(v.data)} · {v.origem || "Sem origem"}</p>
                      </TableCell>
                      <TableCell className="px-3 py-3 align-top">
                        <div className="overflow-hidden rounded-md border border-border/25">
                          {grupo.itens.map((saleItem, itemIndex) => {
                            const itemName = saleItem.servico || saleItem.produto || "Sem produto ou serviço";
                            return (
                              <div key={saleItem.id} className={`flex items-center justify-between gap-3 px-2.5 py-2 text-xs ${itemIndex > 0 ? "border-t border-border/25" : ""}`}>
                                <span className="font-medium text-foreground">{itemName}</span>
                                <span className="shrink-0 font-semibold text-muted-foreground">{formatBRL(Number(saleItem.valor || 0))}</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">{grupo.quantidade} {grupo.quantidade === 1 ? "item" : "itens"}</p>
                      </TableCell>
                      <TableCell className="px-3 py-3 align-top text-xs">
                        <p><span className="text-muted-foreground">Total: </span><strong>{formatBRL(grupo.valorTotal)}</strong></p>
                        <p className="mt-1"><span className="text-muted-foreground">Coletado: </span><strong className="text-success">{formatBRL(grupo.sinal)}</strong></p>
                        <p className="mt-1"><span className="text-muted-foreground">Saldo: </span><strong className="text-amber-500">{formatBRL(grupo.saldo)}</strong></p>
                        {grupo.paymentHistory.length > 0 && (
                          <div className="mt-2 space-y-1 border-t border-border/20 pt-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pagamentos ({grupo.paymentHistory.length})</p>
                            {grupo.paymentHistory.map((payment) => (
                              <div key={payment.id} className="flex items-start justify-between gap-2 rounded bg-secondary/25 px-2 py-1.5">
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground">{formatDate(payment.date)}</p>
                                  <p className="truncate text-[10px] text-muted-foreground">{payment.method}</p>
                                </div>
                                <strong className="shrink-0 text-success">{formatBRL(payment.amount)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-3 align-top">
                        {grupo.saldo > 0 ? (
                          <div>
                            <div className="grid grid-cols-[70px_82px_76px_minmax(90px,1fr)_108px_76px_90px] items-end gap-1.5">
                              <div className="min-w-0 space-y-1">
                                <Label className="text-[9px] text-muted-foreground">Pagamento</Label>
                                <Badge variant={v.pagamento === "Cartão" ? "secondary" : "outline"} className="block max-w-full truncate text-[10px]">{getSalePaymentLabel(v)}</Badge>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] text-muted-foreground">Comissão</Label>
                                <p className="h-7 truncate pt-1.5 text-[10px] font-semibold">{formatBRL(grupo.comissao)}</p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] text-muted-foreground">A quitar</Label>
                                <p className="h-7 truncate pt-1.5 text-[10px] font-semibold text-amber-500">{formatBRL(grupo.saldo)}</p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] font-medium text-muted-foreground">Valor recebido</Label>
                                <Input
                                  type="number"
                                  min="0.01"
                                  max={grupo.saldo}
                                  step="0.01"
                                  value={quickPaymentAmounts[grupo.chave] || ""}
                                  onChange={(event) => setQuickPaymentAmounts((current) => ({ ...current, [grupo.chave]: event.target.value }))}
                                  placeholder={`Até ${formatBRL(grupo.saldo)}`}
                                  className="h-7 border-border/30 bg-secondary/30 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                              <Label className="text-[9px] font-medium text-muted-foreground">Data</Label>
                              <Input
                                type="date"
                                value={quickPaymentDates[grupo.chave] || new Date().toISOString().split("T")[0]}
                                onChange={(event) => setQuickPaymentDates((current) => ({ ...current, [grupo.chave]: event.target.value }))}
                                className="h-7 border-border/30 bg-secondary/30 text-xs"
                              />
                            </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] font-medium text-muted-foreground">Forma</Label>
                                <Select
                                  value={quickPayments[grupo.chave] || "PIX"}
                                  onValueChange={(value) => setQuickPayments((current) => ({ ...current, [grupo.chave]: value }))}
                                >
                                  <SelectTrigger className="h-7 w-full border-border/30 bg-secondary/30 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PIX">PIX</SelectItem>
                                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                    <SelectItem value="Débito">Débito</SelectItem>
                                    <SelectItem value="Conta de anúncio">Conta de anúncio</SelectItem>
                                    <SelectItem value="Infinity (Visa/Master)">Infinity (Visa/Master)</SelectItem>
                                    <SelectItem value="Infinity Elo/Amex">Infinity Elo/Amex</SelectItem>
                                    <SelectItem value="Link Infinity">Link Infinity</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 w-full px-2 text-xs"
                                disabled={settlingSaleKey === grupo.chave}
                                onClick={() => settleRemainingBalance(grupo.chave, grupo.itens)}
                              >
                                {settlingSaleKey === grupo.chave ? "Salvando..." : "Registrar"}
                              </Button>
                            </div>
                            {PAGAMENTOS_COM_PARCELA.includes(quickPayments[grupo.chave] || "PIX") && (
                              <Select
                                value={quickCardInstallments[grupo.chave] || "1"}
                                onValueChange={(value) => setQuickCardInstallments((current) => ({ ...current, [grupo.chave]: value }))}
                              >
                                <SelectTrigger className="mt-1.5 h-7 w-[130px] border-border/30 bg-secondary/30 text-xs"><SelectValue placeholder="Parcelas" /></SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((installment) => (
                                    <SelectItem key={installment} value={installment}>{installment}x</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Badge variant={v.pagamento === "Cartão" ? "secondary" : "outline"} className="text-xs">{getSalePaymentLabel(v)}</Badge>
                            <p className="text-xs"><span className="text-muted-foreground">Comissão: </span><strong>{formatBRL(grupo.comissao)}</strong></p>
                            <Badge className="text-xs" variant="secondary">Saldo quitado</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-3 align-top">
                        <div className="grid min-w-0 grid-cols-2 items-end gap-2">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-[8px] font-medium uppercase tracking-wide text-muted-foreground">Comissão</p>
                            <Select value={grupo.itens.every((item) => item.status_comissao === "paga") ? "paga" : "pendente"} onValueChange={(value) => updateCommissionStatus(grupo.itens, value)}>
                              <SelectTrigger className="h-7 min-w-0 w-full border-border/30 bg-secondary/30 px-1.5 text-[9px]"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="paga">Paga</SelectItem></SelectContent>
                            </Select>
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-[8px] font-medium uppercase tracking-wide text-muted-foreground">Venda</p>
                            <div className="flex h-7 min-w-0 items-center"><Badge className="max-w-full truncate px-1.5 text-[9px]" variant={statusVenda === "paga" || statusVenda === "aprovada" ? "default" : statusVenda === "cancelada" ? "destructive" : "outline"}>{statusVenda === "paga" ? "pago" : statusVenda}</Badge></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3 align-top">
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => openEditDialog(grupo.itens)}
                            title={grupo.itens.length > 1 ? "Editar todos os cursos desta venda" : "Editar venda"}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => Promise.all(grupo.itens.map((item) => deleteVenda.mutateAsync(item.id)))
                              .then(() => toast({ title: grupo.itens.length > 1 ? "Venda e seus itens removidos" : "Venda removida" }))
                              .catch((err) => toast({ title: "Erro", description: err.message, variant: "destructive" }))}
                            title={grupo.itens.length > 1 ? "Remover toda a venda agrupada" : "Remover venda"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
                {vendasAgrupadas.length > 0 && (() => {
                  const totalValor = vendasAgrupadas.reduce((s, grupo) => s + grupo.valorTotal, 0);
                  const totalSinal = vendasAgrupadas.reduce((s, grupo) => s + grupo.sinal, 0);
                  const totalSaldo = vendasAgrupadas.reduce((s, grupo) => s + grupo.saldo, 0);
                  const totalComissao = vendasAgrupadas.reduce((total, grupo) => total + grupo.comissaoPendente, 0);
                  const totalServicos = vendasAgrupadas.reduce((s, grupo) => s + grupo.quantidade, 0);
                  return (
                    <TableRow className="border-t-2 border-accent/30" style={{ background: "hsl(260, 22%, 11%)" }}>
                      <TableCell className="px-3 py-3 text-sm font-bold text-accent">TOTAL</TableCell>
                      <TableCell className="px-3 py-3 text-sm font-bold">{vendasAgrupadas.length} clientes · {totalServicos} serviços</TableCell>
                      <TableCell className="px-3 py-3 text-xs font-bold">
                        <p>Total: {formatBRL(totalValor)}</p>
                        <p className="mt-1 text-success">Coletado: {formatBRL(totalSinal)}</p>
                        <p className="mt-1 text-amber-500">Saldo: {formatBRL(totalSaldo)}</p>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-xs font-bold">Comissão pendente: {formatBRL(totalComissao)}</TableCell>
                      <TableCell className="px-3 py-3"></TableCell>
                      <TableCell className="px-2 py-3"></TableCell>
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


