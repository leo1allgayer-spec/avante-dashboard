export async function transferCourseInstructor(db:any,bookingId:string,instructor:string,previousInstructor?:string,date?:string,time?:string,bookingIds?:string[]){
 const {data,error}=await db.rpc(bookingIds?'transfer_selected_course_instructor':'transfer_course_instructor',{p_booking_id:bookingId,p_instructor:instructor,p_expected_instructor:previousInstructor||null,p_expected_date:date||null,p_expected_shift:time||null,...(bookingIds?{p_booking_ids:bookingIds}:{})});
 if(error)throw new Error(error.message||'Não foi possível trocar o professor.');
 if(!data?.changed)return {changed:false,studentCount:data?.studentCount||0,warning:''};
 if(!data.changeId)throw new Error('Troca salva, mas o identificador do aviso não foi retornado. Atualize a agenda antes de tentar novamente.');
 let warning='';
 try{
  const {data:notice,error:noticeError}=await db.functions.invoke('whatsapp-trigger',{body:{action:'course_instructor_change',changeId:data.changeId}});
  if(noticeError||!notice?.sent)warning=notice?.reason||notice?.error||'Professor alterado, mas o aviso por WhatsApp não foi confirmado. Confira o histórico antes de reenviar.';
 }catch{warning='Professor alterado, mas não foi possível confirmar o aviso por WhatsApp. Confira o histórico antes de reenviar.';}
 return {changed:true,studentCount:data.studentCount||0,warning};
}

