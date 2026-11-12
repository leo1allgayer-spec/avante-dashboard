export function meetingScheduleLabel(meeting: { time?: string; durationMinutes?: number; agendaCategory?: string }) {
  const duration = meeting.durationMinutes || 0;
  const shift = meeting.agendaCategory === 'captacao' && duration >= 240
    ? duration >= 480 ? 'Dia inteiro' : duration >= 360 ? 'Tarde' : 'Manhã'
    : '';
  return [meeting.time, shift || (meeting.time && duration ? `${duration} min` : '')].filter(Boolean).join(' · ');
}
