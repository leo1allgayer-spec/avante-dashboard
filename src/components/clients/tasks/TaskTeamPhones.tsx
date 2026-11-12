import {useState} from 'react';
import {TeamMember} from '@/types/clients/task';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {supabaseClients as supabase} from '@/integrations/supabase/clientsClient';
import {toast} from 'sonner';
export function TaskTeamPhones({members,onSaved}:{members:TeamMember[];onSaved:()=>void}){
 const [open,setOpen]=useState(false);const [draft,setDraft]=useState<Record<string,string>>({});const [saving,setSaving]=useState(false);
 const save=async()=>{setSaving(true);try{for(const member of members){const phone=draft[member.id]||'';if(phone!==member.phone){const {error}=await (supabase as any).rpc('set_task_assignee_phone',{p_member:member.id,p_phone:phone});if(error)throw error;}}onSaved();setOpen(false);toast.success('Telefones atualizados');}catch(error){toast.error(error instanceof Error?error.message:'Não foi possível salvar todos os telefones.');}finally{setSaving(false);}};
 return <><Button variant="outline" onClick={()=>{setDraft(Object.fromEntries(members.map(member=>[member.id,member.phone])));setOpen(true);}}>WhatsApp da equipe</Button><Dialog open={open} onOpenChange={value=>{if(!saving)setOpen(value);}}><DialogContent className="max-h-[85dvh] overflow-y-auto" data-lenis-prevent><DialogHeader><DialogTitle>WhatsApp dos responsáveis</DialogTitle></DialogHeader><p className="text-xs text-muted-foreground">Use 55 + DDD + número. Sem telefone, a tarefa é salva e o aviso fica pendente.</p>{members.map(member=><label key={member.id} className="grid grid-cols-[1fr_180px] items-center gap-2 text-sm">{member.name}<Input aria-label={`WhatsApp de ${member.name}`} value={draft[member.id]||''} onChange={event=>setDraft({...draft,[member.id]:event.target.value.replace(/\D/g,'')})} placeholder="55 + DDD + número"/></label>)}<Button onClick={save} disabled={saving}>{saving?'Salvando…':'Salvar telefones'}</Button></DialogContent></Dialog></>;
}
