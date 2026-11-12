import { useState } from 'react';
import { EditorialClient, EditorialEntry, EditorialItem, CONTENT_TYPES, safeEditorialUrl } from '@/lib/editorialCalendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export const editorialSelectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
export function EditorialEditor({ item, clients, saving, readOnly, onClose, onSave }: {
  item: EditorialItem; clients: EditorialClient[]; saving: boolean; readOnly: boolean;
  onClose: () => void; onSave: (patch: Partial<EditorialEntry>) => Promise<void>;
}) {
  const [form, setForm] = useState(item);
  const set = <K extends keyof EditorialEntry>(key: K, value: EditorialEntry[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const ads = form.section === 'ads';
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || (!form.client_id && !form.client_name.trim())) { toast.error('Informe o título e o cliente.'); return; }
    if (form.url && !safeEditorialUrl(form.url)) { toast.error('Use um link completo começando por https:// ou http://.'); return; }
    if (ads && !form.url) { toast.error('Informe o link dos materiais.'); return; }
    try {
      await onSave({ title: form.title.trim(), client_id: form.client_id, client_name: form.client_name,
        content_type: form.content_type, publication_date: form.publication_date, url: form.url.trim(), notes: form.notes,
        approval: form.approval, approval_notes: form.approval_notes, published: form.published, creative_count: form.creative_count });
      onClose();
    } catch { /* The mutation displays the error and preserves this form. */ }
  };
  return <Dialog open onOpenChange={open => !open && !saving && onClose()}><DialogContent data-lenis-prevent className="max-h-[90dvh] overflow-y-auto overscroll-contain sm:max-w-xl">
    <DialogHeader><DialogTitle>{item.id ? 'Detalhes' : ads ? 'Adicionar materiais para anúncios' : 'Novo conteúdo'}</DialogTitle>
      <DialogDescription>Organize os conteúdos de Social Media e acompanhe cada etapa.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4"><fieldset disabled={saving || readOnly} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="editorial-title">Título</Label><Input id="editorial-title" required value={form.title} onChange={e => set('title', e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="editorial-client">Cliente</Label><select id="editorial-client" className={editorialSelectClass} value={form.client_id || ''} onChange={e => { const c = clients.find(c => c.id === e.target.value); setForm(p => ({ ...p, client_id: c?.id || null, client_name: c?.name || p.client_name })); }}>
        <option value="">{form.client_name || 'Selecione um cliente'}</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="editorial-date">{ads ? 'Data de referência' : 'Publicação prevista'}</Label><Input id="editorial-date" required type="date" value={form.publication_date} onChange={e => set('publication_date', e.target.value)} /></div>
        {ads ? <div className="space-y-2"><Label htmlFor="editorial-count">Quantidade de criativos</Label><Input id="editorial-count" required type="number" min="0" step="1" value={form.creative_count} onChange={e => set('creative_count', Number(e.target.value))} /></div>
        : <div className="space-y-2"><Label htmlFor="editorial-type">Tipo de conteúdo</Label><select id="editorial-type" className={editorialSelectClass} value={form.content_type} onChange={e => set('content_type', e.target.value)}>{CONTENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>}
      </div>
      <div className="space-y-2"><Label htmlFor="editorial-url">Link {ads ? 'dos materiais' : 'do conteúdo'}</Label><Input id="editorial-url" type="url" required={ads} placeholder="https://drive.google.com/..." value={form.url} onChange={e => set('url', e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="editorial-notes">Observações</Label><Textarea id="editorial-notes" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      {!ads && <><div className="space-y-2"><Label htmlFor="editorial-approval">Aprovação</Label><select id="editorial-approval" className={editorialSelectClass} value={form.approval} onChange={e => set('approval', e.target.value as EditorialEntry['approval'])}><option value="pending">Pendente</option><option value="approved">Aprovado</option><option value="changes">Solicitado ajuste</option></select></div>
        <div className="space-y-2"><Label htmlFor="editorial-adjustments">Observação da aprovação / ajustes</Label><Textarea id="editorial-adjustments" placeholder="Ex.: alterar chamada final do vídeo" value={form.approval_notes} onChange={e => set('approval_notes', e.target.value)} /></div></>}
    </fieldset>
      {!ads && <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"><Checkbox aria-label="Conteúdo já publicado" checked={form.published} disabled={saving || readOnly} onCheckedChange={value => set('published', value === true)} />Conteúdo já publicado</label>}
      {readOnly && <p className="text-sm text-muted-foreground">Somente o responsável por este registro pode alterá-lo.</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Fechar</Button>{!readOnly && <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>}</div>
    </form>
  </DialogContent></Dialog>;
}
