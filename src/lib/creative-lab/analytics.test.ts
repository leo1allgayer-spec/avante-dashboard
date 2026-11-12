import { describe, expect, it } from 'vitest';
import { aggregate, comparisonWarnings, defaultTarget, diagnose, filterRows, metaResult, metrics, type LabRow, type RawInsight } from './analytics';
import { labCsv } from './export';

const raw=(patch:Partial<RawInsight>={}):RawInsight=>({ad_id:'a',ad_name:'Ad',campaign_id:'c',campaign_name:'Campanha',spend:100,impressions:1000,clicks:100,reach:500,actions:[{action_type:'lead',value:'10'}],...patch});
const m=()=>metrics(raw(),'leads');
const row=(patch:Partial<LabRow>={}):LabRow=>({id:'a',name:'Ad',client:'Cliente',accountId:'act_1',campaignId:'c',campaign:'Campanha',adsetId:'set',adset:'Conjunto',objective:'OUTCOME_LEADS',status:'ACTIVE',format:'video',creativeId:'media',thumbnail:null,videoUrl:null,current:m(),previous:m(),revenue:null,roas:null,diagnosis:diagnose(m(),m(),{...defaultTarget,cpr:20},7,true),noActivity:false,...patch});
describe('creative lab result integrity',()=>{
 it('keeps outcomes separate and does not double count overlapping Meta actions',()=>{
  const source=raw({actions:[{action_type:'lead',value:'10'},{action_type:'offsite_conversion.fb_pixel_lead',value:'8'},{action_type:'onsite_conversion.messaging_conversation_started_7d',value:'4'}]});
  expect(metaResult(source,'leads')).toBe(10);
  expect(metaResult(source,'messages')).toBe(4);
  expect(metaResult(source,'sales')).toBeNull();
  expect(metaResult(raw({actions:undefined}),'leads')).toBeNull();
  expect(metaResult(raw({actions:[]}),'leads')).toBe(0);
 });
 it('weights CTR, CPM and cost by volume and never sums unique reach',()=>{
  const total=aggregate([row(),row({id:'b',current:metrics(raw({spend:300,impressions:3000,clicks:0,actions:[{action_type:'lead',value:'30'}]}),'leads')})]);
  expect(total.ctr).toBe(2.5);
  expect(total.cpm).toBe(100);
  expect(total.cpr).toBe(10);
  expect(total.reach).toBeNull();
  expect(total.frequency).toBeNull();
 });
 it('treats missing denominators as unavailable rather than zero',()=>{
  expect(metrics(raw({clicks:0,impressions:0,reach:0}),'leads')).toMatchObject({ctr:null,cpc:null,cpm:null,frequency:null});
 });
});
describe('transparent classifications',()=>{
 it('requires enough volume and an explicit client target',()=>{
  expect(diagnose(metrics(raw({impressions:10}),'leads'),m(),{...defaultTarget,cpr:20},7,true).rating).toBe('insufficient');
  expect(diagnose(m(),null,defaultTarget,7,true).rating).toBe('watch');
  expect(diagnose(m(),null,{...defaultTarget,cpr:20},7,true).rating).toBe('excellent');
  expect(diagnose(m(),null,{...defaultTarget,cpr:5},7,true).rating).toBe('optimize');
  expect(diagnose(m(),null,{...defaultTarget,cpr:20},7,false).rating).toBe('insufficient');
 });
 it('does not infer creative fatigue from frequency alone or small samples',()=>{
  const current={...m(),frequency:10},previous={...m(),frequency:1};
  expect(diagnose(current,previous,{...defaultTarget,cpr:20},7,true).fatigue).toBeNull();
  const worse=metrics(raw({spend:200,clicks:50}),'leads');
  expect(diagnose(worse,m(),{...defaultTarget,cpr:20},7,true).fatigue).toContain('Possível fadiga');
  expect(diagnose(worse,m(),{...defaultTarget,cpr:20},3,true).fatigue).toBeNull();
  expect(diagnose({...worse,results:1},m(),{...defaultTarget,cpr:20},7,true).fatigue).toBeNull();
 });
 it('distinguishes a sufficiently funded no-results ad from tiny samples',()=>{
  const zero=metrics(raw({spend:120,actions:[]}),'leads');
  expect(diagnose(zero,null,{...defaultTarget,cpr:20},7,true).rating).toBe('optimize');
  expect(diagnose({...zero,spend:5},null,{...defaultTarget,cpr:20},7,true).rating).toBe('insufficient');
 });
});
describe('filters, comparison and export',()=>{
 it('combines campaign, format, outcome and classification filters',()=>{
  const filters={search:'ad',campaign:'c',adset:'set',format:'video',status:'ACTIVE',objective:'OUTCOME_LEADS',rating:'excellent',onlySales:true,minResults:5};
  expect(filterRows([row(),row({id:'b',format:'imagem'})],filters).map(r=>r.id)).toEqual(['a']);
 });
 it('warns about incompatible context, missing volume and actual media reuse',()=>{
  expect(comparisonWarnings([row(),row({id:'b',objective:'OUTCOME_TRAFFIC',adsetId:'other'})]).length).toBeGreaterThan(0);
  expect(comparisonWarnings([row({creativeId:''}),row({id:'b',creativeId:''})]).some(w=>w.includes('reutilizando'))).toBe(false);
 });
 it('exports only supplied rows and neutralizes spreadsheet formulas',()=>{
  const csv=labCsv([row({name:'=HYPERLINK("bad")'})],['Período: outubro'],'leads');
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain('Período: outubro');
  expect(csv).toContain('Leads');
 });
});
