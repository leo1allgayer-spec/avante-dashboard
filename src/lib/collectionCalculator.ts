import type { Venda } from "@/hooks/useVendas";
import type { FechamentoDiario } from "@/hooks/useFechamentosDiarios";
import { canonicalizeSaleCategory } from "@/constants/serviceCategories";
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

const PAGAMENTOS_COM_PARCELA = ["Cartão de crédito", "Infinity (Visa/Master)", "Infinity Elo/Amex", "Elo/Amex", "Link Infinity", "Link Gateway"];

const getTaxas = (pagamento: string, profile: TaxProfile): Record<number, number> => {
  if (profile === "opcao2" && (pagamento === "Link Infinity" || pagamento === "Link Gateway")) return TAXAS_LINK_NOVAS;
  if (profile === "opcao2" && pagamento === "Infinity (Visa/Master)") return TAXAS_MAQUININHA_VISA_NOVAS;
  if (pagamento === "Infinity (Visa/Master)") return TAXAS_INFINITY_VISA_MASTER;
  if (pagamento === "Infinity Elo/Amex" || pagamento === "Elo/Amex") return TAXAS_ELO_AMEX;
  return TAXAS_CARTAO_GATEWAY; // Link Infinity e registros antigos como Link Gateway usam estas taxas
};

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

const getInitialSignalFromObservation = (observation?: string | null) => {
  const match = String(observation || "").match(/sinal\s+de\s+R\$\s*([\d.]+(?:,\d{1,2})?)/i);
  if (!match) return 0;
  return Number(match[1].replace(/\./g, "").replace(",", ".")) || 0;
};


export function collectionCalculator(allVendas: Venda[], start: string, end: string, taxProfile: TaxProfile = "opcao1", recalculateFees = false) {
  const dateInRange = (date: string) => date >= start && date <= end;
  const findSaleForClosing = (fechamento: FechamentoDiario) => {
    const categoryKey = normalizeText(getFechamentoCategoria(fechamento));
    return allVendas.find((item) => item.id === fechamento.venda_id) || allVendas.find((item) =>
      normalizeText(item.cliente) === normalizeText(fechamento.cliente) &&
      normalizeText(item.vendedor) === normalizeText(fechamento.vendedor) &&
      normalizeText(getVendaCategoria(item)) === categoryKey
    );
  };
  const getFechamentoCollectedNet = (fechamento: FechamentoDiario, linkedSale?: Venda) => {
    const gross = Math.max(0, Number(fechamento.valor_sinal || 0));
    const storedNet = Math.max(0, Number(fechamento.valor_sinal_liquido ?? gross));
    if (gross <= 0 || (!recalculateFees && Math.abs(storedNet - gross) >= 0.01)) return Math.min(gross, storedNet);

    const sale = linkedSale || findSaleForClosing(fechamento);
    const saleInstallments = Math.max(1, Number.parseInt(String(sale?.parcelas || ""), 10) || 1);
    const history = getUniquePaymentHistory(fechamento.observacao);
    if (history.length > 0) {
      const historyGross = Math.min(gross, history.reduce((sum, entry) => sum + entry.amount, 0));
      const historyNet = history.reduce((sum, entry) => {
        const installments = getPaymentInstallments(entry.method, saleInstallments);
        return sum + Number((recalculateFees ? undefined : entry.netAmount) ?? getNetPaymentValue(entry.amount, entry.method, installments, taxProfile));
      }, 0);
      const legacyGross = Math.max(0, gross - historyGross);
      const legacyMethod = fechamento.pagamento_sinal || sale?.pagamento || "A definir";
      const legacyInstallments = getPaymentInstallments(legacyMethod, saleInstallments);
      return +Math.min(gross, historyNet + getNetPaymentValue(legacyGross, legacyMethod, legacyInstallments, taxProfile)).toFixed(2);
    }

    const initialSignal = getInitialSignalFromObservation(fechamento.observacao);
    if (initialSignal > 0 && initialSignal < gross && (fechamento.pagamento_saldo || sale?.pagamento_saldo)) {
      const signalMethod = fechamento.pagamento_sinal || sale?.pagamento || "A definir";
      const balanceMethod = fechamento.pagamento_saldo || sale?.pagamento_saldo || "A definir";
      const signalInstallments = getPaymentInstallments(signalMethod, saleInstallments);
      const balanceInstallments = getPaymentInstallments(balanceMethod, getPaymentInstallments(sale?.pagamento_saldo || "", 1));
      return +(
        getNetPaymentValue(initialSignal, signalMethod, signalInstallments, taxProfile) +
        getNetPaymentValue(gross - initialSignal, balanceMethod, balanceInstallments, taxProfile)
      ).toFixed(2);
    }

    const method = fechamento.pagamento_sinal || sale?.pagamento || "A definir";
    const installments = getPaymentInstallments(method, saleInstallments);
    return getNetPaymentValue(gross, method, installments, taxProfile);
  };

  const getCollectedGrossInPeriod = (item: FechamentoDiario) => {
    const history = getUniquePaymentHistory(item.observacao);
    if (history.length > 0) {
      const historyTotal = history.reduce((sum, entry) => sum + entry.amount, 0);
      const legacyAmount = Math.max(0, Number(item.valor_sinal || 0) - historyTotal);
      const legacyDate = item.data || getLocalCreatedDate(item.created_at);
      const collectedInPeriod = history.filter((entry) => dateInRange(entry.date)).reduce((sum, entry) => sum + entry.amount, 0) +
        (dateInRange(legacyDate) ? legacyAmount : 0);
      return collectedInPeriod;
    }
    return dateInRange(item.data || getLocalCreatedDate(item.created_at))
      ? Number(item.valor_sinal || 0)
      : 0;
  };

  const getCollectedNetInPeriod = (item: FechamentoDiario) => {
    const history = getUniquePaymentHistory(item.observacao);
    if (history.length > 0) {
      const linkedSale = findSaleForClosing(item);
      const saleInstallments = Math.max(1, Number.parseInt(String(linkedSale?.parcelas || ""), 10) || 1);
      const historyNetTotal = history.reduce(
        (sum, entry) => sum + Number((recalculateFees ? undefined : entry.netAmount) ?? getNetPaymentValue(entry.amount, entry.method, getPaymentInstallments(entry.method, saleInstallments), taxProfile)),
        0,
      );
      const legacyNetAmount = Math.max(0, getFechamentoCollectedNet(item) - historyNetTotal);
      const legacyDate = item.data || getLocalCreatedDate(item.created_at);
      const collectedInPeriod = history
        .filter((entry) => dateInRange(entry.date))
        .reduce((sum, entry) => sum + Number((recalculateFees ? undefined : entry.netAmount) ?? getNetPaymentValue(entry.amount, entry.method, getPaymentInstallments(entry.method, saleInstallments), taxProfile)), 0) +
        (dateInRange(legacyDate) ? legacyNetAmount : 0);
      return collectedInPeriod;
    }
    return dateInRange(item.data || getLocalCreatedDate(item.created_at))
      ? getFechamentoCollectedNet(item)
      : 0;
  };


return { findSaleForClosing, getFechamentoCollectedNet, getCollectedGrossInPeriod, getCollectedNetInPeriod };
}
