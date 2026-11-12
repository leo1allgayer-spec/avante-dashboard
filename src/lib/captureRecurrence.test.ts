import { expect, it } from "vitest";
import { captureDates } from "./captureRecurrence";
it("gera semanas atravessando meses e inclui a data final", () => {
  expect(captureDates("2026-09-28", { intervalDays: 7, until: "2026-10-12" })).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
});
it("repete a cada quinze dias, não a cada duas semanas", () => {
  expect(captureDates("2026-12-28", { intervalDays: 15, until: "2027-01-27" })).toEqual(["2026-12-28", "2027-01-12", "2027-01-27"]);
});
it("valida datas e limite e mantém agendamento único", () => {
  expect(captureDates("2026-09-28")).toEqual(["2026-09-28"]);
  expect(() => captureDates("2026-02-30")).toThrow();
  expect(() => captureDates("2026-09-28", { intervalDays: 7, until: "2026-09-27" })).toThrow();
  expect(() => captureDates("2026-09-28", { intervalDays: 7, until: "2030-09-28" })).toThrow();
});
