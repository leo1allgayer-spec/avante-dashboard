import { describe, expect, it } from "vitest";
import { dailyMeetingGoal, agendaActivityCounts, defaultMeetingAnalytics, meetingAnalytics, meetingRatio } from "./meetingAnalytics";
import type { Meeting } from "@/types/clients/task";
const meeting = (id: string, values: Partial<Meeting> = {}): Meeting => ({ id, title: id, date: "2026-09-24", time: "13:30", participants: [], description: "", status: "pending", outcome: null, origin: "", service: "", modality: "online", hasClosed: false, ...values });
const manual = { meetings_scheduled: 10, meetings_held: 6 };
describe("meeting analytics", () => {
  it("divides monthly goals by weekdays and rounds up to whole meetings", () => {
    expect(dailyMeetingGoal(40, "2026-10-08")).toBe(2);
    expect(dailyMeetingGoal(21, "2026-10-08")).toBe(1);
    expect(dailyMeetingGoal(40, "2026-10-10")).toBe(0);
    expect(dailyMeetingGoal(0, "2026-10-08")).toBe(0);
  });
  it("counts completed calls separately from commercial meetings and deduplicates CRM records", () => {
    const rows = [meeting("call", { meetingType: "ligacao", status: "completed" }), meeting("pending-call", { meetingType: "ligacao" }), meeting("held", { status: "completed", externalId: "crm-1" }), meeting("duplicate", { status: "completed", externalId: "crm-1" }), meeting("scheduled"), meeting("support", { meetingType: "suporte", status: "completed" }), meeting("capture", { agendaCategory: "captacao", status: "completed" }), meeting("old", { date: "2026-08-24" })];
    expect(agendaActivityCounts(rows, "2026-09")).toEqual({ callsHeld: 1, meetingsScheduled: 2, meetingsHeld: 1 });
    expect(agendaActivityCounts(rows, "2026-09-25")).toEqual({ callsHeld: 0, meetingsScheduled: 0, meetingsHeld: 0 });
    expect(agendaActivityCounts(rows, "2026-09-24").callsHeld).toBe(1);
  });
  it("uses only meetings from the selected month, excluding other agenda types and duplicate CRM entries", () => {
    const result = meetingAnalytics([meeting("a", { status: "completed", externalId: "crm-a" }), meeting("b", { externalId: "crm-a", status: "completed" }), meeting("c", { status: "cancelled" }), meeting("d", { agendaCategory: "captacao" }), meeting("e", { date: "2026-08-24" }), meeting("f", { meetingType: "suporte" })], "2026-09", defaultMeetingAnalytics, manual);
    expect(result.scheduled).toBe(2); expect(result.held).toBe(1); expect(result.cancelled).toBe(1);
    expect(result.noShows).toBeNull(); expect(result.costHeld).toBeNull();
  });
  it("uses manual volumes as a replacement and computes costs, rates and pending correctly", () => {
    const result = meetingAnalytics([], "2026-09", { ...defaultMeetingAnalytics, mode: "manual", leads: 50, investment: 300, noShows: 1, cancelled: 1, rescheduled: 2 }, manual);
    expect(result.schedulingRate).toBe(20); expect(result.attendanceRate).toBe(60);
    expect(result.costScheduled).toBe(30); expect(result.costHeld).toBe(50);
    expect(result.pending).toBe(2); expect(result.reschedulingRate).toBe(20); expect(result.issues).toEqual([]);
  });
  it("never infers no-show from overdue pending meetings", () => {
    const result = meetingAnalytics([meeting("past", { date: "2020-01-01" })], "2020-01", defaultMeetingAnalytics, manual);
    expect(result.noShows).toBeNull(); expect(result.held).toBe(0);
  });
  it("distinguishes zero from missing data and guards empty denominators", () => {
    expect(meetingRatio(0, 10)).toBe(0); expect(meetingRatio(3, 0)).toBeNull(); expect(meetingRatio(null, 10)).toBeNull();
    const result = meetingAnalytics([], "2026-09", { ...defaultMeetingAnalytics, investment: 0 }, manual);
    expect(result.costScheduled).toBeNull(); expect(result.attendanceRate).toBeNull();
  });
  it("flags impossible totals instead of silently treating them as valid", () => {
    const result = meetingAnalytics([], "2026-09", { ...defaultMeetingAnalytics, mode: "manual", noShows: 8, cancelled: 3, rescheduled: 20 }, manual);
    expect(result.issues).toHaveLength(2);
  });
});
