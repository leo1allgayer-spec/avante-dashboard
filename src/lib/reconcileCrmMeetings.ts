import type { Meeting } from '@/types/clients/task';
import { crmMeetingAgenda } from './crmMeetingAgenda';

export function reconcileCrmMeetings(local: Meeting[], remote: Meeting[], deleted: Set<string>, since: string, until: string, complete: boolean) {
  const byExternalId = new Map(remote.map(meeting => [meeting.externalId, meeting]));
  const linkedIds = new Set(local.map(meeting => meeting.externalId).filter(Boolean));
  const merged = local.filter(meeting => !meeting.externalId || !deleted.has(meeting.externalId)).map(meeting => {
    if (!meeting.externalId) return meeting;
    const current = byExternalId.get(meeting.externalId);
    if (current) return { ...meeting, agendaCategory: crmMeetingAgenda(current.responsible, current.meetingType), meetingType: current.meetingType, modality: current.modality === "nao_informado" ? meeting.modality : current.modality, title: current.title, clientName: current.clientName, responsible: current.responsible ?? '', clientPhone: current.clientPhone ?? meeting.clientPhone, notifyClient: current.notifyClient ?? meeting.notifyClient, date: current.date, time: current.time, durationMinutes: current.durationMinutes, status: current.status };
    // Absence is meaningful only after a complete successful query covering this date.
    if (complete && meeting.status === 'pending' && meeting.date >= since && meeting.date <= until) return { ...meeting, status: 'cancelled' as const };
    return meeting;
  });
  return [...merged, ...remote.filter(meeting => !linkedIds.has(meeting.externalId) && !deleted.has(String(meeting.externalId || '')))];
}
