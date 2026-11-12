import type { FechamentoDiario } from '@/hooks/useFechamentosDiarios';
import type { Venda } from '@/hooks/useVendas';
import { canonicalizeSaleCategory } from '@/constants/serviceCategories';

const norm = (value?: string | null) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const dates = (item: FechamentoDiario) => Array.isArray(item.parcelas_datas) ? item.parcelas_datas.filter(Boolean).sort() : [];

/** Current balances allocated by due date, with prior unpaid balances shown separately. */
export function receivablesCalculator(sales: Venda[], closings: FechamentoDiario[], start: string, end: string, includeOverdue = true, saleDatePriority = false) {
  const inside = (date?: string | null) => !!date && date >= start && date <= end;
  const sold = new Map<string, number>();
  const paid = new Map<string, Map<string, number>>();
  const clientKey = (item: { cliente: string; vendedor: string }) => `${norm(item.cliente)}|${norm(item.vendedor)}`;
  sales.filter(s => s.status !== 'cancelada').forEach(s => sold.set(clientKey(s), (sold.get(clientKey(s)) || 0) + Math.max(0, Number(s.valor || 0))));
  closings.filter(c => c.status !== 'cancelado').forEach(c => {
    const key = clientKey(c), category = norm(canonicalizeSaleCategory(c.categoria || c.produto_servico));
    const categories = paid.get(key) || new Map<string, number>();
    categories.set(category, Math.max(categories.get(category) || 0, Number(c.valor_sinal || 0)));
    paid.set(key, categories);
  });
  const isCarriedOver = (item: FechamentoDiario) => {
    if (!includeOverdue || Number(item.valor_a_entrar || 0) <= 0 || ['cancelado', 'recebido'].includes(item.status)) return false;
    const totalSold = sold.get(clientKey(item)) || 0;
    const totalPaid = [...(paid.get(clientKey(item))?.values() || [])].reduce((a, b) => a + b, 0);
    if (totalSold > 0 && totalPaid >= totalSold - .01) return false;
    const due = Number(item.parcelas_total || 0) > 1
      ? dates(item).at(-1) || item.previsao_entrada || item.data
      : item.previsao_entrada || dates(item).at(-1) || item.data;
    return !!due && due < start;
  };
  const amount = (item: FechamentoDiario) => {
    if (item.status === 'cancelado') return 0;
    const balance = Number(item.valor_a_entrar || 0);
    if (saleDatePriority && inside(item.data)) return balance;
    if (isCarriedOver(item)) return balance;
    const stored = dates(item), count = stored.filter(inside).length;
    if (Number(item.parcelas_total || 0) > 1 && count && Number(item.valor_parcela || 0) > 0) return count * Number(item.valor_parcela);
    if (item.previsao_entrada) return inside(item.previsao_entrada) ? balance : 0;
    if (count && Number(item.valor_parcela || 0) > 0) return count * Number(item.valor_parcela);
    return !stored.length && inside(item.data) ? balance : 0;
  };
  const total = closings.reduce((sum, c) => sum + amount(c), 0);
  const overdue = closings.reduce((sum, c) => sum + (isCarriedOver(c) ? Number(c.valor_a_entrar || 0) : 0), 0);
  return { amount, isCarriedOver, total, overdue, scheduled: total - overdue };
}
