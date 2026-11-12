export function isCloserResponsible(responsible?: string): boolean {
  const name = (responsible || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  return name === 'leonardo webster';
}

export function crmMeetingAgenda(responsible?: string, meetingType?: string): 'reunioes' | 'geral' {
  return isCloserResponsible(responsible) && ['reuniao','reuniao_vendas','reuniao_cliente'].includes(meetingType || 'reuniao') ? 'reunioes' : 'geral';
}

export function localMeetingAgenda<T extends string>(category: T, responsible?: string, meetingType?: string): T | 'geral' | 'reunioes' {
  if (category !== 'reunioes' && category !== 'geral') return category;
  return isCloserResponsible(responsible) && meetingType === 'reuniao_vendas' ? 'reunioes' : 'geral';
}
