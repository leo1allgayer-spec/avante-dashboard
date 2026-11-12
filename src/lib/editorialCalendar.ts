export const CONTENT_TYPES = ['Vídeo/Reels', 'Card', 'Carrossel', 'Foto', 'Story', 'Outro'] as const;
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export interface EditorialEntry {
  folder_id?: string | null;
  id: string; user_id: string; client_id: string | null; client_name: string;
  source_meeting_id: string | null; section: 'general' | 'ads'; title: string;
  content_type: string; publication_date: string; url: string; notes: string;
  captured: boolean; edited: boolean; approval: 'pending' | 'approved' | 'changes';
  approval_notes: string; published: boolean; creative_count: number; received: boolean; configured: boolean;
}
export interface EditorialClient { id: string; name: string; company?: string }
export interface EditorialFolder { id: string; user_id: string; client_id: string | null; name: string }
export interface EditorialDayNote { id: string; user_id: string; folder_id: string; date: string; body: string; category: string }
export type EditorialItem = EditorialEntry;
export const blankEntry = (date: string): EditorialEntry => ({ id: '', user_id: '', client_id: null, client_name: '', source_meeting_id: null, section: 'general', title: '', content_type: 'Vídeo/Reels', publication_date: date, url: '', notes: '', captured: false, edited: false, approval: 'pending', approval_notes: '', published: false, creative_count: 0, received: false, configured: false });
// Legacy agenda-linked records are excluded; only independent editorial content belongs here.
export function editorialItems(entries: EditorialEntry[]): EditorialItem[] {
  return entries.filter(entry => !entry.source_meeting_id)
    .sort((a, b) => a.publication_date.localeCompare(b.publication_date) || a.title.localeCompare(b.title));
}
export const editorialProgress = (e: EditorialEntry) => e.section === 'ads'
  ? (Number(e.received) + Number(e.configured)) * 50
  : (Number(e.captured) + Number(e.edited) + Number(e.approval === 'approved') + Number(e.published)) * 25;
export const safeEditorialUrl = (value: string) => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
