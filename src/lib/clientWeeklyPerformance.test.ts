import { expect, it } from 'vitest';
import { campaignWeekData, campaignResultType, creativeLabel, emptyWeekly, resolveWeeklyMetrics, shiftDate, weekMonday, weeklyMetaMetrics, weeklyReportMetrics, weeklyReportPeriod } from './clientWeeklyPerformance';
it('uses Monday-based weeks across month and year boundaries',()=>{
 expect(weekMonday('2026-10-20')).toBe('2026-10-19');
 expect(weekMonday('2027-01-01')).toBe('2026-12-28');
 expect(shiftDate('2026-12-28',6)).toBe('2027-01-03');
});
it('isolates campaign metrics and creatives instead of reusing account totals',()=>{
 const data={weeks:[{date_start:'2026-10-19',spend:'1000'}],campaignWeeks:[{date_start:'2026-10-19',campaign_id:'10',spend:'200',actions:[{action_type:'purchase',value:'4'}],action_values:[{action_type:'purchase',value:'1200'}]},{date_start:'2026-10-19',campaign_id:'20',spend:'800'}],ads:[{date_start:'2026-10-19',campaign_id:'10',ad_name:'Campanha A 🔥',spend:'200'},{date_start:'2026-10-19',campaign_id:'20',ad_name:'Campanha B 🚀',spend:'800'}]};
 expect(campaignWeekData(data,'2026-10-19','10')).toMatchObject({spend:200,purchases:4,revenue:1200,cost_per_purchase:50,roas:6,creative_names:['Campanha A 🔥']});
 expect(campaignWeekData(data,'2026-10-19','account').spend).toBe(1000);
 expect(campaignWeekData(data,'2026-10-19','missing')).toEqual(emptyWeekly());
 expect(campaignResultType({objective:'OUTCOME_SALES'})).toBe('sales');
});
it('keeps attributed sales from reports and computes cost from the displayed revised sales count',()=>{
 expect(weeklyReportMetrics('Investimento: R$ 200,00\nPedidos: 4\nFaturamento: R$ 1.200,00')).toMatchObject({purchases:4,revenue:1200,cost_per_purchase:50,roas:6});
 const row=resolveWeeklyMetrics({...emptyWeekly(),spend:200,purchases:4,cost_per_purchase:50,revenue:1000,roas:5},undefined,{...emptyWeekly(),purchases:2,revenue:2000});
 expect(row.values.cost_per_purchase).toBe(100);
 expect(row.values.roas).toBe(10);
});
it('does not double count overlapping Meta action aliases',()=>{
 const result=weeklyMetaMetrics({spend:'200',actions:[{action_type:'onsite_conversion.messaging_conversation_started_7d',value:'10'},{action_type:'onsite_conversion.total_messaging_connection',value:'12'}],action_values:[{action_type:'omni_purchase',value:'1000'},{action_type:'purchase',value:'1000'}]},[{ad_name:'Oferta 🔥',spend:'10'},{ad_name:'Pausado sem veiculação',spend:'0',impressions:'0'},{ad_name:'Oferta 🔥',spend:'15'}]);
 expect(result).toMatchObject({spend:200,messages:10,cost_per_message:20,roas:5,creative_names:['Oferta 🔥']});
});
it('keeps missing and zero metrics distinct',()=>{
 expect(weeklyMetaMetrics(undefined,[])).toEqual(emptyWeekly());
 expect(weeklyMetaMetrics({spend:'0',actions:[{action_type:'onsite_conversion.messaging_conversation_started_7d',value:'0'}]},[])).toMatchObject({spend:0,messages:0,cost_per_message:null,roas:null});
});
it('recognizes report amounts and exact periods without assigning monthly reports to a week',()=>{
 const text='Período: 12/10/2026 a 18/10/2026\nInvestimento em anúncios: R$ 1.234,50\nMensagens: 1.234\nROAS: 2,50x';
 expect(weeklyReportMetrics(text)).toMatchObject({spend:1234.5,messages:1234,roas:2.5});
 expect(weeklyReportPeriod(text)).toEqual({since:'2026-10-12',until:'2026-10-18'});
 expect(weeklyReportPeriod('Período: outubro')).toBeNull();
 expect(weeklyReportPeriod('Período: 31/02/2026 a 07/03/2026')).toBeNull();
});
it('preserves manual values while filling absent fields and recalculating displayed cost',()=>{
 const meta={...emptyWeekly(),spend:100,messages:10,cost_per_message:10,roas:3};
 const manual={...emptyWeekly(),messages:5,roas:0};
 const row=resolveWeeklyMetrics(meta,undefined,manual);
 expect(row.values).toMatchObject({spend:100,messages:5,cost_per_message:20,roas:0});
 expect(row.sources.roas).toBe('Revisão manual');
 expect(creativeLabel('Criativo ✅ 🚀')).toBe('✅ 🚀');
 expect(creativeLabel('Sem emoji')).toBe('Sem emoji');
});
