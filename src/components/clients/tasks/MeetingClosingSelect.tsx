import {useState} from 'react';
import type {Meeting} from '@/types/clients/task';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {toast} from 'sonner';

export default function MeetingClosingSelect({meeting,onUpdate}:{meeting:Meeting;onUpdate:(meeting:Meeting)=>void|Promise<void>}){
 const [saving,setSaving]=useState(false),[reasonOpen,setReasonOpen]=useState(false),[reason,setReason]=useState('');
 const value=meeting.closingStatus==='not_closed'?'not_closed':meeting.hasClosed||meeting.closingStatus==='closed'?'closed':'pending';
 const save=async(next:'pending'|'closed'|'not_closed',objection='')=>{
  setSaving(true);
  try{await onUpdate({...meeting,closingStatus:next,hasClosed:next==='closed',objection:next==='not_closed'?objection.trim():''});setReasonOpen(false);}
  catch(error){toast.error('Não foi possível salvar o fechamento',{description:(error as Error).message||'Tente novamente.'});}
  finally{setSaving(false);}
 };
 if(meeting.status==='cancelled')return null;
 return <div className="space-y-1 pt-1">
  <label className="block text-[10px] font-medium text-muted-foreground">Fechou na call?
   <select aria-label={'Fechou na call? '+meeting.title} disabled={saving} value={value} className={'mt-1 h-7 w-full min-w-0 rounded-md border bg-background px-1 text-[10px] '+(value==='closed'?'border-emerald-500/40 text-emerald-400':value==='not_closed'?'border-rose-500/40 text-rose-400':'border-border text-foreground')} onChange={event=>{
    const next=event.target.value as 'pending'|'closed'|'not_closed';
    if(next==='not_closed'&&!meeting.objection?.trim()){setReason('');setReasonOpen(true);}else void save(next,meeting.objection||'');
   }}><option value="pending">A verificar</option><option value="closed">Sim — fechou na call</option><option value="not_closed">Não fechou</option></select>
  </label>
  {saving&&<p role="status" className="text-[10px] text-muted-foreground">Salvando…</p>}
  <Dialog open={reasonOpen} onOpenChange={open=>{if(!saving)setReasonOpen(open);}}><DialogContent><DialogHeader><DialogTitle>Por que não fechou?</DialogTitle><DialogDescription>{meeting.title} · registre a objeção para acompanhar os motivos de não fechamento.</DialogDescription></DialogHeader><Textarea aria-label="Motivo do não fechamento" placeholder="Informe a objeção ou motivo" value={reason} onChange={event=>setReason(event.target.value)}/><DialogFooter><Button variant="outline" disabled={saving} onClick={()=>setReasonOpen(false)}>Cancelar</Button><Button disabled={saving||!reason.trim()} onClick={()=>void save('not_closed',reason)}>{saving?'Salvando…':'Marcar como não fechou'}</Button></DialogFooter></DialogContent></Dialog>
 </div>;
}
