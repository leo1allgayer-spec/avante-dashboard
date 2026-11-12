import {canonicalizeSaleCategory} from '@/constants/serviceCategories';
import {COURSE_CATALOG,findCourse} from '@/constants/courseCatalog';

export const SURVEY_COURSE_OPTIONS=COURSE_CATALOG.map(course=>course.name);

export function surveyCourseOption(value?:string|null){
 if(!value)return '';
 return findCourse(value)?.name||'';
}

export function studentCourseIdentity(value?:string|null){
 if(!value?.trim())return '';
 const course=findCourse(value);if(course)return course.id;
 return canonicalizeSaleCategory(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/\bcurso\b|\bde\b|\btrafego pago\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\bmidia\b/g,'media').replace(/\s+/g,' ').trim();
}

export function confirmedCourseCompletion(courseStatus?:string|null){
 const status=(courseStatus||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 return ['concluido','realizado'].includes(status);
}

// Passing the scheduled date is not evidence that a student was absent.
export function confirmedCourseAbsence(courseStatus?:string|null){
 const status=(courseStatus||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 return ['faltou','nao compareceu'].includes(status);
}

export function courseHasPastSchedule(date?:string|null,bookingStatus?:string|null,now=new Date()){
 if(!date||bookingStatus==='cancelled'||bookingStatus==='canceled')return false;
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(now);
 return /^\d{4}-\d{2}-\d{2}$/.test(date)&&date<today;
}
