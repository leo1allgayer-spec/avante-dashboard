import {useEffect,useState} from 'react';
import {Task} from '@/types/clients/task';
import {supabaseClients as supabase} from '@/integrations/supabase/clientsClient';
import {Button} from '@/components/ui/button';
import {Check} from 'lucide-react';
import {toast} from 'sonner';

export function TaskCompletionPanel({task,onComplete}:{task:Task|null;onComplete?:(task:Task)=>Promise<void>}){
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState<{status:string}|null>(null);
 const load=async()=>{if(!task)return;const {data}=await (supabase as any).from('task_completion_notifications').select('status').eq('task_id',task.id).order('completion_version',{ascending:false}).limit(1).maybeSingle();setNotice(data);};
 useEffect(()=>{setNotice(null);if(task?.status==='Concluída')void load();},[task?.id,task?.status,task?.completedAt]);
 const complete=async()=>{if(!task||!onComplete||busy)return;setBusy(true);try{await onComplete({...task,status:'Concluída'});await load();}finally{setBusy(false);}};
 const notify=async()=>{if(!task||busy)return;setBusy(true);try{const {data,error}=await supabase.functions.invoke('whatsapp-trigger',{body:{action:'task_completion',taskId:task.id}});if(error||!data?.sent)toast.warning(data?.reason||data?.error||'Aviso não confirmado.');else toast.success('Quem solicitou foi avisado.');await load();}catch{toast.warning('Não foi possível confirmar o aviso.');}finally{setBusy(false);}};
 if(!task)return null;
 return <div className="rounded-lg border border-border p-3 space-y-2">
  {task.status!=='Concluída'?<><p className="text-xs text-muted-foreground">Quando estiver pronta, confirme a conclusão para avisar por WhatsApp quem solicitou.</p>{onComplete&&<Button type="button" disabled={busy} onClick={complete}><Check className="mr-2 h-4 w-4"/>{busy?'Concluindo…':'Concluir e avisar solicitante'}</Button>}</>:<><p className="text-sm font-medium">✓ Tarefa concluída</p><p className="text-xs text-muted-foreground">Aviso ao solicitante: {notice?.status==='sent'?'enviado por WhatsApp':notice?.status==='processing'?'em processamento':notice?.status==='error'?'não confirmado; confira a entrega antes de reenviar':notice?.status==='pending'?'pendente; confira o WhatsApp da equipe':'sem aviso registrado'}</p>{notice?.status==='pending'&&<Button type="button" size="sm" variant="outline" disabled={busy} onClick={notify}>{busy?'Enviando…':'Enviar aviso ao solicitante'}</Button>}</>}
 </div>;
}
