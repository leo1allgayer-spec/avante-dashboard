export const TASK_FILE_MAX=20*1024*1024;
export const TASK_FILE_TYPES=['image/jpeg','image/png','image/webp','image/gif','application/pdf','video/mp4','audio/mpeg','audio/ogg','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export function validateTaskFile(file:File){if(!TASK_FILE_TYPES.includes(file.type))throw new Error(`Formato não permitido: ${file.name}`);if(!file.size||file.size>TASK_FILE_MAX)throw new Error(`O arquivo ${file.name} precisa ter até 20 MB e não pode estar vazio.`);}
export async function uploadTaskFile(db:any,taskId:string,userId:string,file:File){
 validateTaskFile(file);const suffix=file.name.includes('.')?file.name.split('.').pop()!.replace(/[^a-z0-9]/gi,'').slice(0,10):'bin';const path=`${taskId}/${crypto.randomUUID()}.${suffix}`;
 const uploaded=await db.storage.from('task-files').upload(path,file,{contentType:file.type});if(uploaded.error)throw uploaded.error;
 const saved=await db.from('task_attachments').insert({task_id:taskId,uploaded_by:userId,file_name:file.name.slice(0,255),storage_path:path,mime_type:file.type,size_bytes:file.size});
 if(saved.error){await db.storage.from('task-files').remove([path]);throw saved.error;}
}
