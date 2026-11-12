export const CONTRACT_BUCKET='client-contracts';
export const CONTRACT_FILE_ACCEPT='.pdf,.doc,.docx,.jpg,.jpeg,.png';
const MIME:Record<string,string>={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'};
export async function uploadClientContract(db:any,noteId:string,file:File){
 const extension=file.name.split('.').pop()?.toLowerCase()||'';
 if(!MIME[extension])throw new Error('Envie um contrato em PDF, Word, JPG ou PNG.');
 if(!file.size||file.size>20*1024*1024)throw new Error('O arquivo deve ter entre 1 byte e 20 MB.');
 if(file.name.length>255)throw new Error('Use um nome de arquivo com até 255 caracteres.');
 const {data:auth,error:authError}=await db.auth.getUser();
 if(authError||!auth.user)throw new Error('Entre novamente para anexar o contrato.');
 const path=`${noteId}/${crypto.randomUUID()}.${extension}`;
 const storage=db.storage.from(CONTRACT_BUCKET);
 const {error:uploadError}=await storage.upload(path,file,{contentType:MIME[extension],upsert:false});
 if(uploadError)throw uploadError;
 const {error}=await db.from('client_contract_attachments').insert({note_id:noteId,uploaded_by:auth.user.id,file_name:file.name,file_path:path,mime_type:MIME[extension],file_size:file.size});
 if(error){await storage.remove([path]);throw error;}
}
