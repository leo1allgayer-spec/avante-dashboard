import { sendWhatsAppOnce } from './whatsapp-dispatch.ts';

export function courseCompletionMessage(name: string) {
  return `🎓 Parabéns pela conclusão do curso, ${name.trim()}! 🚀\n\nA *Avante Digital* agradece pela confiança. Lembre-se de que você ainda conta com *3 meses de suporte* para tirar suas dúvidas.\n\nDesejamos muito sucesso na sua jornada! 💜`;
}

export async function processSurveyCompletionMessages(db: any) {
  const { data: jobs, error } = await db.from('survey_completion_messages').select('survey_id').eq('status', 'pending').order('created_at').limit(20);
  if (error) throw error;
  let processed = 0;
  for (const job of jobs || []) {
    const { data: claim, error: claimError } = await db.from('survey_completion_messages').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('survey_id', job.survey_id).eq('status', 'pending').select('survey_id').maybeSingle();
    if (claimError || !claim) continue;
    try {
      const { data: survey, error: surveyError } = await db.from('survey_responses').select('nome,whatsapp,curso_realizado').eq('id', job.survey_id).single();
      if (surveyError || !survey) throw new Error('Formulário não encontrado');
      let phone = String(survey.whatsapp || '').replace(/\D/g, '');
      if (phone.startsWith('00')) phone = phone.slice(2);
      else if (!String(survey.whatsapp || '').trim().startsWith('+') && [10, 11].includes(phone.length)) phone = '55' + phone;
      if (!/^[1-9][0-9]{7,14}$/.test(phone)) throw new Error('WhatsApp do aluno inválido');
      const message = courseCompletionMessage(survey.nome);
      const result = await sendWhatsAppOnce(db, phone, message, 'customer', 'course_completion', job.survey_id);
      await db.from('survey_completion_messages').update({ status: result.accepted ? 'sent' : 'error', last_error: result.accepted ? null : result.resultText, updated_at: new Date().toISOString() }).eq('survey_id', job.survey_id);
      if (!result.deduplicated) await db.from('whatsapp_message_logs').insert({ booking_id: null, phone, student_name: survey.nome, course_name: survey.curso_realizado || '', message_type: 'course_completion', message_text: message, status: result.accepted ? 'sent' : 'error', error_message: result.accepted ? null : result.resultText, sent_at: result.accepted ? new Date().toISOString() : null });
      processed++;
    } catch (error) {
      await db.from('survey_completion_messages').update({ status: 'error', last_error: error instanceof Error ? error.message : 'Falha no envio', updated_at: new Date().toISOString() }).eq('survey_id', job.survey_id);
    }
  }
  return processed;
}
