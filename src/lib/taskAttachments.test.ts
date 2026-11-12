// @vitest-environment jsdom
import {expect,it,vi} from 'vitest';
import {validateTaskFile,uploadTaskFile,TASK_FILE_MAX} from './taskAttachments';
it('rejects unsafe, empty and oversized files before upload',()=>{
 expect(()=>validateTaskFile(new File(['<script/>'],'x.html',{type:'text/html'}))).toThrow('Formato');
 expect(()=>validateTaskFile(new File([],'x.png',{type:'image/png'}))).toThrow('vazio');
 const file=new File(['a'],'x.png',{type:'image/png'});Object.defineProperty(file,'size',{value:TASK_FILE_MAX+1});expect(()=>validateTaskFile(file)).toThrow('20 MB');
});
it('removes the uploaded object when metadata fails and does not report success',async()=>{
 const upload=vi.fn().mockResolvedValue({error:null});const remove=vi.fn().mockResolvedValue({error:null});const insert=vi.fn().mockResolvedValue({error:new Error('metadata denied')});
 const db={storage:{from:()=>({upload,remove})},from:()=>({insert})};
 await expect(uploadTaskFile(db,'task-id','user-id',new File(['photo'],'photo.png',{type:'image/png'}))).rejects.toThrow('metadata denied');
 expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^task-id\/.+\.png$/)]);
});
