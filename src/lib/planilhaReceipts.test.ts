import { describe, it, expect } from "vitest";
import { splitPlanilhaReceipts } from "./planilhaReceipts";
import type { FechamentoDiario } from "@/hooks/useFechamentosDiarios";

const closing = (updates: Partial<FechamentoDiario> = {}) => ({
  data: "2026-10-08", created_at: "2026-09-18T15:00:00Z",
  valor_sinal: 1000, valor_sinal_liquido: 1000, valor_a_entrar: 897,
  observacao: null, ...updates,
} as FechamentoDiario);

describe("Recebimentos da planilha", () => {
  it("separa entrada parcial", () => {
    expect(splitPlanilhaReceipts(closing())).toEqual({ "2026-10-08": { feito: 0, sinais: 1000 } });
  });
  it("mostra pagamento integral líquido em fat. feito", () => {
    expect(splitPlanilhaReceipts(closing({ valor_a_entrar: 0, valor_sinal_liquido: 970 })))
      .toEqual({ "2026-10-08": { feito: 970, sinais: 0 } });
  });
  it("mantém sinal no mês original quando há quitação posterior", () => {
    const result = splitPlanilhaReceipts(closing({
      valor_sinal: 1897, valor_sinal_liquido: 1897, valor_a_entrar: 0,
      observacao: '[PAGAMENTO_VENDA]{"date":"2026-10-08","amount":897,"netAmount":897}',
    }));
    expect(result).toEqual({
      "2026-09-18": { feito: 0, sinais: 1000 },
      "2026-10-08": { feito: 897, sinais: 0 },
    });
  });
  it("entradas adicionais parciais continuam em sinais até quitar", () => {
    expect(splitPlanilhaReceipts(closing({
      valor_sinal: 1500, valor_sinal_liquido: 1470, valor_a_entrar: 397,
      observacao: '[PAGAMENTO_VENDA]{"date":"2026-10-08","amount":500,"netAmount":470}',
    }))).toEqual({
      "2026-09-18": { feito: 0, sinais: 1000 },
      "2026-10-08": { feito: 0, sinais: 470 },
    });
  });
});
