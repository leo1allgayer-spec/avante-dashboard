import { Meeting } from "@/types/clients/task";
export function shouldSyncMeetingToCrm(meeting: Pick<Meeting,"agendaCategory" | "meetingType" | "title">) {
  const title = meeting.title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  return meeting.agendaCategory === "reunioes"
    && meeting.meetingType === "reuniao_vendas"
    && !/\b(interna|interno|internas|internos)\b/.test(title);
}
