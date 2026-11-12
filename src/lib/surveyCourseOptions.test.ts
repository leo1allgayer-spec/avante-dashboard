import {it,expect} from 'vitest';
import {surveyCourseOption,confirmedCourseAbsence,SURVEY_COURSE_OPTIONS,studentCourseIdentity,confirmedCourseCompletion,courseHasPastSchedule} from './surveyCourseOptions';
it('prefills the actual select value for advanced registrations without changing it to basic',()=>{
 expect(surveyCourseOption('Curso Meta Ads Avançado')).toBe('Curso Meta Ads Avançado');
 expect(surveyCourseOption('Curso de Tráfego Gestor PRO+')).toBe('Curso Meta Ads Avançado');
 expect(surveyCourseOption('Curso de Meta Ads')).toBe('Curso Meta Ads');
 expect(surveyCourseOption('Curso Meta Ads Online')).toBe('Curso Meta Ads Online');
 expect(surveyCourseOption('Desconhecido')).toBe('');
 for(const option of SURVEY_COURSE_OPTIONS)expect(surveyCourseOption(option)).toBe(option);
});
it('only labels a confirmed absence; a pending or confirmed booking does not prove absence',()=>{
 for(const status of [null,undefined,'a confirmar','confirmado','concluído'])expect(confirmedCourseAbsence(status)).toBe(false);
 expect(confirmedCourseAbsence('faltou')).toBe(true);
 expect(confirmedCourseAbsence('Não compareceu')).toBe(true);
});
it('marks only active scheduled courses before today as not done',()=>{
 const now=new Date('2026-11-09T12:00:00-03:00');
 expect(courseHasPastSchedule('2026-11-07','confirmed',now)).toBe(true);
 expect(courseHasPastSchedule('2026-11-09','confirmed',now)).toBe(false);
 expect(courseHasPastSchedule('2026-11-10','confirmed',now)).toBe(false);
 expect(courseHasPastSchedule('2026-11-07','cancelled',now)).toBe(false);
});
it('matches Social Midia enrollment to Social Media survey and booking without confusing Meta courses',()=>{
 expect(studentCourseIdentity('Curso de Social Midia')).toBe(studentCourseIdentity('Curso Social Media'));
 expect(studentCourseIdentity('Curso de Social Media')).toBe(studentCourseIdentity('Curso Social Media'));
 expect(studentCourseIdentity('Curso Meta Ads')).not.toBe(studentCourseIdentity('Curso Meta Ads Avançado'));
 expect(studentCourseIdentity('Curso Meta Ads')).not.toBe(studentCourseIdentity('Curso Meta Ads Online'));
 expect(studentCourseIdentity('')).toBe('');
});
it('matches enrolled course aliases to their scheduled and financial names',()=>{
 for(const [enrolled,scheduled] of [
  ['Curso de IA','Curso Inteligência Artificial'],
  ['Curso Canva para Empreendedores','Curso Canva'],
  ['Curso Captacao/Edicao','Curso Captação e Edição de Vídeo'],
  ['Curso de Meta Ads','Curso Meta Ads'],
  ['Curso de Google Ads','Curso Google Ads'],
 ])expect(studentCourseIdentity(enrolled)).toBe(studentCourseIdentity(scheduled));
});
it('recognizes explicit completion without inventing a survey response',()=>{
 expect(confirmedCourseCompletion('concluído')).toBe(true);expect(confirmedCourseCompletion('realizado')).toBe(true);
 for(const status of ['confirmado','a confirmar','faltou',null])expect(confirmedCourseCompletion(status)).toBe(false);
});
