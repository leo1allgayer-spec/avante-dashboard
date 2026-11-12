import { describe, it, expect } from 'vitest';
import { courseAgendaMeetings } from './courseAgendaMeetings';
import type { CourseBooking } from '@/hooks/clients/useCourseBookings';
const booking = (patch: Partial<CourseBooking> = {}): CourseBooking => ({ id:'a',slotId:'s',courseName:'Curso de Meta Ads',instructor:'Nicolas',studentName:'Ana',email:'',phone:'',instagram:'',certificateName:'',date:'2026-11-02',time:'Tarde',status:'confirmed',courseStatus:'a confirmar',createdAt:'',...patch });
describe('course agenda', () => {
 it('groups the class and preserves the actual instructor and canonical course name', () => {
  const rows=courseAgendaMeetings([booking(),booking({id:'b',studentName:'Bia',courseName:'Curso Meta Ads',time:'14:00'})]);
  expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({title:'Curso Meta Ads',date:'2026-11-02',time:'14:00',responsible:'Nicolas',participants:['Nicolas'],status:'pending'});
  expect(rows[0].description).toContain('Ana, Bia');
 });
 it('reflects instructor and date changes and keeps different teachers separate', () => {
  const rows=courseAgendaMeetings([booking(),booking({id:'b',instructor:'Henrique'}),booking({id:'c',date:'2026-11-03'})]);
  expect(rows).toHaveLength(3);expect(rows[1].responsible).toBe('Henrique');expect(rows[2].date).toBe('2026-11-03');
 });
 it('excludes cancelled and absent bookings and preserves explicit completion', () => {
  expect(courseAgendaMeetings([booking({status:'cancelled'}),booking({courseStatus:'faltou'})])).toHaveLength(0);
  expect(courseAgendaMeetings([booking({courseStatus:'concluído'})])[0].status).toBe('completed');
 });
 it('does not invent an instructor and identifies online courses', () => {
  const [row]=courseAgendaMeetings([booking({instructor:undefined,courseName:'Curso Meta Ads Online'})]);
  expect(row.responsible).toBe('');expect(row.description).toContain('Não definido');expect(row.modality).toBe('online');
 });
});
it('includes standalone old enrollments but does not recreate cancelled or duplicate bookings',()=>{
 const enrollment={id:'old',student_name:'Ana',course_type:'meta_ads',date:'2026-11-02',time:'14:00'};
 expect(courseAgendaMeetings([], [enrollment])[0].title).toBe('Curso Meta Ads');
 expect(courseAgendaMeetings([booking()], [enrollment])).toHaveLength(1);
 expect(courseAgendaMeetings([booking({status:'cancelled'})], [enrollment])).toHaveLength(0);
});
