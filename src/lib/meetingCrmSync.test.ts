import {it,expect} from "vitest";
import {shouldSyncMeetingToCrm} from "./meetingCrmSync";
it("only sends closer meetings, excluding internal meetings and other agendas",()=>{
 const meeting={agendaCategory:"reunioes" as const,meetingType:"reuniao_vendas",title:"Empresa cliente"};
 expect(shouldSyncMeetingToCrm(meeting)).toBe(true);
 for(const agendaCategory of ["geral","captacao","social_media"] as const) expect(shouldSyncMeetingToCrm({...meeting,agendaCategory})).toBe(false);
 for(const meetingType of ["reuniao","reuniao_cliente","alinhamento","suporte","captacao","ligacao"]) expect(shouldSyncMeetingToCrm({...meeting,meetingType})).toBe(false);
 expect(shouldSyncMeetingToCrm({...meeting,title:"Reunião interna"})).toBe(false);
 expect(shouldSyncMeetingToCrm({...meeting,agendaCategory:undefined})).toBe(false);
});
