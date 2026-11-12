export function crmModality(row: Record<string, unknown>): 'online' | 'presencial' | 'nao_informado' {
  for (const key of ['modality', 'modalidade', 'meeting_modality', 'location_type', 'meeting_mode', 'kind', 'type']) {
    const value = String(row[key] ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (['online', 'video', 'videochamada', 'video chamada', 'videoconferencia', 'video_call', 'video-call', 'video call', 'virtual', 'remote'].includes(value)) return 'online';
    if (['presencial', 'in_person', 'in-person'].includes(value)) return 'presencial';
  }
  return 'nao_informado';
}
