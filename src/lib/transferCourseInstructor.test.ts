import {it,expect,vi} from 'vitest';
import {transferCourseInstructor} from './transferCourseInstructor';
const fixture=()=>({rpc:vi.fn().mockResolvedValue({data:{changed:true,changeId:'change-1',studentCount:2},error:null}),functions:{invoke:vi.fn().mockResolvedValue({data:{sent:true}})}});
it('saves the entire class before requesting only the new instructor notice',async()=>{
 const db=fixture();const result=await transferCourseInstructor(db,'booking-1','Henrique','Nicolas','2026-10-29','14:00');
 expect(db.rpc).toHaveBeenCalledWith('transfer_course_instructor',{p_booking_id:'booking-1',p_instructor:'Henrique',p_expected_instructor:'Nicolas',p_expected_date:'2026-10-29',p_expected_shift:'14:00'});
 expect(db.functions.invoke).toHaveBeenCalledWith('whatsapp-trigger',{body:{action:'course_instructor_change',changeId:'change-1'}});
 expect(db.rpc.mock.invocationCallOrder[0]).toBeLessThan(db.functions.invoke.mock.invocationCallOrder[0]);expect(result).toMatchObject({studentCount:2,changed:true,warning:''});
});
it('does not send for unchanged or failed transfers',async()=>{
 const db=fixture();db.rpc.mockResolvedValueOnce({data:{changed:false} as any,error:null});
 await transferCourseInstructor(db,'booking-1','Nicolas','Nicolas');expect(db.functions.invoke).not.toHaveBeenCalled();
 db.rpc.mockResolvedValueOnce({data:null as any,error:{message:'Indisponível'} as any});await expect(transferCourseInstructor(db,'booking-1','Henrique','Nicolas')).rejects.toThrow('Indisponível');expect(db.functions.invoke).not.toHaveBeenCalled();
});
it('retains the saved transfer and warns if WhatsApp is not confirmed',async()=>{
 const db=fixture();db.functions.invoke.mockResolvedValueOnce({data:{sent:false,reason:'Envio não confirmado'} as any});
 expect(await transferCourseInstructor(db,'booking-1','Henrique','Nicolas')).toMatchObject({changed:true,warning:'Envio não confirmado'});expect(db.rpc).toHaveBeenCalledTimes(1);
});
