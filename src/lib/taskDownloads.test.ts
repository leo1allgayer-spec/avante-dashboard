import {expect,it,vi} from 'vitest';
import {unzipSync,strFromU8} from 'fflate';
import {buildTaskFilesZip,fetchTaskFile,taskDownloadName} from './taskDownloads';
it('preserves both original files with duplicate names in one zip',async()=>{
 const download=vi.fn().mockImplementation(async(path:string)=>({data:new Blob([path]),error:null}));const db={storage:{from:()=>({download})}};const progress=vi.fn();
 const zip=await buildTaskFilesZip(db,[{file_name:'foto.jpeg',storage_path:'first'},{file_name:'foto.jpeg',storage_path:'second'}],progress);
 const files=unzipSync(new Uint8Array(await zip.arrayBuffer()));expect(Object.keys(files)).toEqual(['foto.jpeg','foto (2).jpeg']);expect(strFromU8(files['foto.jpeg'])).toBe('first');expect(strFromU8(files['foto (2).jpeg'])).toBe('second');expect(progress).toHaveBeenLastCalledWith(2);
});
it('fails explicitly if a private file cannot be downloaded',async()=>{
 const db={storage:{from:()=>({download:async()=>({data:null,error:{message:'denied'}})})}};
 await expect(fetchTaskFile(db,{file_name:'card.png',storage_path:'private'})).rejects.toThrow('card.png');
});
it('removes paths and unsafe characters from download names',()=>{expect(taskDownloadName('../../card.png')).toBe('card.png');expect(taskDownloadName('card:1?.jpg')).toBe('card_1_.jpg');});
