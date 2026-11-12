import { expect, it } from "vitest";
import { collectionCalculator } from "./collectionCalculator";
import type { FechamentoDiario } from "@/hooks/useFechamentosDiarios";
const closing = (updates: Partial<FechamentoDiario>) => ({ data: "2026-08-01", valor_sinal: 1000, valor_sinal_liquido: 950, ...updates } as FechamentoDiario);
const payment = { id: "payment-1", date: "2026-09-10", amount: 800, netAmount: 750, method: "PIX" };
it("inclui recebimentos de vendas antigas e mantém sinal na data original", () => {
  const row = closing({ observacao: `[PAGAMENTO_VENDA]${JSON.stringify(payment)}` });
  expect(collectionCalculator([], "2026-09-01", "2026-09-30").getCollectedNetInPeriod(row)).toBe(750);
  expect(collectionCalculator([], "2026-08-01", "2026-08-31").getCollectedNetInPeriod(row)).toBe(200);
});
it("não duplica pagamentos repetidos e respeita intervalo diário", () => {
  const line = `[PAGAMENTO_VENDA]${JSON.stringify(payment)}`;
  const row = closing({ observacao: `${line}\n${line}` });
  expect(collectionCalculator([], "2026-09-10", "2026-09-10").getCollectedNetInPeriod(row)).toBe(750);
  expect(collectionCalculator([], "2026-09-11", "2026-09-11").getCollectedNetInPeriod(row)).toBe(0);
});
it("preserva o valor líquido de registros sem histórico", () => {
  expect(collectionCalculator([], "2026-08-01", "2026-08-31").getCollectedNetInPeriod(closing({}))).toBe(950);
});

it('atribui apenas os 400 novos ao dia do recebimento e mantém os 500 anteriores',()=>{
 const row=closing({data:'2026-10-14',valor_sinal:900,valor_sinal_liquido:900,observacao:'[PAGAMENTO_VENDA]'+JSON.stringify({id:'nike-new',date:'2026-10-23',amount:400,netAmount:400,method:'PIX'})});
 expect(collectionCalculator([],'2026-10-23','2026-10-23').getCollectedNetInPeriod(row)).toBe(400);
 expect(collectionCalculator([],'2026-10-14','2026-10-14').getCollectedNetInPeriod(row)).toBe(500);
 expect(collectionCalculator([],'2026-10-01','2026-10-31').getCollectedNetInPeriod(row)).toBe(900);
});
