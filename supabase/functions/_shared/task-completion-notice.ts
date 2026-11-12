// No recipient or message text is accepted from the browser. Resolve both from the saved task.
export async function sendTaskCompletion(req: Request, db: any, body: any, createUserDb: (authorization: string) => any, deliver: (...args: any[]) => Promise<any>) {
 const json = (value: any, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}});
 const authorization = req.headers.get('Authorization') || '';
 const {data: auth, error: authError} = await db.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
 if (authError || !auth?.user) return json({error: 'Entre novamente para enviar o aviso.'}, 401);
 const {data: task, error} = await createUserDb(authorization).from('tasks').select('*').eq('id', String(body.taskId || '')).maybeSingle();
 if (error || !task) return json({error: 'Tarefa não encontrada ou sem acesso.'}, 403);
 if (task.status !== 'Concluída' || !task.completion_version) return json({sent: false, reason: 'A tarefa ainda não foi concluída.'});
 const {data: requester} = await db.from('task_assignee_directory').select('display_name,phone').eq('account_id', task.user_id).maybeSingle();
 if (!/^55[0-9]{10,11}$/.test(requester?.phone || '')) return json({sent: false, reason: 'WhatsApp de quem solicitou não cadastrado. A conclusão já está salva no dashboard.'});
 const {data: claim, error: claimError} = await db.from('task_completion_notifications').update({status: 'processing', error_message: null}).eq('task_id', task.id).eq('requester_id', task.user_id).eq('completion_version', task.completion_version).eq('status', 'pending').select('id').maybeSingle();
 if (claimError) return json({error: 'Não foi possível reservar o aviso de conclusão.'}, 500);
 if (!claim) {
  const {data: existing} = await db.from('task_completion_notifications').select('status').eq('task_id', task.id).eq('completion_version', task.completion_version).maybeSingle();
  return json({sent: existing?.status === 'sent', reason: existing?.status === 'sent' ? 'Aviso já enviado.' : 'Aviso já processado ou em processamento.'});
 }
 const {data: assignee} = task.assignee_id ? await db.from('task_assignee_directory').select('display_name').eq('member_id', task.assignee_id).maybeSingle() : {data: null};
 const message = ['✅ Sua tarefa está pronta', `Olá, ${requester.display_name}!`, `Tarefa: ${task.title}`, assignee ? `Responsável: ${assignee.display_name}` : '', 'A conclusão foi confirmada no dashboard. Abra a tarefa para conferir os arquivos e os detalhes.', `Abrir tarefa: https://dashboard-avante.pages.dev/gestor-tarefas?task=${task.id}`].filter(Boolean).join('\n');
 try {
  const delivery = await deliver(db, requester.phone, message, 'internal', 'task_completion', `${task.id}:${task.completion_version}`);
  await db.from('task_completion_notifications').update({status: delivery.accepted ? 'sent' : 'error', sent_at: delivery.accepted ? new Date().toISOString() : null, error_message: delivery.accepted ? null : delivery.resultText}).eq('id', claim.id);
  if (!delivery.deduplicated) await db.from('whatsapp_message_logs').insert({booking_id: null, phone: requester.phone, student_name: requester.display_name, course_name: task.title, message_type: 'task_completion', message_text: message, status: delivery.accepted ? 'sent' : 'error', error_message: delivery.accepted ? null : delivery.resultText, sent_at: delivery.accepted ? new Date().toISOString() : null});
  return json({sent: delivery.accepted, reason: delivery.accepted ? undefined : 'O provedor não confirmou o aviso de conclusão.'});
 } catch (error) {
  await db.from('task_completion_notifications').update({status: 'error', error_message: String(error)}).eq('id', claim.id);
  return json({error: 'Tarefa concluída, mas o aviso não foi confirmado.'}, 500);
 }
}
