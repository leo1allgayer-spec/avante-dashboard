import { expect, it } from 'vitest';
import { crmResponsibleName } from '../../supabase/functions/_shared/crm-responsible';
it('uses the assigned person ahead of the organizer',()=>{
  expect(crmResponsibleName({responsible_name:'Ana',owner_name:'Leonardo Webster'})).toBe('Ana');
  expect(crmResponsibleName({responsible:{name:'Ana'},owner:{name:'Leonardo Webster'}})).toBe('Ana');
});
it('does not invent Webster or display an unresolved identifier',()=>{
  expect(crmResponsibleName({})).toBe('');
  expect(crmResponsibleName({responsible:'810891e4-e8cd-4987-8222-6280fbdeb155'})).toBe('');
});
