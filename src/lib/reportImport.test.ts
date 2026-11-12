import { describe, expect, it } from "vitest";
import { parseReport, reportNumber } from "./reportImport";

describe("report import", () => {
  it("reads the weekly Bodegas report with Brazilian formatting", () => {
    expect(parseReport("CLIENTE: BODEGAS\nCAMPANHA: vendas\n📅 PERÍODO: 17/09 a 23/09\n💲 Investimento em anúncios: R$ 9,56\n📱 Impressões: 1.035\n📲 Cliques: 2\n🛒 Pedidos: 3\n💰 Faturamento: R$ 177,88\nROAS: 18,61")).toEqual({
      campaign: "vendas", period: "17/09 a 23/09", investment: "9.56",
      impressions: "1035", clicks: "2", orders: "3", revenue: "177.88",
    });
  });
  it("preserves missing values instead of inventing zero", () => {
    expect(parseReport("Pedidos: 0\nCusto por clique: R$ 2,50").orders).toBe("0");
    expect(parseReport("Custo por clique: R$ 2,50").clicks).toBe("");
    expect(parseReport("ROAS: 18,61").revenue).toBe("");
  });
  it("handles thousands in monetary amounts", () => {
    expect(reportNumber("R$ 1.234,56")).toBe(1234.56);
    expect(reportNumber("9.56")).toBe(9.56);
  });
});
