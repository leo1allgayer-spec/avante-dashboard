import { describe, expect, it } from 'vitest';
import { receivablesCalculator } from './receivablesCalculator';
import type { FechamentoDiario } from '@/hooks/useFechamentosDiarios';
const closing = (fields: Partial<FechamentoDiario>) => ({ cliente: 'Cliente', vendedor: 'Equipe', produto_servico: 'Curso de Meta Ads', data: '2026-09-01', status: 'a receber', valor_sinal: 0, valor_a_entrar: 0, parcelas_datas: [], ...fields } as FechamentoDiario);

describe('consistent receivables across dashboards', () => {
  it('separates this month from prior unpaid balances without counting future balances', () => {
    const records = [closing({ valor_a_entrar: 43789 }), closing({ data: '2026-08-01', valor_a_entrar: 18188 }), closing({ data: '2026-10-01', valor_a_entrar: 1000 })];
    const result = receivablesCalculator([], records, '2026-09-01', '2026-09-30');
    expect(result.total).toBe(61977);
    expect(result.scheduled).toBe(43789);
    expect(result.overdue).toBe(18188);
    expect(receivablesCalculator([], records, '2026-08-01', '2026-09-30').total).toBe(61977);
  });
  it('ignores cancelled balances and excludes settled accounts from overdue', () => {
    const records = [closing({ status: 'cancelado', valor_a_entrar: 99 }), closing({ data: '2026-08-01', valor_sinal: 1000, valor_a_entrar: 500 })];
    const sales = [{ cliente: 'Cliente', vendedor: 'Equipe', valor: 1000, status: 'pago' }] as any;
    expect(receivablesCalculator(sales, records, '2026-09-01', '2026-09-30').total).toBe(0);
  });
  it('uses the updated due date rather than stale dates for a non-installment sale', () => {
    const item = closing({ valor_a_entrar: 900, parcelas_datas: ['2026-08-20'], previsao_entrada: '2026-10-20', valor_parcela: 900 });
    expect(receivablesCalculator([], [item], '2026-09-01', '2026-09-30').total).toBe(0);
    expect(receivablesCalculator([], [item], '2026-10-01', '2026-10-31').total).toBe(900);
  });
  it('allocates installment schedules once within inclusive interval boundaries', () => {
    const item = closing({ parcelas_total: 3, parcelas_datas: ['2026-09-01', '2026-09-30', '2026-10-30'], valor_parcela: 100, valor_a_entrar: 300 });
    expect(receivablesCalculator([], [item], '2026-09-01', '2026-09-30').total).toBe(200);
    expect(receivablesCalculator([], [item], '2026-09-01', '2026-10-31').total).toBe(300);
  });
});
