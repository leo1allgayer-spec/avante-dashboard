import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Client } from "@/types/clients/client";
import type { Meeting } from "@/types/clients/task";

export interface ClientInPersonStatus {
  client: Client;
  lastMeetingDate: string | null;
  daysSinceMeeting: number | null;
  overdue: boolean;
}

const normalizeName = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/_/g, " ")
  .trim()
  .toLocaleLowerCase("pt-BR")
  .replace(/\s+/g, " ");

const isClientReportMeeting = (meeting: Meeting) => {
  if (meeting.status !== "completed" || meeting.modality !== "presencial") return false;
  if (meeting.origin === "curso" || meeting.origin === "suporte" || meeting.id.startsWith("course-") || meeting.id.startsWith("support-")) return false;
  const type = normalizeName(meeting.meetingType || "");
  const service = normalizeName(meeting.service || "");
  return ["reuniao", "reuniao cliente", "reuniao vendas", "relatorio presencial"].includes(type)
    || service.includes("relatorio");
};

export function getClientInPersonStatuses(
  clients: Client[],
  meetings: Meeting[],
  today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }),
): ClientInPersonStatus[] {
  const completedMeetings = meetings.filter(isClientReportMeeting);

  return clients.filter((client) => client.status === "Ativo").map((client) => {
    const clientKey = normalizeName(client.name);
    const lastMeetingDate = completedMeetings
      .filter((meeting) => normalizeName(meeting.clientName || meeting.title || "") === clientKey)
      .map((meeting) => meeting.date)
      .filter((date) => date && date <= today)
      .sort()
      .at(-1) || null;
    const referenceDate = lastMeetingDate || client.startDate || null;
    const daysSinceMeeting = referenceDate
      ? differenceInCalendarDays(parseISO(today), parseISO(referenceDate))
      : null;

    return {
      client,
      lastMeetingDate,
      daysSinceMeeting,
      overdue: daysSinceMeeting === null || daysSinceMeeting > 30,
    };
  }).sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (b.daysSinceMeeting ?? Number.MAX_SAFE_INTEGER) - (a.daysSinceMeeting ?? Number.MAX_SAFE_INTEGER)
      || a.client.name.localeCompare(b.client.name, "pt-BR");
  });
}
