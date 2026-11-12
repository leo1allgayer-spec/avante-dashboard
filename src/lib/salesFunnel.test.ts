import { describe, expect, it } from "vitest";
import { funnelIndicators } from "./salesFunnel";

describe("funnelIndicators", () => {
  it("calcula custo, conversão entre etapas e participação na base", () => {
    expect(funnelIndicators(20, 50, 100, 1000)).toEqual({ cost: 50, conversion: 40, share: 20 });
  });
  it("diferencia zero de informação indisponível", () => {
    expect(funnelIndicators(0, 50, 100, 1000)).toEqual({ cost: null, conversion: 0, share: 0 });
    expect(funnelIndicators(null, 50, 100, 1000)).toEqual({ cost: null, conversion: null, share: null });
    expect(funnelIndicators(5, 0, 0, null)).toEqual({ cost: null, conversion: null, share: null });
  });
});
