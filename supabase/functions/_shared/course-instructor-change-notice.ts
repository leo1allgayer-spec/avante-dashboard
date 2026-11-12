export async function sendCourseInstructorChange(req:Request,db:any,body:any,deliver:(...args:any[])=>Promise<any>){
 const json=(value:any,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}});
 const {data:auth,error:authError}=await db.auth.getUser((req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,''));
 if(authError||!auth?.user)return json({error:'Entre novamente para enviar o aviso.'},401);
 if(!['digitalavante3@gmail.com','nicolaspatzlaff02@gmail.com','lucadsilva666@gmail.com','leonardowebster.ja@gmail.com'].includes((auth.user.email||'').toLowerCase()))return json({error:'Sem permissão para avisar a troca de professor.'},403);
 const {data:change,error}=await db.from('course_instructor_changes').select('*').eq('id',String(body.changeId||'')).maybeSingle();
 if(error||!change)return json({error:'Troca de professor não encontrada.'},404);
 if(change.status==='sent')return json({sent:true,reason:'Aviso já enviado.'});
 if(change.status!=='pending')return json({sent:false,reason:'Aviso já processado ou em processamento. Confira o histórico antes de reenviar.'});
 const {data:bookings,error:bookingError}=await db.from('course_bookings').select('id,instructor,course_name,date,time,status,course_status').in('id',change.booking_ids);
 if(bookingError)return json({error:'Não foi possível conferir a turma atual.'},500);
 const current=(bookings||[]).filter((booking:any)=>booking.status==='confirmed'&&!['cancelado','concluído','concluido','realizado','faltou'].includes(booking.course_status||''));
 const shift=(time:string)=>/^(manhã|manha)$/i.test(time.trim())||(/^\d{2}:\d{2}/.test(time.trim())&&Number(time.trim().slice(0,2))<12)?'Manhã':'Tarde';
 if(!current.length||current.some((booking:any)=>booking.instructor!==change.new_instructor||booking.course_name!==change.course_name||booking.date!==change.course_date||shift(booking.time)!==change.shift)){
  await db.from('course_instructor_changes').update({status:'superseded',error_message:'A turma mudou após esta troca.'}).eq('id',change.id).eq('status','pending');
  return json({sent:false,reason:'Esta troca foi substituída ou a turma foi encerrada. Nenhum aviso antigo foi enviado.'});
 }
 const phones:Record<string,string>={Nicolas:'5551998119283',Henrique:'555197152836'};
 const phone=phones[change.new_instructor];
 if(!phone)return json({error:'Professor sem WhatsApp configurado.'},400);
 const {data:claim,error:claimError}=await db.from('course_instructor_changes').update({status:'processing',error_message:null}).eq('id',change.id).eq('status','pending').select('id').maybeSingle();
 if(claimError)return json({error:'Não foi possível reservar o aviso.'},500);
 if(!claim)return json({sent:false,reason:'Aviso já reservado por outra solicitação.'});
 const date=change.course_date.split('-').reverse().join('/');
 const message=[`📢 Curso atribuído a você — troca de professor`,`Professor: ${change.new_instructor}`,`Curso: ${change.course_name}`,`Data: ${date}`,`Horário: ${change.shift==='Manhã'?'08:30':'14:00'}`,`Alunos: ${change.student_names.join(', ')}`,`Professor anterior: ${change.old_instructor||'Não definido'}`,'Confira a turma no dashboard: https://dashboard-avante.pages.dev/tasks'].join('\n');
 try{
  const delivery=await deliver(db,phone,message,'internal','course_instructor_change',change.id);
  await db.from('course_instructor_changes').update({status:delivery.accepted?'sent':'error',sent_at:delivery.accepted?new Date().toISOString():null,error_message:delivery.accepted?null:delivery.resultText}).eq('id',change.id);
  if(!delivery.deduplicated)await db.from('whatsapp_message_logs').insert({booking_id:change.booking_ids[0],phone,student_name:change.student_names.join(', '),course_name:change.course_name,message_type:'course_instructor_change',message_text:message,status:delivery.accepted?'sent':'error',error_message:delivery.accepted?null:delivery.resultText,sent_at:delivery.accepted?new Date().toISOString():null});
  return json({sent:delivery.accepted,reason:delivery.accepted?undefined:'O provedor não confirmou o aviso ao novo professor.'});
 }catch(error){await db.from('course_instructor_changes').update({status:'error',error_message:String(error)}).eq('id',change.id);return json({error:'Professor alterado, mas o envio não foi confirmado.'},500);}
}
