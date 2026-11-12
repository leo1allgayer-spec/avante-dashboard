import { describe, expect, it } from 'vitest';
import { creativeSalesRoas } from './creativeSalesRoas';
import type { Venda } from '@/hooks/useVendas';
import type { CriativoVenda } from '@/hooks/useCriativos';
const sale = (extra:Partial<Venda> = {}) => ({id:'v1',cliente:'Ana',data:'2026-10-14',valor:1000,status:'paga',...extra} as Venda);
const link = (extra:Partial<CriativoVenda> = {}) => ({id:'l1',nome_aluno:'Ana',data:'2026-10-14',valor_curso:1000,status:'paga',codigo:'a1',criativo:'Video',...extra} as CriativoVenda);
const ads = [{ad_id:'a1',ad_name:'Video',spend:200},{ad_id:'a2',ad_name:'Outro',spend:0}];
const calculate = (sales:Venda[], links:CriativoVenda[]) => creativeSalesRoas(ads,sales,links,'2026-10-01','2026-10-31');
describe('ROAS from registered sales',()=>{
 it('uses sale value and ad ID rather than stale creative spend or ROAS',()=>{
  const result=calculate([sale()],[link({valor_ads:999,roas:99})]);
  expect(result.byAd.get('a1')).toEqual({count:1,revenue:1000,roas:5});
  expect(result.byAd.get('a2')?.roas).toBeNull();
 });
 it('excludes cancelled and out of period sales',()=>{
  expect(calculate([sale({status:'cancelada'}),sale({data:'2026-09-30'})],[link()]).byAd.get('a1')?.revenue).toBe(0);
 });
 it('does not reuse a creative registration for another sale',()=>{
  const result=calculate([sale(),sale({id:'v2'})],[link()]);
  expect(result.byAd.get('a1')?.revenue).toBe(1000);
  expect(result.unattributedRevenue).toBe(1000);
 });
 it('avoids assigning ambiguous names and accepts unique legacy names',()=>{
  expect(calculate([sale()],[link({codigo:null,criativo:' video '})]).byAd.get('a1')?.roas).toBe(5);
  expect(calculate([sale()],[link(),link({id:'l2',codigo:'a2'})]).unattributedCount).toBe(1);
 });
});
