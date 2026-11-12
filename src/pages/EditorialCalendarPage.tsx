import { useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Download, FolderOpen, LayoutGrid, Plus, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EditorialClients } from '@/components/editorial/EditorialClients';
import { EditorialDayCell } from '@/components/editorial/EditorialDayCell';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { EditorialEditor, editorialSelectClass } from '@/components/editorial/EditorialEditor';
import { useEditorialCalendar } from '@/hooks/useEditorialCalendar';
import { blankEntry, EditorialItem, MONTHS } from '@/lib/editorialCalendar';

export default function EditorialCalendarPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [client, setClient] = useState<string | null>(null);
  const [view, setView] = useState<'folders' | 'calendar'>('calendar');
  const [section, setSection] = useState<'general' | 'ads'>('general');
  const [editing, setEditing] = useState<EditorialItem | null>(null);
  const [deleting, setDeleting] = useState<EditorialItem | null>(null);
  const data = useEditorialCalendar();
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  const selectedFolder = data.folders.find(f => f.id === client);
  const clientItems = data.items.filter(i => i.folder_id === client);
  const monthItems = clientItems.filter(i => i.publication_date.startsWith(key));
  const general = monthItems.filter(i => i.section === 'general');
  const ads = monthItems.filter(i => i.section === 'ads');
  const visible = section === 'general' ? general : ads;
  const published = general.filter(i => i.published).length;
  const publicationPercent = general.length ? Math.round(published / general.length * 100) : 0;
  const metrics = [ ['Conteúdos', general.length], ['Captações realizadas', `${general.filter(i => i.captured).length}/${general.length}`], ['Editados', `${general.filter(i => i.edited).length}/${general.length}`], ['Aprovados', `${general.filter(i => i.approval === 'approved').length}/${general.length}`], ['Publicados', `${general.filter(i => i.published).length}/${general.length}`], ['Para anúncios', ads.length] ];
  const canEdit = (item: EditorialItem) => data.canManageAll || !item.user_id || item.user_id === data.userId;
  const create = (date?: string) => {
    const entry = blankEntry(date || `${key}-${year === now.getFullYear() && month === now.getMonth() ? String(now.getDate()).padStart(2, '0') : '01'}`);
    setEditing({ ...entry, section, folder_id: selectedFolder?.id, client_id: selectedFolder?.client_id || null, client_name: selectedFolder?.name || '' });
  };
  const navigate = (offset: number) => { const next = new Date(year, month + offset, 1); setYear(next.getFullYear()); setMonth(next.getMonth()); };
  const exportPdf = () => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const width = 297, margin = 8, gridTop = 28, gridWidth = width - margin * 2, colWidth = gridWidth / 7;
    const rows = Math.ceil((firstDay + days) / 7), rowHeight = Math.min(34, (190 - gridTop) / rows);
    const colors: Record<string, [number, number, number]> = { Informativo: [219, 234, 254], Institucional: [254, 243, 199], Inspiracional: [237, 233, 254], Comemorativo: [254, 226, 226] };
    pdf.setFillColor(18, 28, 52); pdf.rect(0, 0, width, 20, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.text('Calendário editorial', margin, 9);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.text(`${selectedFolder?.name || 'Cliente'} · ${MONTHS[month]} de ${year} · ${monthItems.length} conteúdo(s)`, margin, 15);
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach((day, index) => { pdf.setFillColor(235, 238, 245); pdf.rect(margin + index * colWidth, gridTop, colWidth, 7, 'F'); pdf.setTextColor(65, 75, 95); pdf.setFontSize(8); pdf.text(day, margin + index * colWidth + colWidth / 2, gridTop + 4.5, { align: 'center' }); });
    for (let index = 0; index < rows * 7; index++) {
      const day = index - firstDay + 1, col = index % 7, row = Math.floor(index / 7), x = margin + col * colWidth, y = gridTop + 7 + row * rowHeight;
      pdf.setFillColor(day >= 1 && day <= days ? 250 : 242, day >= 1 && day <= days ? 251 : 244, day >= 1 && day <= days ? 253 : 247); pdf.rect(x, y, colWidth, rowHeight, 'F'); pdf.setDrawColor(205, 211, 222); pdf.rect(x, y, colWidth, rowHeight, 'S');
      if (day < 1 || day > days) continue;
      pdf.setTextColor(35, 45, 65); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.text(String(day), x + 2, y + 5);
      const date = `${key}-${String(day).padStart(2, '0')}`; const dayItems = monthItems.filter(item => item.publication_date === date);
      let itemY = y + 9;
      dayItems.slice(0, 4).forEach(item => { const fill = colors[item.category] || [229, 231, 235]; pdf.setFillColor(...fill); pdf.roundedRect(x + 1.5, itemY - 3.5, colWidth - 3, 10, 1, 1, 'F'); pdf.setTextColor(35, 40, 55); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(5.6); const title = pdf.splitTextToSize(item.title || 'Sem título', colWidth - 5).slice(0, 2); pdf.text(title, x + 3, itemY, { maxWidth: colWidth - 5 }); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(5); pdf.text(`${item.format || 'Conteúdo'} · ${item.published ? 'Publicado' : item.approval === 'approved' ? 'Aprovado' : 'Produção'}`, x + 3, itemY + 6.5); itemY += 11; });
      if (dayItems.length > 4) { pdf.setTextColor(90, 100, 120); pdf.setFontSize(5.5); pdf.text(`+ ${dayItems.length - 4} conteúdo(s)`, x + 3, y + rowHeight - 3); }
    }
    pdf.setTextColor(100, 110, 125); pdf.setFontSize(7); pdf.text(`Geral: ${general.length} · Para anúncios: ${ads.length} · Publicados: ${published} · Planejamento editorial · Avante Digital`, margin, 204);
    pdf.save(`calendario-${selectedFolder?.name || 'cliente'}-${MONTHS[month]}-${year}.pdf`);
  };
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  if (!client) return <DashboardLayout title="Calendário Editorial" subtitle="Planejamento de Social Media por cliente">
    {data.isLoading ? <p role="status">Carregando clientes...</p> : data.isError ? <div role="alert">Não foi possível carregar. <Button onClick={() => void data.refetch()}>Tentar novamente</Button></div>
      : <EditorialClients folders={data.folders} clients={data.clients} items={data.items} busy={data.addingFolder} onAdd={data.addFolder} onOpen={id => { setClient(id); setView('calendar'); }} />}
  </DashboardLayout>;
  return <DashboardLayout title="Calendário Editorial" subtitle="Planejamento, produção e publicação dos conteúdos de cada cliente">
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Button variant="outline" onClick={() => setClient(null)}><ArrowLeft className="h-4 w-4 mr-2" />Clientes</Button><h2 className="text-xl font-semibold">{selectedFolder?.name}</h2></div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2"><Label htmlFor="calendar-month">Mês</Label><select id="calendar-month" className={editorialSelectClass} value={month} onChange={e => setMonth(Number(e.target.value))}>{MONTHS.map((name, m) => <option key={name} value={m}>{name}</option>)}</select></div>
        <div className="space-y-2 w-28"><Label htmlFor="calendar-year">Ano</Label><Input id="calendar-year" type="number" min="2000" max="2100" value={year} onChange={e => { const n = Number(e.target.value); if (n >= 2000 && n <= 2100) setYear(n); }} /></div>
        <Button variant="outline" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}>Mês atual</Button><Button variant="ghost" size="icon" aria-label="Atualizar calendário" disabled={data.isFetching} onClick={() => void data.refetch()}><RefreshCw className={`h-4 w-4 ${data.isFetching ? 'animate-spin' : ''}`} /></Button>
      </div>
      {data.isError ? <div role="alert" className="rounded-xl border border-destructive p-5">Não foi possível carregar o calendário. <Button variant="outline" onClick={() => void data.refetch()}>Tentar novamente</Button></div>
      : data.isLoading ? <p role="status" className="py-12 text-center text-muted-foreground">Carregando calendário...</p> : <>
        <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2">{MONTHS.map((name, m) => {
          const count = clientItems.filter(i => i.publication_date.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`)).length;
          return <button key={name} onClick={() => setMonth(m)} aria-pressed={month === m} className={`rounded-xl border p-3 text-left transition-colors ${month === m ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary/50'}`}><FolderOpen className={`h-5 w-5 mb-2 ${month === m ? 'text-primary' : 'text-muted-foreground'}`} /><span className="block text-sm font-medium">{name}</span><span className="text-xs text-muted-foreground">{count} itens{year === now.getFullYear() && m === now.getMonth() ? ' · atual' : ''}</span></button>;
        })}</div>
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4"><h2 className="font-semibold">{MONTHS[month]} de {year}</h2><div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">{metrics.map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold mt-1">{value}</p></div>)}</div><div className="space-y-2 border-t border-border pt-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">Publicações do mês</span><span>{published} de {general.length} publicados · {publicationPercent}%</span></div><Progress aria-label="Publicações do mês" value={publicationPercent} className="h-2" /><p className="text-xs text-muted-foreground">{general.length ? `Faltam ${general.length - published} conteúdos para publicar. Aprovação e publicação são etapas separadas.` : 'Adicione conteúdos para acompanhar as publicações.'}</p></div></section>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><Button variant={section === 'general' ? 'default' : 'outline'} onClick={() => setSection('general')}><FolderOpen className="h-4 w-4 mr-2" />Geral ({general.length})</Button><Button variant={section === 'ads' ? 'default' : 'outline'} onClick={() => setSection('ads')}><FolderOpen className="h-4 w-4 mr-2" />Para anúncios ({ads.length})</Button></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportPdf} className="gap-2"><Download className="h-4 w-4" />Baixar PDF</Button><Button variant={view === 'folders' ? 'secondary' : 'ghost'} onClick={() => setView('folders')}><LayoutGrid className="h-4 w-4 mr-2" />Pastas</Button><Button variant={view === 'calendar' ? 'secondary' : 'ghost'} onClick={() => setView('calendar')}><CalendarDays className="h-4 w-4 mr-2" />Calendário</Button><Button onClick={() => create()}><Plus className="h-4 w-4 mr-2" />{section === 'ads' ? 'Adicionar materiais' : 'Novo conteúdo'}</Button></div></div>
        {view === 'folders' ? visible.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(item => <EditorialCard key={item.id} item={item} disabled={data.saving || !canEdit(item)} onEdit={() => setEditing(item)} onDelete={() => setDeleting(item)} onCheck={patch => { void data.save(item, patch).catch(() => {}); }} />)}</div>
          : <div className="rounded-xl border border-dashed p-12 text-center"><FolderOpen className="h-9 w-9 mx-auto mb-3 text-muted-foreground" /><h3 className="font-medium">Esta pasta ainda está vazia</h3><p className="text-sm text-muted-foreground mt-2">{section === 'general' ? 'Adicione os conteúdos de Social Media planejados para este mês.' : 'Adicione links e organize os criativos das campanhas.'}</p></div>
        : <section className="rounded-xl border border-border bg-card overflow-hidden"><div className="p-3 flex justify-between items-center"><Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => navigate(-1)}><ChevronLeft /></Button><span className="text-sm font-medium">{MONTHS[month]} · {year}</span><Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => navigate(1)}><ChevronRight /></Button></div>
          <p className="px-4 pb-3 text-xs text-muted-foreground">Escreva diretamente em cada dia. As anotações são salvas ao sair do campo. Use + para adicionar um conteúdo.</p>
          <div className="overflow-x-auto"><div className="min-w-[1050px] grid grid-cols-7">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="p-2 text-center text-xs text-muted-foreground border-b">{d}</div>)}
            {Array.from({ length: Math.ceil((firstDay + days) / 7) * 7 }, (_, index) => {
              const day = index - firstDay + 1;
              if (day < 1 || day > days) return <div key={`empty:${index}`} className="bg-secondary/20 border-b border-r border-border" />;
              const date = `${key}-${String(day).padStart(2, '0')}`;
              return <EditorialDayCell key={`${client}:${date}`} date={date} userId={data.userId} canManageAll={data.canManageAll} note={data.notes.find(n => n.folder_id === client && n.date === date)} items={visible.filter(i => i.publication_date === date)}
                onSave={(body, category) => data.saveNote(client, date, body, category)} onCreate={() => create(date)} onEdit={setEditing} onDelete={setDeleting} busy={data.saving}
                onPublished={(item, published) => { if (canEdit(item) && !data.saving) void data.save(item, { published }).catch(() => {}); }}
                onMove={id => { const item = visible.find(i => i.id === id); if (item && canEdit(item) && !data.saving) void data.save(item, { publication_date: date }).catch(() => {}); }} />;
            })}
          </div></div>
        </section>}

      </>}
    </div>
    {editing && <EditorialEditor key={editing.id || 'new'} item={editing} clients={data.clients.filter(c => c.id === selectedFolder?.client_id)} saving={data.saving} readOnly={!canEdit(editing)} onClose={() => setEditing(null)} onSave={patch => data.save(editing, patch)} />}
    <AlertDialog open={!!deleting} onOpenChange={open => !open && !data.saving && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir este material?</AlertDialogTitle><AlertDialogDescription>O registro “{deleting?.title}” será excluído do calendário. O arquivo do link será preservado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={data.saving}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={data.saving} onClick={e => { e.preventDefault(); if (deleting) void data.remove(deleting).then(() => setDeleting(null)).catch(() => {}); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </DashboardLayout>;
}
