export type WeeklyMetrics={spend:number|null;messages:number|null;cost_per_message:number|null;roas:number|null;purchases:number|null;revenue:number|null;cost_per_purchase:number|null;creative_names:string[]|null};
export type WeeklyOverride=WeeklyMetrics&{client_id:string;week_start:string;report_id:string|null;notes:string;campaign_id?:string};
export const weekMonday=(date:string)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);};
export const shiftDate=(date:string,days:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
export const emptyWeekly=():WeeklyMetrics=>({spend:null,messages:null,cost_per_message:null,roas:null,purchases:null,revenue:null,cost_per_purchase:null,creative_names:null});
const number=(v:unknown)=>v===undefined||v===null||v===''||!Number.isFinite(Number(v))?null:Number(v);
const action=(list:any[]|undefined,keys:string[])=>{for(const key of keys){const value=number(list?.find(a=>a.action_type===key)?.value);if(value!==null)return value;}return null;};
export function weeklyMetaMetrics(insight:any,ads:any[]):WeeklyMetrics{
 if(!insight)return emptyWeekly();
 const spend=number(insight.spend);
 const messages=action(insight.actions,['onsite_conversion.messaging_conversation_started_7d','onsite_conversion.total_messaging_connection']);
 const revenue=action(insight.action_values,['omni_purchase','purchase','offsite_conversion.fb_pixel_purchase']);
 const purchases=action(insight.actions,['omni_purchase','purchase','offsite_conversion.fb_pixel_purchase']);
 const roas=spend!==null&&spend>0&&revenue!==null?revenue/spend:action(insight.purchase_roas,['omni_purchase','purchase']);
 return {spend,messages,purchases,revenue,cost_per_purchase:spend!==null&&purchases!==null&&purchases>0?spend/purchases:null,cost_per_message:spend!==null&&messages!==null&&messages>0?spend/messages:null,roas,creative_names:[...new Set(ads.filter(a=>Number(a.spend)>0||Number(a.impressions)>0).map(a=>String(a.ad_name||a.ad_id)).filter(Boolean))]};
}
const parseNumber=(value:string)=>Number(value.includes(',')?value.replace(/\./g,'').replace(',','.'):value);
export function weeklyReportMetrics(text:string):WeeklyMetrics{
 const clean=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const metric=(label:string)=>{const m=clean.match(new RegExp('(?:^|\\n)\\s*'+label+'\\s*[:：-]\\s*(?:R\\$\\s*)?([\\d.,]+)','i'));return m?number(parseNumber(m[1])):null;};
 const spend=metric('(?:investimento(?: em anuncios)?|gasto(?: em ads| em anuncios)?|valor gasto)');
 const rawMessages=clean.match(/(?:^|\n)\s*(?:mensagens|conversas(?: iniciadas)?)\s*[:：-]\s*([\d.,]+)/i)?.[1];
 const messages=rawMessages?number(Number(rawMessages.replace(/[.,]/g,''))):null;
 const revenue=metric('(?:faturamento|receita)');
 const rawPurchases=clean.match(/(?:^|\n)\s*(?:vendas|compras|pedidos)\s*[:：-]\s*([\d.,]+)/i)?.[1];
 const purchases=rawPurchases?number(Number(rawPurchases.replace(/[.,]/g,''))):null;
 return {spend,messages,purchases,revenue,cost_per_purchase:metric('custo por (?:venda|compra|pedido)')??(spend!==null&&purchases!==null&&purchases>0?spend/purchases:null),cost_per_message:metric('custo por (?:mensagem|conversa)')??(spend!==null&&messages!==null&&messages>0?spend/messages:null),roas:metric('ROAS')??(spend!==null&&spend>0&&revenue!==null?revenue/spend:null),creative_names:null};
}
export function weeklyReportPeriod(text:string){
 const line=text.match(/per[ií]odo\s*:\s*([^\n]+)/i)?.[1];if(!line)return null;
 const dates=[...line.matchAll(/(\d{2})\/(\d{2})\/(\d{4})|(\d{4})-(\d{2})-(\d{2})/g)].map(m=>m[4]?`${m[4]}-${m[5]}-${m[6]}`:`${m[3]}-${m[2]}-${m[1]}`);
 return dates.length===2&&dates.every(d=>{const value=new Date(d+'T12:00:00Z');return Number.isFinite(value.getTime())&&value.toISOString().slice(0,10)===d;})?{since:dates[0],until:dates[1]}:null;
}
export function resolveWeeklyMetrics(meta:WeeklyMetrics,report:WeeklyMetrics|undefined,override:WeeklyMetrics|undefined){
 const values=emptyWeekly(),sources={} as Record<keyof WeeklyMetrics,string>;
 for(const key of Object.keys(values) as (keyof WeeklyMetrics)[]){
  const value=override?.[key]??meta[key]??report?.[key]??null;
  (values as any)[key]=value;
  sources[key]=override?.[key]!=null?'Revisão manual':meta[key]!=null?'Meta':report?.[key]!=null?'Relatório':'Ausente';
 }
 // Recalculate the ratio from the displayed amounts unless the report explicitly supplied it.
 if(override?.cost_per_message==null&&values.spend!==null&&values.messages!==null&&values.messages>0){values.cost_per_message=values.spend/values.messages;sources.cost_per_message='Calculado: gasto ÷ mensagens';}
 if(values.messages===0&&override?.cost_per_message==null)values.cost_per_message=null;
 if(override?.cost_per_purchase==null&&values.spend!==null&&values.purchases!==null&&values.purchases>0){values.cost_per_purchase=values.spend/values.purchases;sources.cost_per_purchase='Calculado: gasto ÷ vendas';}
 if(values.purchases===0&&override?.cost_per_purchase==null)values.cost_per_purchase=null;
 if(override?.roas==null&&values.spend!==null&&values.revenue!==null){
  values.roas=values.spend>0?values.revenue/values.spend:null;
  sources.roas='Calculado: receita ÷ gasto';
 }
 return {values,sources};
}
export function creativeLabel(name:string){return name.match(/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic})*/gu)?.join(' ')||name;}

export function campaignWeekData(data:any,start:string,campaignId:string){
 const insight=campaignId==='account'?data?.weeks?.find((r:any)=>r.date_start===start):data?.campaignWeeks?.find((r:any)=>r.date_start===start&&r.campaign_id===campaignId);
 const ads=(data?.ads||[]).filter((r:any)=>r.date_start===start&&(campaignId==='account'||r.campaign_id===campaignId));
 return weeklyMetaMetrics(insight,ads);
}
export function campaignResultType(campaign:any):'sales'|'messages'{
 return ['OUTCOME_SALES','CONVERSIONS','PRODUCT_CATALOG_SALES'].includes(campaign?.objective)?'sales':'messages';
}
