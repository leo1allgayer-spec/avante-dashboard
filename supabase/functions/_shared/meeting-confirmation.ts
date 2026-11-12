export function eligibleBookingConfirmation(meeting: any, remote: any, startedAt: string, today: string) {
  if (meeting.status !== 'pending' || meeting.date < today || (meeting.agenda_category !== 'reunioes' && !(meeting.agenda_category === 'geral' && meeting.origin === 'CRM'))
    || !['reuniao', 'reuniao_vendas', 'reuniao_cliente'].includes(meeting.meeting_type || 'reuniao')
    || /\bintern[ao]s?\b/i.test(meeting.title || '')) return false;
  const createdAt = meeting.external_id ? remote?.createdAt : meeting.created_at;
  return Boolean(createdAt && Number.isFinite(Date.parse(createdAt)) && Date.parse(createdAt) >= Date.parse(startedAt));
}
