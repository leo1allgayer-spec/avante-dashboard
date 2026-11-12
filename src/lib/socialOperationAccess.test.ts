import { isEditorialPrimary } from "./editorialPermissions";
import { describe, expect, it } from 'vitest';
import { isSocialOperationUser, SOCIAL_OPERATION_PATHS } from './accessControl';
describe('social operations access',()=>{
 it('restricts exactly the two new accounts',()=>{
  expect(isSocialOperationUser(' BeatrizFsAvante@gmail.com ')).toBe(true);
  expect(isSocialOperationUser('avantegabriela51@gmail.com')).toBe(true);
  expect(isSocialOperationUser('digitalavante3@gmail.com')).toBe(false);
  expect(isSocialOperationUser()).toBe(false);
 });
 it('allows shared editorial editing without widening page access',()=>{
  expect(isEditorialPrimary('beatrizfsavante@gmail.com')).toBe(true);
  expect(isEditorialPrimary('avantegabriela51@gmail.com')).toBe(true);
  expect(isEditorialPrimary('outsider@example.com')).toBe(false);
 });
 it('allows only the four requested pages',()=>{
  expect([...SOCIAL_OPERATION_PATHS]).toEqual(['/agenda-geral','/kanban-social-media','/agenda-captacao','/calendario-editorial']);
  for(const path of ['/','/vendas','/contrato-cliente','/gestao-clientes','/kanban-sites','/kanban-crm','/admin-settings']) expect(SOCIAL_OPERATION_PATHS.has(path)).toBe(false);
 });
});
