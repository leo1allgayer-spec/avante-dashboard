import { describe, expect, it } from "vitest";
import { monthlyAdInvestment } from "./monthlyAdInvestment";

describe("monthly advertising investment", () => {
  it("uses Meta spending for matching days and registered spending for other days", () => {
    expect(monthlyAdInvestment([{ date: "2026-09-01", ads: 999 }, { date: "2026-09-02", ads: 100 }], [{ date_start: "2026-09-01", spend: "200" }])).toBeCloseTo(336.75);
  });
  it("excludes goal rows and applies the tax once", () => {
    expect(monthlyAdInvestment([{ date: "2026-09-01", ads: 5000, meta_mensal_prevista: 100000 }, { date: "2026-09-02", ads: 100 }], [])).toBeCloseTo(112.25);
  });
  it("keeps a confirmed zero instead of falling back to a manual amount", () => {
    expect(monthlyAdInvestment([{ date: "2026-09-01", ads: 100 }], [{ date_start: "2026-09-01", spend: "0" }])).toBe(0);
  });
});
