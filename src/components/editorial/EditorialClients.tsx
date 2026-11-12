import { useState } from 'react';
import { FolderOpen, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EditorialClient, EditorialFolder, EditorialItem } from '@/lib/editorialCalendar';
import { editorialSelectClass } from './EditorialEditor';
export function EditorialClients({ folders, clients, items, busy, onAdd, onOpen }: {
  folders: EditorialFolder[]; clients: EditorialClient[]; items: EditorialItem[]; busy: boolean;
  onAdd: (input: { name: string; client_id: string | null }) => Promise<EditorialFolder>;
  onOpen: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Clientes de Social Media</h2><p className="text-sm text-muted-foreground mt-1">Abra um cliente para organizar seus conteúdos e escrever no calendário.</p></div><Button onClick={() => { setName(''); setClientId(''); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Adicionar cliente</Button></div>
    <div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar cliente..." aria-label="Buscar cliente" value={search} onChange={e => setSearch(e.target.value)} /></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{folders.filter(f => f.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(folder => <button key={folder.id} onClick={() => onOpen(folder.id)} className="rounded-xl border border-border bg-card p-6 text-left hover:border-primary transition-colors"><FolderOpen className="h-8 w-8 text-primary mb-4" /><h3 className="font-semibold">{folder.name}</h3><p className="text-sm text-muted-foreground mt-2">{items.filter(i => i.folder_id === folder.id).length} conteúdos e materiais</p><span className="block text-xs text-primary mt-4">Abrir calendário →</span></button>)}</div>
    {!folders.length && <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Adicione o primeiro cliente para começar o planejamento.</p>}
    <Dialog open={open} onOpenChange={value => !busy && setOpen(value)}><DialogContent><DialogHeader><DialogTitle>Adicionar cliente ao calendário</DialogTitle><DialogDescription>Selecione um cliente cadastrado ou informe o nome para criar sua pasta de Social Media.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (!name.trim()) return; try { const folder = await onAdd({ name, client_id: clientId || null }); setOpen(false); onOpen(folder.id); } catch { /* Hook displays errors. */ } }}>
      <div className="space-y-2"><Label htmlFor="editorial-existing-client">Cliente cadastrado</Label><select id="editorial-existing-client" className={editorialSelectClass} value={clientId} onChange={e => { setClientId(e.target.value); setName(clients.find(c => c.id === e.target.value)?.name || ''); }}><option value="">Informar nome</option>{clients.filter(c => !folders.some(f => f.client_id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="editorial-folder-name">Nome do cliente</Label><Input id="editorial-folder-name" required value={name} disabled={!!clientId || busy} onChange={e => setName(e.target.value)} /></div><Button type="submit" disabled={busy || !name.trim()}>{busy ? 'Adicionando...' : 'Adicionar e abrir'}</Button>
    </form></DialogContent></Dialog>
  </div>;
}
