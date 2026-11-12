import { expect, it } from 'vitest';
import { buildLabRows } from './rows';
import { defaultTarget, type LabData } from './analytics';

const data:LabData={account:{id:'act_1',name:'Conta',clientId:'1',clientName:'Cliente',currency:'BRL',internal:false},current:[{ad_id:'1',ad_name:'Anúncio',campaign_id:'c',campaign_name:'Campanha',spend:100,impressions:2000,clicks:100,actions:[{action_type:'lead',value:'10'}]}],previous:[],metadata:[{adId:'1',adName:'Anúncio',status:'ACTIVE',adsetId:'a',adsetName:'Conjunto',campaignId:'c',campaignName:'Campanha',objective:'OUTCOME_LEADS',optimizationGoal:null,creativeId:'media',format:'video',thumbnail:null,videoUrl:null}],range:{since:'2026-10-01',until:'2026-10-07',previous:{since:'2026-09-24',until:'2026-09-30'},size:7},warnings:[],fetchedAt:'2026-10-15'};
it('keeps external Meta results separate from internal sales',()=>{
 const row=buildLabRows(data,'leads',{...defaultTarget,cpr:20},[],[],true)[0];
 expect(row.current.results).toBe(10);
 expect(row.revenue).toBeNull();
 expect(row.previous?.results).toBe(0);
 expect(row.diagnosis.rating).toBe('excellent');
 expect(buildLabRows(data,'sales',defaultTarget,[],[],true)[0].current.results).toBeNull();
});
it('preserves unavailable metrics and unavailable history',()=>{
 const row=buildLabRows({...data,current:[{...data.current[0],impressions:undefined}],previous:null},'leads',defaultTarget,[],[],false)[0];
 expect(row.current.impressions).toBeNull();
 expect(row.previous).toBeNull();
 expect(row.diagnosis.rating).toBe('insufficient');
});
it('keeps two ads that reuse the same media as two separate rows',()=>{
 const rows=buildLabRows({...data,current:[...data.current,{...data.current[0],ad_id:'2'}],metadata:[...data.metadata,{...data.metadata[0],adId:'2'}]},'leads',defaultTarget,[],[],true);
 expect(rows.map(r=>r.id)).toEqual(['1','2']);
 expect(rows.map(r=>r.creativeId)).toEqual(['media','media']);
});
