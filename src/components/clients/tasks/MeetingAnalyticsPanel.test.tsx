// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MeetingAnalyticsPanel from "./MeetingAnalyticsPanel";
import { defaultMeetingAnalytics } from "@/lib/meetingAnalytics";

const mocks = vi.hoisted(() => ({ save: vi.fn(), useMetrics: vi.fn() }));
vi.mock("@/hooks/clients/useMeetingMetrics", () => ({
  useMeetingMonthlyMetrics: mocks.useMetrics,
  useSaveMeetingMonthlyMetrics: () => ({ mutateAsync: mocks.save, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/clients/useMeetingAdInvestment", () => ({ useMeetingAdInvestment: () => ({ data: { investment: 900, fallback: false }, isLoading: false, isError: false }) }));
beforeEach(() => {
  mocks.save.mockReset().mockResolvedValue({});
  mocks.useMetrics.mockReset().mockImplementation((month: string) => ({ data: { month, meetings_scheduled: 10, meetings_held: 6, scheduling_goal: 12, cost_per_scheduling: 15, analytics: { ...defaultMeetingAnalytics, mode: "manual", leads: 30, investment: 300, noShows: 1, cancelled: 1, rescheduled: 2 } }, isLoading: false }));
});
afterEach(cleanup);
describe("meeting metrics panel", () => {
  it("saves the configured month and keeps existing manual values", async () => {
    render(<MeetingAnalyticsPanel meetings={[]} />);
    fireEvent.change(screen.getByLabelText("Mês das métricas"), { target: { value: "2026-08" } });
    fireEvent.click(screen.getByRole("button", { name: "Metas e lançamentos" }));
    fireEvent.change(screen.getByLabelText("Meta de reuniões realizadas"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar metas e lançamentos" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ month: "2026-08", meetings_scheduled: 10, meetings_held: 6, analytics: expect.objectContaining({ heldGoal: 8, scheduledGoal: 12 }) })));
  });
  it("calculates costs from automatic ad spending instead of the old manual investment", () => {
    render(<MeetingAnalyticsPanel meetings={[]} />);
    expect(screen.getByText("Custo por reunião marcada").parentElement?.textContent).toContain("90,00");
    expect(screen.getByText("Custo por reunião realizada").parentElement?.textContent).toContain("150,00");
  });
  it("does not expose zero-filled KPIs on load failure", () => {
    mocks.useMetrics.mockReturnValue({ error: new Error("offline"), isLoading: false });
    render(<MeetingAnalyticsPanel meetings={[]} />);
    expect(screen.getByRole("alert").textContent).toContain("Não foi possível carregar");
    expect(screen.queryByText("Custo por reunião realizada")).toBeNull();
  });
});
