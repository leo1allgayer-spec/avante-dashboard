import { describe, expect, it } from 'vitest';
import { isEditorialPrimary } from './editorialPermissions';
describe('editorial primary access', () => {
  it('allows only the confirmed primary account', () => {
    expect(isEditorialPrimary('digitalavante3@gmail.com')).toBe(true);
    expect(isEditorialPrimary(' DIGITALAVANTE3@GMAIL.COM ')).toBe(true);
    expect(isEditorialPrimary('digitalavante@gmail.com')).toBe(false);
    expect(isEditorialPrimary('colaborador@example.com')).toBe(false);
    expect(isEditorialPrimary(null)).toBe(false);
    expect(isEditorialPrimary()).toBe(false);
  });
});
