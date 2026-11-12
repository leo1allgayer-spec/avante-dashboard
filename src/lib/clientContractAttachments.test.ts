// @vitest-environment jsdom
import { expect,it,vi } from 'vitest';
import { uploadClientContract } from './clientContractAttachments';
function db(){const upload=vi.fn().mockResolvedValue({error:null}),remove=vi.fn().mockResolvedValue({error:null}),insert=vi.fn().mockResolvedValue({error:null});return {auth:{getUser:async()=>({data:{user:{id:'manager'}}})},storage:{from:vi.fn(()=>({upload,remove}))},from:vi.fn(()=>({insert})),upload,remove,insert};}
it('stores the real file and metadata under the selected saved sheet',async()=>{
 const mock=db(),file=new File(['contract'],'Cliente contrato.pdf',{type:'application/pdf'});
 await uploadClientContract(mock,'sheet-id',file);
 expect(mock.upload.mock.calls[0][0]).toMatch(/^sheet-id\/[0-9a-f-]+\.pdf$/);
 expect(mock.upload.mock.calls[0][1]).toBe(file);
 expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({note_id:'sheet-id',file_name:'Cliente contrato.pdf',file_size:8,uploaded_by:'manager'}));
});
it('removes the newly uploaded file if linking its metadata fails',async()=>{
 const mock=db();mock.insert.mockResolvedValue({error:new Error('metadata failed')});
 await expect(uploadClientContract(mock,'sheet-id',new File(['pdf'],'Contrato.pdf'))).rejects.toThrow('metadata failed');
 expect(mock.remove).toHaveBeenCalledWith([mock.upload.mock.calls[0][0]]);
});
it('does not create metadata when file upload fails',async()=>{
 const mock=db();mock.upload.mockResolvedValue({error:new Error('upload failed')});
 await expect(uploadClientContract(mock,'sheet-id',new File(['pdf'],'Contrato.pdf'))).rejects.toThrow('upload failed');expect(mock.insert).not.toHaveBeenCalled();
});
it('rejects unsupported and empty files before creating storage objects',async()=>{
 const mock=db();await expect(uploadClientContract(mock,'sheet-id',new File(['html'],'Contrato.html'))).rejects.toThrow('PDF, Word');
 await expect(uploadClientContract(mock,'sheet-id',new File([],'Contrato.pdf'))).rejects.toThrow('20 MB');expect(mock.upload).not.toHaveBeenCalled();
});
