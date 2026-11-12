import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { EditorialDayNote, EditorialItem } from '@/lib/editorialCalendar';
import { Checkbox } from '@/components/ui/checkbox';

const categories = { livre: 'Livre', institucional: 'Institucional', informativo: 'Informativo', comemorativo: 'Comemorativo', sazonal: 'Sazonal', inspiracional: 'Inspiracional' };
const colors: Record<string, string> = { livre: '', institucional: 'bg-amber-500/20', informativo: 'bg-yellow-300/15', comemorativo: 'bg-orange-500/20', sazonal: 'bg-teal-500/15', inspiracional: 'bg-violet-500/20' };
export function EditorialDayCell({ date, note, items, userId, onSave, onCreate, onEdit, onMove, onDelete, onPublished, busy, canManageAll }: {
  date: string; note?: EditorialDayNote; items: EditorialItem[]; userId?: string;
  onSave: (body: string, category: string) => Promise<void>; onCreate: () => void;
  onEdit: (item: EditorialItem) => void; onMove: (id: string) => void;
  onDelete: (item: EditorialItem) => void; busy: boolean; canManageAll: boolean;
  onPublished: (item: EditorialItem, published: boolean) => void;
}) {
  const [body, setBody] = useState(note?.body || '');
  const [category, setCategory] = useState(note?.category === 'livre' ? '' : note?.category || '');
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const readonly = !!note && !canManageAll && note.user_id !== userId;
  useEffect(() => { if (!dirty) { setBody(note?.body || ''); setCategory(note?.category === 'livre' ? '' : note?.category || ''); } }, [note?.body, note?.category, dirty]);
  const save = async (nextCategory = category) => {
    nextCategory = nextCategory.trim() || 'livre';
    if (readonly || status === 'saving' || (!dirty && nextCategory === (note?.category || 'livre'))) return;
    setStatus('saving');
    try { await onSave(body, nextCategory); setDirty(false); setStatus('saved'); }
    catch { setStatus('error'); }
  };
  const label = date.split('-').reverse().join('/');
  return <div data-date={date} className={`min-h-52 p-2 border-b border-r border-border space-y-2 ${colors[category] || ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onMove(e.dataTransfer.getData('text/editorial-id')); }}>
    <div className="flex items-center justify-between"><span className="text-sm font-semibold">{Number(date.slice(-2))}</span><button type="button" aria-label={`Adicionar conteúdo em ${label}`} onClick={onCreate} className="rounded p-1 hover:bg-secondary"><Plus className="h-4 w-4" /></button></div>
    <input aria-label={`Categoria de ${label}`} list={`editorial-categories-${date}`} placeholder="Digite ou selecione" maxLength={100} disabled={readonly || status === 'saving'} className="w-full bg-transparent text-xs rounded border border-border px-2 py-1" value={categories[category as keyof typeof categories] || category} onChange={e => { const value = e.target.value; const preset = Object.entries(categories).find(([, text]) => text.toLocaleLowerCase() === value.toLocaleLowerCase()); setCategory(preset?.[0] || value); setDirty(true); setStatus('idle'); }} onBlur={() => void save(category.trim() || 'livre')} />
    <datalist id={`editorial-categories-${date}`}>{Object.values(categories).map(value => <option key={value} value={value} />)}</datalist>
    <textarea aria-label={`Anotações de ${label}`} placeholder="Escreva o planejamento deste dia..." className="w-full min-h-24 resize-y rounded bg-transparent p-1 text-xs leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" value={body} disabled={readonly || status === 'saving'} onChange={e => { setBody(e.target.value); setDirty(true); setStatus('idle'); }} onBlur={() => void save()} />
    <div className="text-[10px] text-muted-foreground" role="status">{readonly ? 'Anotação do responsável' : status === 'saving' ? 'Salvando...' : status === 'error' ? <button className="text-destructive underline" onClick={() => void save()}>Falha ao salvar. Tentar novamente</button> : dirty ? 'Salva ao sair do campo' : status === 'saved' ? 'Salvo' : ''}</div>
    {items.map(item => <div key={item.id} className={`rounded border text-xs ${item.published ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-primary/20 bg-primary/10'}`}>
      <div className="flex items-start">
      <button draggable={(canManageAll || item.user_id === userId) && !busy} onDragStart={e => e.dataTransfer.setData('text/editorial-id', item.id)} onClick={() => onEdit(item)} className="min-w-0 flex-1 p-2 text-left"><span className="font-medium break-words">{item.title}</span><span className="block text-muted-foreground mt-1">{item.content_type}</span></button>
      <button type="button" aria-label={`Excluir ${item.title}`} title={canManageAll || item.user_id === userId ? 'Excluir conteúdo' : 'Somente o responsável pode excluir este conteúdo'} disabled={busy || (!canManageAll && item.user_id !== userId)} onClick={() => onDelete(item)} className="shrink-0 rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
      </div>
      {item.section === 'general' && <div className="border-t border-border/50 p-2 space-y-2">
        <span className={`block text-[10px] ${item.approval === 'approved' ? 'text-emerald-500' : item.approval === 'changes' ? 'text-amber-500' : 'text-muted-foreground'}`}>{item.approval === 'approved' ? 'Aprovado' : item.approval === 'changes' ? 'Ajuste solicitado' : 'Aprovação pendente'}</span>
        <label className="flex items-center gap-2 cursor-pointer"><Checkbox aria-label={`Publicado: ${item.title}`} checked={item.published} disabled={busy || (!canManageAll && item.user_id !== userId)} onCheckedChange={value => onPublished(item, value === true)} />{item.published ? 'Publicado' : 'Marcar como publicado'}</label>
      </div>}
    </div>)}
  </div>;
}
