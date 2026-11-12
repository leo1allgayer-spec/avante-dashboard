import {it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {COURSE_CATALOG,BOOKABLE_COURSES,findCourse,courseDisplayName,saleCourseDisplayName,saleCourseFinancialName,normalizeCourseAlias} from './courseCatalog';
import {canonicalizeSaleCategory} from './serviceCategories';
it('gives every existing course alias one stable identity and one displayed name',()=>{
 const owners=new Map<string,string>();
 for(const course of COURSE_CATALOG)for(const alias of [course.id,course.name,course.financialName,...course.aliases]){
  const key=normalizeCourseAlias(alias);const previous=owners.get(key);expect(previous===undefined||previous===course.id).toBe(true);owners.set(key,course.id);
  expect(findCourse(alias)?.id).toBe(course.id);expect(courseDisplayName(alias)).toBe(course.name);
 }
});
it('keeps basic, advanced and online separate, preserves URLs and financial category identities',()=>{
 expect(new Set(['Curso de Meta Ads','Curso Meta Ads Avançado','Curso Meta Ads Online'].map(name=>findCourse(name)?.id)).size).toBe(3);
 expect(BOOKABLE_COURSES).toHaveLength(8);expect(findCourse('Gestor PRO+')?.slug).toBe('gestor-pro');expect(findCourse('Curso Captacao/Edicao')?.slug).toBe('captacao-edicao-video');
 for(const course of COURSE_CATALOG)expect(canonicalizeSaleCategory(course.name)).toBe(course.financialName);
 expect(canonicalizeSaleCategory('Social Media')).toBe('Social Media');expect(saleCourseDisplayName('Social Media')).toBe('Social Media');expect(saleCourseFinancialName('Social Media')).toBe('Social Media');
 expect(courseDisplayName('Curso desconhecido')).toBe('Curso desconhecido');
});
it('keeps the database and Edge catalog generated from the same source',()=>{
 expect(execFileSync(process.execPath,['scripts/sync-course-catalog.mjs','--check'],{encoding:'utf8'})).toContain('copies match');
});
