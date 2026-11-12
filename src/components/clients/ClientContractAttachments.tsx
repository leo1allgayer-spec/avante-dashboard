import { useState } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CONTRACT_BUCKET,CONTRACT_FILE_ACCEPT,uploadClientContract } from '@/lib/clientContractAttachments';
import { Card,CardHeader,CardTitle,CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip,Download } from 'lucide-react';
import { toast } from 'sonner';
type Attachment={id:string;file_name:string;file_path:string;file_size:number;created_at:string};
export function ClientContractAttachments({noteId,allowed}:{noteId?:string;allowed:boolean}){
 const [uploading,setUploading]=useState(false);
 const qc=useQueryClient();
 const key=['client-contract-attachments',noteId];
 const files=useQuery({queryKey:key,enabled:!!noteId&&allowed,queryFn:async()=>{
  const {data,error}=await (supabase as any).from('client_contract_attachments').select('id,file_name,file_path,file_size,created_at').eq('note_id',noteId).order('created_at',{ascending:false});
  if(error)throw error;return (data||[]) as Attachment[];
 }});
 const open=async(file:Attachment)=>{
  const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;
  try{const {data,error}=await supabase.storage.from(CONTRACT_BUCKET).createSignedUrl(file.file_path,60);
   if(error)throw error;
   if(tab)tab.location.href=data.signedUrl;else toast.error('Permita abrir uma nova aba para acessar o contrato.');
  }catch{tab?.close();toast.error('Não foi possível abrir o contrato.');}
 };
 const download=async(file:Attachment)=>{
  try{const {data,error}=await supabase.storage.from(CONTRACT_BUCKET).download(file.file_path);if(error||!data)throw error;
   const url=URL.createObjectURL(data),link=document.createElement('a');link.href=url;link.download=file.file_name;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch{toast.error('Não foi possível baixar o contrato.');}
 };
 return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Paperclip className="h-4 w-4 text-primary"/>Contratos do cliente</CardTitle></CardHeader><CardContent className="space-y-4">
  <Input aria-label="Anexar contrato do cliente" type="file" accept={CONTRACT_FILE_ACCEPT} disabled={!noteId||!allowed||uploading} onChange={async e=>{
   const file=e.target.files?.[0],input=e.target;if(!file||!noteId||uploading)return;
   setUploading(true);try{await uploadClientContract(supabase,noteId,file);await qc.invalidateQueries({queryKey:key});toast.success('Contrato anexado à ficha.');}catch(error){toast.error(error instanceof Error?error.message:'Não foi possível anexar o contrato.');}finally{input.value='';setUploading(false);}
  }}/>
  <p className="text-xs text-muted-foreground">{!allowed?'Seu acesso não permite gerenciar os contratos.':!noteId?'Salve a ficha para anexar os contratos deste cliente.':uploading?'Enviando contrato…':'PDF, Word, JPG ou PNG · até 20 MB por arquivo. Você pode anexar mais de um contrato.'}</p>
  {files.isError?<div role="alert" className="text-sm">Não foi possível carregar os contratos.<Button variant="outline" className="ml-2" onClick={()=>files.refetch()}>Tentar novamente</Button></div>:noteId&&allowed&&files.isLoading?<p className="text-sm text-muted-foreground">Carregando contratos…</p>:(files.data||[]).map(file=><div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="break-all text-sm font-medium">{file.file_name}</p><p className="text-xs text-muted-foreground">{new Date(file.created_at).toLocaleDateString('pt-BR')} · {(file.file_size/1024/1024).toFixed(2)} MB</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>open(file)}>Abrir</Button><Button variant="outline" size="sm" onClick={()=>download(file)}><Download className="mr-1 h-4 w-4"/>Baixar</Button></div></div>)}
 </CardContent></Card>;
}
