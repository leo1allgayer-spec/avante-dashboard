import type { CourseBooking } from '@/hooks/clients/useCourseBookings';
import type { Meeting } from '@/types/clients/task';
import { findCourse, courseDisplayName } from '@/constants/courseCatalog';
type LegacyEnrollment = {id:string;student_name:string;course_type:string;date:string;time:string};
const clock = (time: string) => time === 'Manhã' ? '08:30' : time === 'Tarde' ? '14:00' : time.slice(0,5);
export function courseAgendaMeetings(bookings: CourseBooking[], enrollments: LegacyEnrollment[] = []): Meeting[] {
 const identity=(name:string,course:string,date:string,time:string)=>JSON.stringify([name.trim().toLocaleLowerCase('pt-BR'),findCourse(course)?.id||course,date,clock(time)]);
 const booked = new Set(bookings.map(b=>identity(b.studentName,b.courseName,b.date,b.time)));
 const legacy: CourseBooking[] = enrollments.filter(e=>e.date&&e.time&&!booked.has(identity(e.student_name,e.course_type,e.date,e.time))).map(e=>({id:`enrollment-${e.id}`,slotId:'',courseName:courseDisplayName(e.course_type),studentName:e.student_name,date:e.date,time:e.time,status:'confirmed',courseStatus:'a confirmar',email:'',phone:'',instagram:'',certificateName:'',createdAt:''}));
 const groups = new Map<string, { meeting: Meeting; students: Set<string> }>();
 for (const b of [...bookings, ...legacy]) {
  const status = (b.courseStatus || '').toLowerCase();
  if (b.status !== 'confirmed' || ['cancelado', 'cancelada', 'faltou', 'não compareceu', 'nao compareceu'].includes(status)) continue;
  const name = courseDisplayName(b.courseName);
  const time = b.time === 'Manhã' ? '08:30' : b.time === 'Tarde' ? '14:00' : b.time.slice(0, 5);
  const completed = ['concluído', 'concluido', 'realizado'].includes(status);
  const key = JSON.stringify([name, b.date, time, b.instructor || '', completed]);
  let group = groups.get(key);
  if (!group) {
   group = { students: new Set(), meeting: {
    id: `course-${b.id}`, agendaCategory: 'geral', title: name, meetingType: 'curso',
    date: b.date, time, responsible: b.instructor || '', professional: b.instructor || '',
    participants: b.instructor ? [b.instructor] : [], description: '',
    status: completed ? 'completed' : 'pending', outcome: null, origin: 'curso', service: '',
    modality: name.toLowerCase().includes('online') ? 'online' : 'presencial', hasClosed: false, source: 'local',
   }};
   groups.set(key, group);
  }
  group.students.add(b.studentName);
 }
 return [...groups.values()].map(({ meeting, students }) => ({ ...meeting, description: `Professor: ${meeting.responsible || 'Não definido'}\nAlunos: ${[...students].join(', ')}` }));
}

