import { expect, it } from 'vitest';
import { resolveCrmResponsible } from '../../supabase/functions/_shared/crm-assignment';
const team=[{user_id:'lucas-id',name:'Lucas'},{user_id:'ana-id',name:'Ana Carolina'},{user_id:'webster-id',name:'Leonardo webster'}];
it('sends the assigned user identifier rather than just the display name',()=>{
  expect(resolveCrmResponsible(team,'Lucas Pilger')).toBe('lucas-id');
  expect(resolveCrmResponsible(team,'Ana')).toBe('ana-id');
  expect(resolveCrmResponsible(team,'Leonardo Webster')).toBe('webster-id');
});
it('does not silently substitute another person',()=>{
  expect(()=>resolveCrmResponsible(team,'Unknown')).toThrow();
  expect(resolveCrmResponsible(team,'')).toBeNull();
});
