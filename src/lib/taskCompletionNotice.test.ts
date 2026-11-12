import {describe,it,expect,vi} from 'vitest';
import {sendTaskCompletion} from '../../supabase/functions/_shared/task-completion-notice';

function fixture({authorized=true,visible=true,phone='5551998119283',claimed=true,status='Concluída'}={}){
 const task={id:'task-1',user_id:'requester-account',assignee_id:'worker-member',completion_version:1,title:'Card vendedor',status};
 const calls:any[]=[];
 const db:any={auth:{getUser:async()=>({data:{user:authorized?{id:'worker-account'}:null}})},from:(table:string)=>{
  let operation='select';const filters:Record<string,unknown>={};
  const query:any={select:()=>query,update:(values:any)=>{operation='update';calls.push({table,values,filters});return query;},insert:async()=>({error:null}),eq:(key:string,value:any)=>{filters[key]=value;return query;},maybeSingle:async()=>{
   if(table==='tasks')return {data:visible?task:null};
   if(table==='task_assignee_directory')return {data:filters.account_id?{display_name:'Nicolas',phone}:{display_name:'Beatriz'}};
   if(table==='task_completion_notifications')return {data:operation==='update'?(claimed?{id:'notice-1'}:null):{status:'sent'}};
   return {data:null};
  },then:(resolve:any)=>Promise.resolve({error:null}).then(resolve)};
  return query;
 }};
 const deliver=vi.fn(async(..._args:any[])=>({accepted:true,deduplicated:false}));
 const request=new Request('https://example.com',{headers:{Authorization:'Bearer session'}});
 const run=()=>sendTaskCompletion(request,db,{taskId:task.id,phone:'attacker-supplied-number'},()=>db,deliver);
 return {run,deliver,calls};
}
describe('task completion WhatsApp',()=>{
 it('notifies the saved requester with a private task link, never the payload recipient',async()=>{
  const f=fixture();expect(await (await f.run()).json()).toMatchObject({sent:true});
  expect(f.deliver).toHaveBeenCalledTimes(1);
  expect(f.deliver.mock.calls[0][1]).toBe('5551998119283');
  expect(f.deliver.mock.calls[0][2]).toContain('Responsável: Beatriz');
  expect(f.deliver.mock.calls[0][2]).toContain('/gestor-tarefas?task=task-1');
 });
 it('does not resend an already claimed notification',async()=>{
  const f=fixture({claimed:false});expect(await (await f.run()).json()).toMatchObject({sent:true});expect(f.deliver).not.toHaveBeenCalled();
 });
 it('rejects unauthorized or inaccessible tasks and never sends for unfinished tasks or missing phones',async()=>{
  for(const options of [{authorized:false},{visible:false},{status:'Revisão'},{phone:''}]){const f=fixture(options);await f.run();expect(f.deliver).not.toHaveBeenCalled();}
 });
});
