export type DownloadableTaskFile={storage_path:string;file_name:string;size_bytes?:number};
export function taskDownloadName(name:string){return (name.split(/[\\/]/).pop()||'arquivo').replace(/[<>:"|?*\x00-\x1f]/g,'_').replace(/^\.+$/,'arquivo').slice(0,180)||'arquivo';}
export async function fetchTaskFile(db:any,file:DownloadableTaskFile):Promise<Blob>{const {data,error}=await db.storage.from('task-files').download(file.storage_path);if(error||!data)throw new Error(`Não foi possível baixar ${file.file_name}. Tente novamente.`);return data;}
export function saveTaskDownload(blob:Blob,name:string){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=taskDownloadName(name);document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function buildTaskFilesZip(db:any,files:DownloadableTaskFile[],onProgress?:(count:number)=>void){
 const {zipSync}=await import('fflate');const entries:Record<string,Uint8Array>=Object.create(null);const used=new Set<string>();
 for(let index=0;index<files.length;index++){
  const file=files[index];const base=taskDownloadName(file.file_name);let name=base;let suffix=2;const dot=base.lastIndexOf('.');const stem=dot>0?base.slice(0,dot):base;const extension=dot>0?base.slice(dot):'';
  while(used.has(name.toLowerCase()))name=`${stem} (${suffix++})${extension}`;
  used.add(name.toLowerCase());entries[name]=new Uint8Array(await (await fetchTaskFile(db,file)).arrayBuffer());onProgress?.(index+1);
 }
 const bytes=zipSync(entries,{level:0});return new Blob([bytes as BlobPart],{type:'application/zip'});
}
