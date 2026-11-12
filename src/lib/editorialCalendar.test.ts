import { describe, expect, it } from 'vitest';
import { blankEntry, editorialProgress, editorialItems, safeEditorialUrl } from './editorialCalendar';
describe('independent editorial calendar', () => {
  it('excludes legacy agenda imports and preserves manually entered content', () => {
    const manual = { ...blankEntry('2026-09-28'), id: 'manual', title: 'Post Social Media', captured: true };
    const imported = { ...manual, id: 'imported', source_meeting_id: 'capture-1' };
    expect(editorialItems([imported, manual])).toEqual([manual]);
    expect(editorialItems([imported])).toEqual([]);
  });
  it('uses manually saved checklist state for progress', () => {
    expect(editorialProgress({ ...blankEntry('2026-09-28'), captured: true, edited: true })).toBe(50);
    expect(editorialProgress({ ...blankEntry('2026-09-28'), section: 'ads', received: true })).toBe(50);
  });
  it('rejects unsafe material links', () => {
    expect(safeEditorialUrl('javascript:alert(1)')).toBeNull();
    expect(safeEditorialUrl('https://drive.google.com/file')).toBe('https://drive.google.com/file');
  });
});
