import type { AgendaCategory,Meeting } from '@/types/clients/task';
export const AGENDA_LABELS:Record<AgendaCategory,string>={geral:'Agenda Geral',reunioes:'Agenda Closer',captacao:'Agenda de Captação',social_media:'Agenda Social Media'};
export const AGENDA_DESCRIPTIONS:Record<AgendaCategory,string>={
 geral:'Compromissos internos e reuniões que não pertencem ao Closer. A visão geral também mostra Closer, Captação, Social Media e Suporte. Cursos também aparecem na visão geral e são gerenciados na Agenda Curso.',
 reunioes:'Reuniões comerciais do Closer, com Leonardo Webster como responsável.',
 captacao:'Gravações, visitas e produção de conteúdo.',
 social_media:'Compromissos e entregas da equipe de Social Media.',
};
export const AGENDA_DESTINATIONS=[
 {value:'geral',label:AGENDA_LABELS.geral},
 {value:'reunioes',label:AGENDA_LABELS.reunioes},
 {value:'captacao',label:AGENDA_LABELS.captacao},
 {value:'social_media',label:AGENDA_LABELS.social_media},
 {value:'__support',label:'Agenda de Suporte · abrir agendamento',path:'/agenda-suporte'},
 {value:'__courses',label:'Agenda Curso · abrir agenda',path:'/tasks'},
];
export const isSupportMeeting=(meeting:Pick<Meeting,'id'|'origin'>)=>meeting.origin==='suporte'||meeting.id.startsWith('support-');
export const isCourseMeeting=(meeting:Pick<Meeting,'id'|'origin'>)=>meeting.origin==='curso'||meeting.id.startsWith('course-');
export const meetingAgendaLabel=(meeting:Pick<Meeting,'id'|'origin'|'agendaCategory'>)=>isCourseMeeting(meeting)?'Agenda Curso':isSupportMeeting(meeting)?'Agenda de Suporte':AGENDA_LABELS[meeting.agendaCategory||'reunioes'];

