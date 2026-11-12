import { expect, it, vi } from 'vitest';
import { saveCourseStudent } from './saveCourseStudent';
const row = { id: 'booking:b1', bookingId: 'b1', source: 'booking' as const, date: '2026-10-30', time: 'Tarde' };
const form = { studentName: 'Aluno', contact: '5551999999999', email: 'test@example.com', instagram: '', date: '2026-11-05', time: 'Tarde' };
function mockDb() {
  return { rpc: vi.fn().mockResolvedValue({ error: null }), functions: { invoke: vi.fn().mockResolvedValue({ data: { success: true, confirmationSent: true } }) } };
}
it('saves the new date before requesting confirmation and new reminders for the same booking', async () => {
  const db = mockDb();
  const result = await saveCourseStudent(db, row, form);
  expect(db.rpc).toHaveBeenCalledWith('update_course_booking_admin', { p_booking_id: 'b1', p_updates: { student_name: form.studentName, phone: form.contact, email: form.email, instagram: '', date: form.date } });
  expect(db.functions.invoke).toHaveBeenCalledWith('whatsapp-trigger', { body: { bookingId: 'b1', rescheduled: true } });
  expect(db.rpc.mock.invocationCallOrder[0]).toBeLessThan(db.functions.invoke.mock.invocationCallOrder[0]);
  expect(result.warning).toBe('');
});
it('does not resend messages for an unchanged schedule', async () => {
  const db = mockDb();
  await saveCourseStudent(db, row, { ...form, date: row.date });
  expect(db.functions.invoke).not.toHaveBeenCalled();
});
it('does not send notifications when saving fails', async () => {
  const db = mockDb(); db.rpc.mockResolvedValue({ error: { message: 'Turno lotado' } });
  await expect(saveCourseStudent(db, row, form)).rejects.toThrow('Turno lotado');
  expect(db.functions.invoke).not.toHaveBeenCalled();
});
it('reports an unconfirmed WhatsApp send without undoing the saved date', async () => {
  const db = mockDb(); db.functions.invoke.mockResolvedValue({ data: { success: true, confirmationSent: false } });
  expect((await saveCourseStudent(db, row, form)).warning).toContain('não foi confirmado');
});
it('reports enrollment-only schedules without inventing a booking or sending to another person', async () => {
  const db = mockDb() as any;
  const single = vi.fn().mockResolvedValue({ error: null });
  db.from = vi.fn(() => ({ update: () => ({ eq: () => ({ select: () => ({ single }) }) }) }));
  const result = await saveCourseStudent(db, { ...row, id: 'e1', source: 'enrollment', bookingId: undefined }, form);
  expect(result.warning).toContain('Não há um agendamento vinculado');
  expect(db.rpc).not.toHaveBeenCalled();
  expect(db.functions.invoke).not.toHaveBeenCalled();
});
