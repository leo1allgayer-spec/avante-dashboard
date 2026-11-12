import type { FechamentoDiario } from "@/hooks/useFechamentosDiarios";

export type DailyReceipt = { feito: number; sinais: number };

// A entrada continua sendo sinal mesmo quando o saldo é quitado depois.
export function splitPlanilhaReceipts(item: FechamentoDiario): Record<string, DailyReceipt> {
  const history = (item.observacao || "").split("\n").flatMap(line => {
    if (!line.startsWith("[PAGAMENTO_VENDA]")) return [];
    try {
      const entry = JSON.parse(line.slice("[PAGAMENTO_VENDA]".length));
      const amount = Number(entry.amount);
      const net = Number(entry.netAmount ?? amount);
      return entry.date && Number.isFinite(amount) && amount > 0 && Number.isFinite(net)
        ? [{ date: String(entry.date), amount, net }] : [];
    } catch { return []; }
  }).sort((a, b) => a.date.localeCompare(b.date));
  const gross = Math.max(0, Number(item.valor_sinal || 0));
  const net = Math.max(0, Number(item.valor_sinal_liquido ?? gross));
  const total = gross + Math.max(0, Number(item.valor_a_entrar || 0));
  const historyGross = history.reduce((sum, entry) => sum + entry.amount, 0);
  const historyNet = history.reduce((sum, entry) => sum + entry.net, 0);
  const legacyGross = Math.max(0, gross - historyGross);
  const legacyNet = Math.max(0, net - historyNet);
  const legacyDate = history.length && item.created_at
    ? new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.created_at))
    : item.data;
  const payments = [
    ...(legacyNet > 0 ? [{ date: legacyDate, amount: legacyGross, net: legacyNet }] : []),
    ...history,
  ];
  const result: Record<string, DailyReceipt> = {};
  let collected = 0;
  for (const payment of payments) {
    collected += payment.amount;
    const key = collected + 0.009 < total ? "sinais" : "feito";
    const day = result[payment.date] ||= { feito: 0, sinais: 0 };
    day[key] += payment.net;
  }
  return result;
}
