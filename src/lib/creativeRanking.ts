export type CreativeResult = {ad_id:string;ad_name:string;campaign_name:string;spend:number;count:number;revenue:number;roas:number|null};
export type CreativeRankingMetric = 'revenue' | 'count' | 'roas' | 'cpa';
export function rankCreatives(rows:CreativeResult[], metric:CreativeRankingMetric) {
 return rows.filter(row=>row.count>0 && (metric !== 'roas' && metric !== 'cpa' || row.spend>0))
  .map(row=>({...row,cpa:row.count>0?row.spend/row.count:null}))
  .sort((a,b)=> (metric==='cpa' ? a.cpa!-b.cpa! : Number(b[metric]??-1)-Number(a[metric]??-1)) || b.revenue-a.revenue || b.count-a.count || a.ad_id.localeCompare(b.ad_id));
}
