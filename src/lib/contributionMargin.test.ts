import { expect, it } from 'vitest';
import { contributionMargin } from './contributionMargin';
it('uses different registered Meta and Google course costs in their delivery period',()=>{
 const result=contributionMargin(1000,[{data:'2026-10-01',comissao_extra:100},{data:'2026-10-15',comissao_extra:200},{data:'2026-09-30',comissao_extra:500}],'2026-10-01','2026-10-31');
 expect(result).toEqual({courseCosts:300,taxes:90,salesCommission:150,margin:460,percentage:46});
});
it('preserves zero costs and negative margins without charging machine fees twice',()=>{
 expect(contributionMargin(1000,[{data:'2026-10-15',comissao_extra:0}],'2026-10-01','2026-10-31').margin).toBe(760);
 expect(contributionMargin(0,[{data:'2026-10-15',comissao_extra:100}],'2026-10-01','2026-10-31')).toMatchObject({margin:-100,percentage:null});
});
