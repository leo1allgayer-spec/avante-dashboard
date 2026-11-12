import type { Meeting } from "@/types/clients/task";

export interface MeetingAnalyticsSettings {
  mode: "agenda" | "manual";
  leads: number | null;
  investment: number | null;
  noShows: number | null;
  rescheduled: number | null;
  cancelled: number;
  heldGoal: number | null;
  scheduledGoal: number | null;
  schedulingTarget: number | null;
  attendanceTarget: number | null;
  noShowTarget: number | null;
  cancellationTarget: number | null;
  reschedulingTarget: number | null;
}
export const defaultMeetingAnalytics: MeetingAnalyticsSettings = {
  mode: "agenda", leads: null, investment: null, noShows: null, rescheduled: null,
  cancelled: 0, heldGoal: null, scheduledGoal: null, schedulingTarget: null,
  attendanceTarget: null, noShowTarget: null, cancellationTarget: null, reschedulingTarget: null,
};
export const meetingRatio = (numerator: number | null, denominator: number | null) =>
  numerator == null || denominator == null || denominator <= 0 ? null : numerator / denominator * 100;

export function dailyMeetingGoal(monthlyGoal: number, dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  if (date.getDay() === 0 || date.getDay() === 6 || monthlyGoal <= 0) return 0;
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  let weekdays = 0;
  for (let day = 1; day <= days; day++) {
    const weekday = new Date(date.getFullYear(), date.getMonth(), day).getDay();
    if (weekday >= 1 && weekday <= 5) weekdays++;
  }
  return Math.ceil(monthlyGoal / weekdays);
}

export function agendaActivityCounts(meetings: Meeting[], period: string) {
  const rows = [...new Map(meetings.filter((m) =>
    (m.agendaCategory || "reunioes") === "reunioes" && m.date.startsWith(period)
  ).map((m) => [m.externalId || m.id, m])).values()];
  const commercial = rows.filter((m) => (m.meetingType || "reuniao") === "reuniao");
  return {
    callsHeld: rows.filter((m) => m.meetingType === "ligacao" && m.status === "completed").length,
    meetingsScheduled: commercial.length,
    meetingsHeld: commercial.filter((m) => m.status === "completed").length,
  };
}

export function meetingAnalytics(meetings: Meeting[], month: string, settings: MeetingAnalyticsSettings, manual: { meetings_scheduled: number; meetings_held: number }) {
  // A meeting rescheduled to another date still has one id and counts once.
  const rows = [...new Map(meetings.filter((m) => (m.agendaCategory || "reunioes") === "reunioes" && (m.meetingType || "reuniao") === "reuniao" && m.date.slice(0, 7) === month).map((m) => [m.externalId || m.id, m])).values()];
  const scheduled = settings.mode === "manual" ? manual.meetings_scheduled : rows.length;
  const held = settings.mode === "manual" ? manual.meetings_held : rows.filter((m) => m.status === "completed").length;
  const cancelled = settings.mode === "manual" ? settings.cancelled : rows.filter((m) => m.status === "cancelled").length;
  const noShows = settings.noShows;
  const pending = noShows == null ? null : Math.max(0, scheduled - held - cancelled - noShows);
  const issues: string[] = [];
  if (held + cancelled + (noShows || 0) > scheduled) issues.push("Realizadas + canceladas + faltas não podem ultrapassar as reuniões marcadas.");
  if ((settings.rescheduled || 0) > scheduled) issues.push("Reuniões reagendadas não podem ultrapassar as marcadas; conte cada reunião uma vez.");
  if (settings.leads != null && scheduled > settings.leads) issues.push("Marcadas superam os leads informados. Confira se ambos representam o mesmo período e a mesma base.");
  return {
    scheduled, held, cancelled, noShows, pending, issues,
    rescheduled: settings.rescheduled,
    schedulingRate: meetingRatio(scheduled, settings.leads),
    attendanceRate: meetingRatio(held, scheduled),
    noShowRate: meetingRatio(noShows, scheduled),
    cancellationRate: meetingRatio(cancelled, scheduled),
    reschedulingRate: meetingRatio(settings.rescheduled, scheduled),
    costScheduled: settings.investment == null || scheduled === 0 ? null : settings.investment / scheduled,
    costHeld: settings.investment == null || held === 0 ? null : settings.investment / held,
  };
}
