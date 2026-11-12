import {useRef,useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {validateTaskFile,TASK_FILE_TYPES} from '@/lib/taskAttachments';
export function TaskFilePicker({files,onChange,disabled=false}:{files:File[];onChange:(files:File[])=>void;disabled?:boolean}){
 const input=useRef<HTMLInputElement>(null);
 const [previews,setPreviews]=useState<Record<number,string>>({});
 useEffect(()=>{const urls:Record<number,string>={};files.forEach((file,index)=>{if(file.type.startsWith('image/'))urls[index]=URL.createObjectURL(file);});setPreviews(urls);return ()=>Object.values(urls).forEach(url=>URL.revokeObjectURL(url));},[files]);
 const add=(incoming:File[])=>{try{incoming.forEach(validateTaskFile);if(files.length+incoming.length>10)throw new Error('Anexe até 10 arquivos por vez.');onChange([...files,...incoming]);}catch(error){alert(error instanceof Error?error.message:String(error));}};
 return <div className="space-y-2" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(!disabled)add(Array.from(event.dataTransfer.files));}} onPaste={event=>{const pasted=Array.from(event.clipboardData.files);if(pasted.length&&!disabled){event.preventDefault();add(pasted);}}}>
 <div tabIndex={0} className="rounded-lg border border-dashed border-border p-3 text-sm"><Button type="button" variant="outline" size="sm" onClick={()=>input.current?.click()} disabled={disabled}>Anexar fotos e arquivos</Button><p className="mt-2 text-xs text-muted-foreground">Arraste arquivos aqui ou clique nesta área e cole imagens com Ctrl+V. Até 10 arquivos, 20 MB cada.</p><input ref={input} aria-label="Fotos e arquivos da tarefa" type="file" multiple accept={TASK_FILE_TYPES.join(',')} className="hidden" disabled={disabled} onChange={event=>{add(Array.from(event.target.files||[]));event.target.value='';}}/></div>
 {files.length>0&&<ul className="max-h-36 overflow-y-auto space-y-1">{files.map((file,index)=><li key={index} className="flex items-center justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2">{previews[index]&&<img src={previews[index]} alt="" className="h-12 w-12 shrink-0 rounded object-cover"/>}<span className="truncate">{file.name} · {(file.size/1024/1024).toFixed(1)} MB</span></span><button type="button" aria-label={`Remover ${file.name}`} disabled={disabled} onClick={()=>onChange(files.filter((_,i)=>i!==index))}>Remover</button></li>)}</ul>}
 </div>;
}
