import { CalendarDays, ExternalLink, Film, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { EditorialEntry, EditorialItem, editorialProgress, safeEditorialUrl } from '@/lib/editorialCalendar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
export function EditorialCard({ item, disabled, onEdit, onDelete, onCheck }: { item: EditorialItem; disabled: boolean; onEdit: () => void; onDelete: () => void; onCheck: (patch: Partial<EditorialEntry>) => void }) {
  const ads = item.section === 'ads';
  const progress = editorialProgress(item);
  const link = safeEditorialUrl(item.url);
  const checks = ads ? [ ['received', 'Recebido', item.received], ['configured', 'Configurado nos anúncios', item.configured] ] as const
    : [ ['captured', 'Captação realizada', item.captured], ['edited', 'Edição concluída', item.edited], ['approval', 'Aprovado', item.approval === 'approved'], ['published', 'Publicado', item.published] ] as const;
  return <article className="rounded-xl border border-border bg-card p-4 space-y-4 min-w-0">
    <div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary">{ads ? <FolderOpen className="h-5 w-5" /> : <Film className="h-5 w-5" />}</div><button onClick={onEdit} className="min-w-0 flex-1 text-left"><h3 className="font-semibold break-words">{item.title}</h3><p className="text-xs text-muted-foreground truncate mt-1">{item.client_name}</p></button><Button size="icon" variant="ghost" onClick={onEdit} aria-label={`Detalhes de ${item.title}`}><Pencil className="h-4 w-4" /></Button></div>
    <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground"><Badge variant="secondary">{ads ? `${item.creative_count} criativos` : item.content_type}</Badge><span className="flex gap-1 items-center"><CalendarDays className="h-3 w-3" />{item.publication_date.split('-').reverse().join('/')}</span></div>
    <div className="grid gap-3 sm:grid-cols-2">{checks.map(([key, label, checked]) => <label key={key} className="flex gap-2 items-center text-sm"><Checkbox aria-label={`${label}: ${item.title}`} checked={checked} disabled={disabled} onCheckedChange={value => onCheck(key === 'approval' ? { approval: value ? 'approved' : 'pending' } : { [key]: !!value })} />{label}</label>)}</div>
    {item.approval === 'changes' && <p className="rounded-md bg-amber-500/10 p-2 text-sm text-amber-500">Ajuste solicitado{item.approval_notes ? `: ${item.approval_notes}` : ''}</p>}
    {item.notes && <p className="text-sm text-muted-foreground line-clamp-2">{item.notes}</p>}
    <div><div className="flex justify-between text-xs text-muted-foreground mb-2"><span>Progresso</span><span>{progress}%</span></div><Progress value={progress} className="h-1.5" /></div>
    <div className="flex items-center justify-between">{link ? <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary"><ExternalLink className="h-4 w-4" />Abrir materiais</a> : <span className="text-xs text-muted-foreground">Sem link de material</span>}{!item.source_meeting_id && <Button variant="ghost" size="icon" disabled={disabled} onClick={onDelete} aria-label={`Excluir ${item.title}`}><Trash2 className="h-4 w-4" /></Button>}</div>
  </article>;
}
