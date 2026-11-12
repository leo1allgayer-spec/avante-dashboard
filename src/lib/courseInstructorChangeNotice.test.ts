import {it,expect,vi} from 'vitest';
import {sendCourseInstructorChange} from '../../supabase/functions/_shared/course-instructor-change-notice';
function fixture({email='nicolaspatzlaff02@gmail.com',status='pending',teacher='Henrique',claimed=true,accepted=true}={}){
 const updates:any[]=[];
 const event={id:'change-1',course_name:'Curso Meta Ads',course_date:'2026-10-29',shift:'Tarde',old_instructor:'Nicolas',new_instructor:'Henrique',booking_ids:['booking-1','booking-2'],student_names:['Larissa','Vanessa'],status};
 const db:any={auth:{getUser:async()=>({data:{user:{id:'manager',email}}})},from:(table:string)=>{
  let updating=false;let values:any;
  const query:any={select:()=>query,eq:()=>query,in:()=>query,update:(data:any)=>{updating=true;values=data;updates.push(data);return query;},insert:async()=>({error:null}),maybeSingle:async()=>({data:table==='course_instructor_changes'?(updating?(claimed?{id:event.id}:null):event):null,error:null}),then:(resolve:any)=>Promise.resolve({data:table==='course_bookings'?event.booking_ids.map(id=>({id,instructor:teacher,course_name:event.course_name,date:event.course_date,time:'14:00',status:'confirmed',course_status:'confirmado'})):null,error:null}).then(resolve)};
  return query;
 }};
 const deliver=vi.fn(async(..._args:any[])=>({accepted,resultText:accepted?'OK':'Erro',deduplicated:false}));
 const run=()=>sendCourseInstructorChange(new Request('https://example.invalid',{headers:{Authorization:'Bearer session'}}),db,{changeId:event.id,phone:'student-phone'},deliver);
 return {run,deliver,updates};
}
it('sends one internal notice only to the new professor with both students and the saved schedule',async()=>{
 const f=fixture();expect(await (await f.run()).json()).toMatchObject({sent:true});
 expect(f.deliver).toHaveBeenCalledTimes(1);expect(f.deliver.mock.calls[0][1]).toBe('555197152836');
 expect(f.deliver.mock.calls[0][2]).toContain('Larissa, Vanessa');expect(f.deliver.mock.calls[0][2]).toContain('29/10/2026');expect(f.deliver.mock.calls[0][2]).toContain('14:00');
 expect(f.deliver.mock.calls[0][3]).toBe('internal');expect(f.updates).toContainEqual(expect.objectContaining({status:'sent'}));
});
it('does not send duplicate, superseded, unauthorized or already claimed notices',async()=>{
 for(const options of [{status:'sent'},{status:'processing'},{status:'error'},{teacher:'Nicolas'},{email:'beatrizfsavante@gmail.com'},{claimed:false}]){const f=fixture(options);await f.run();expect(f.deliver).not.toHaveBeenCalled();}
});
it('records delivery failure without repeating the transfer or retrying the message',async()=>{
 const f=fixture({accepted:false});expect(await (await f.run()).json()).toMatchObject({sent:false});expect(f.deliver).toHaveBeenCalledTimes(1);expect(f.updates).toContainEqual(expect.objectContaining({status:'error'}));
});
