import { expect,it } from 'vitest';
import { onlineCourseMessage } from '../../supabase/functions/_shared/online-course-message';
import { canonicalizeSaleCategory,isCourseCategory } from '@/constants/serviceCategories';
it('keeps online course details and confirmation link while replacing the physical address',()=>{
 const result=onlineCourseMessage('Olá Ana!\nCurso Meta Ads Online\nData: 28/10 às 14h\n📍 Endereço: https://maps.app.goo.gl/Test\nConfirmar: https://dashboard.test/confirmar-agendamento?id=test');
 expect(result).toContain('Data: 28/10 às 14h');expect(result).toContain('confirmar-agendamento?id=test');expect(result).toContain('Modalidade: online');expect(result).not.toContain('maps.app.goo.gl');expect(result).not.toContain('Endereço:');
});
it('keeps Meta Online distinct from the other Meta products for registrations and finance',()=>{
 expect(canonicalizeSaleCategory('meta ads online')).toBe('Curso Meta Ads Online');expect(isCourseCategory('Curso Meta Ads Online')).toBe(true);expect(canonicalizeSaleCategory('meta ads online')).not.toBe(canonicalizeSaleCategory('meta ads'));
});
