type StudentEdit = { studentName: string; contact: string; email: string; instagram: string; date: string; time: string };
type StudentRow = { id: string; source: 'enrollment' | 'booking'; bookingId?: string; date: string; time: string };

// Persist first; notifications must read the newly saved booking and its new slot.
export async function saveCourseStudent(db: any, row: StudentRow, form: StudentEdit) {
  const rescheduled = row.date !== form.date || row.time !== form.time;
  if (!form.studentName.trim() || !form.date || !form.time.trim()) throw new Error('Informe nome, data e horário.');
  if (row.bookingId) {
    const updates: Record<string, string> = { student_name: form.studentName, phone: form.contact, email: form.email, instagram: form.instagram };
    if (row.date !== form.date) updates.date = form.date;
    if (row.time !== form.time) updates.time = form.time;
    const { error } = await db.rpc('update_course_booking_admin', { p_booking_id: row.bookingId, p_updates: updates });
    if (error) throw new Error(error.message || 'Não foi possível salvar o agendamento.');
  }
  let warning = '';
  if (row.source === 'enrollment') {
    const { error } = await db.from('course_enrollments').update({ student_name: form.studentName, contact: form.contact, email: form.email, instagram: form.instagram, date: form.date, time: form.time }).eq('id', row.id).select('id').single();
    if (error) {
      if (!row.bookingId) throw new Error(error.message || 'Não foi possível salvar a inscrição.');
      warning = 'Agendamento salvo, mas a ficha da inscrição não foi sincronizada.';
    }
  }
  if (rescheduled && row.bookingId) {
    try {
      const { data, error } = await db.functions.invoke('whatsapp-trigger', { body: { bookingId: row.bookingId, rescheduled: true } });
      if (error || data?.error || data?.success !== true || data?.confirmationSent !== true) {
        warning = [warning, 'Data salva, mas o envio da nova data pelo WhatsApp não foi confirmado. Confira o histórico antes de reenviar.'].filter(Boolean).join(' ');
      }
    } catch {
      warning = [warning, 'Data salva, mas não foi possível confirmar o envio pelo WhatsApp. Confira o histórico antes de reenviar.'].filter(Boolean).join(' ');
    }
  } else if (rescheduled && !row.bookingId) {
    warning = 'Inscrição atualizada. Não há um agendamento vinculado para enviar a nova data pelo WhatsApp.';
  }
  return { rescheduled, warning };
}
