export type ResultKind='sales'|'leads'|'messages'|'purchases'|'clicks'|'engagement';
export const resultLabels:Record<ResultKind,string>={sales:'Vendas registradas',leads:'Leads',messages:'Conversas por mensagem',purchases:'Compras atribuídas pela Meta',clicks:'Cliques no link',engagement:'Engajamentos'};
export type Account={id:string;name:string;clientId:string;clientName:string;currency:string;timezone?:string;internal:boolean};
export type RawInsight={ad_id:string;ad_name:string;campaign_id:string;campaign_name:string;adset_id?:string;adset_name?:string;spend?:string|number;impressions?:string|number;clicks?:string|number;reach?:string|number;frequency?:string|number;inline_link_clicks?:string|number;actions?:{action_type:string;value:string}[];date_start?:string;date_stop?:string};
export type AdMedia={adId:string;adName:string;status:string|null;adsetId:string|null;adsetName:string|null;campaignId:string|null;campaignName:string|null;objective:string|null;optimizationGoal:string|null;creativeId:string|null;format:string;thumbnail:string|null;videoUrl:string|null};
export type LabData={account:Account;current:RawInsight[];previous:RawInsight[]|null;metadata:AdMedia[];range:{since:string;until:string;previous:{since:string;until:string};size:number};warnings:string[];fetchedAt:string};
export type Target={cpr:number|null;minImpressions:number;minResults:number;minSpend:number;ctrFloor:number|null;frequencyCeiling:number|null;changeThreshold:number};
export const defaultTarget:Target={cpr:null,minImpressions:1000,minResults:5,minSpend:0,ctrFloor:null,frequencyCeiling:null,changeThreshold:20};
export type Metrics={spend:number|null;impressions:number|null;reach:number|null;frequency:number|null;clicks:number|null;ctr:number|null;cpc:number|null;cpm:number|null;results:number|null;cpr:number|null;conversion:number|null};
export type Rating='excellent'|'good'|'watch'|'optimize'|'insufficient';
export const ratingLabels:Record<Rating,string>={excellent:'Excelente desempenho',good:'Bom desempenho',watch:'Em observação',optimize:'Precisa de otimização',insufficient:'Dados insuficientes'};
export type Diagnosis={rating:Rating;reason:string;fatigue:string|null;facts:string[];suggestion:string|null};
export type LabRow={id:string;name:string;client:string;accountId:string;campaignId:string;campaign:string;adsetId:string;adset:string;objective:string;status:string;format:string;creativeId:string;thumbnail:string|null;videoUrl:string|null;current:Metrics;previous:Metrics|null;revenue:number|null;roas:number|null;diagnosis:Diagnosis;noActivity:boolean};
export function numeric(value:unknown):number|null{if(value==null||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
export const divide=(a:number|null,b:number|null,multiplier=1)=>a!=null&&b!=null&&b>0?a/b*multiplier:null;
export function metaResult(raw:RawInsight,kind:ResultKind):number|null{
 if(kind==='clicks')return numeric(raw.inline_link_clicks);
 if(kind==='sales')return null;
 const keys:Record<string,string[]>={leads:['lead','onsite_conversion.lead_grouped','offsite_conversion.fb_pixel_lead'],messages:['onsite_conversion.messaging_conversation_started_7d','onsite_conversion.total_messaging_connection'],purchases:['omni_purchase','purchase','offsite_conversion.fb_pixel_purchase'],engagement:['post_engagement']};
 if(!Array.isArray(raw.actions))return null;
 for(const key of keys[kind]){const action=raw.actions.find(a=>a.action_type===key);if(action)return numeric(action.value);}
 return 0;
}
export function metrics(raw:RawInsight,kind:ResultKind,sales:number|null=null):Metrics {
 const spend=numeric(raw.spend),impressions=numeric(raw.impressions),clicks=numeric(raw.clicks),reach=numeric(raw.reach);
 const results=kind==='sales'?sales:metaResult(raw,kind);
 return {spend,impressions,clicks,reach,frequency:numeric(raw.frequency)??divide(impressions,reach),ctr:divide(clicks,impressions,100),cpc:divide(spend,clicks),cpm:divide(spend,impressions,1000),results,cpr:divide(spend,results),conversion:divide(results,clicks,100)};
}
export const percentChange=(current:number|null,previous:number|null)=>current!=null&&previous!=null&&previous>0?(current-previous)/previous*100:null;
export function diagnose(current:Metrics,previous:Metrics|null,target:Target,days:number,objectiveKnown:boolean):Diagnosis{
 const facts:string[]=[];
 const volume=(m:Metrics)=>m.impressions!=null&&m.impressions>=target.minImpressions&&m.spend!=null&&m.spend>=target.minSpend&&m.results!=null&&m.results>=target.minResults;
 let fatigue:string|null=null;
 if(previous&&days>=7&&volume(current)&&volume(previous)){
  const ctr=percentChange(current.ctr,previous.ctr),cost=percentChange(current.cpr,previous.cpr),conversion=percentChange(current.conversion,previous.conversion);
  const signals=[ctr!=null&&ctr<=-target.changeThreshold?('CTR caiu '+Math.abs(ctr).toFixed(1).replace('.',',')+'%'):null,cost!=null&&cost>=target.changeThreshold?('custo/resultado subiu '+cost.toFixed(1).replace('.',',')+'%'):null,conversion!=null&&conversion<=-target.changeThreshold?('conversão caiu '+Math.abs(conversion).toFixed(1).replace('.',',')+'%'):null].filter(Boolean);
  if(signals.length>=2)fatigue='Possível fadiga: '+signals.join(' e ')+'. Investigue público, oferta e distribuição; não é confirmação de saturação.';
 }
 const result=(rating:Rating,reason:string,suggestion:string|null=null)=>({rating,reason,fatigue,facts,suggestion});
 if(!objectiveKnown)return result('insufficient','Objetivo da campanha indisponível. Não há contexto suficiente para classificar.');
 if(current.spend==null||current.impressions==null||current.results==null)return result('insufficient','A integração não retornou todas as métricas necessárias.');
 if(current.impressions<target.minImpressions||current.spend<target.minSpend)return result('insufficient','Volume abaixo do mínimo configurado ('+target.minImpressions+' impressões e investimento mínimo).');
 if(current.results<target.minResults){
  if(current.results===0&&target.cpr!=null&&current.spend>=Math.max(target.minSpend,target.cpr*target.minResults))return result('optimize','Sem resultados após investir o equivalente a '+target.minResults+' vezes a meta de custo.','Confira atribuição e rastreamento antes de testar outra variação.');
  return result('insufficient','Menos de '+target.minResults+' resultados; evite concluir que há um vencedor.');
 }
 if(fatigue)return result('optimize','Dois ou mais indicadores perderam eficiência em janelas equivalentes.','Considere testar uma variação e investigar mudanças no público ou na oferta.');
 if(target.ctrFloor!=null&&current.ctr!=null&&current.ctr<target.ctrFloor)return result('optimize','CTR abaixo do piso definido para este cliente.','Revise a abertura, a mensagem e a aderência ao público.');
 if(target.frequencyCeiling!=null&&current.frequency!=null&&current.frequency>target.frequencyCeiling)facts.push('Frequência acima do limite configurado; isoladamente não confirma fadiga.');
 if(target.cpr==null)return result('watch','Volume suficiente, mas falta uma meta de custo por resultado para este cliente.');
 if(current.cpr==null)return result('insufficient','Custo por resultado não calculável.');
 const ratio=current.cpr/target.cpr;
 facts.push('Custo/resultado '+Math.abs((ratio-1)*100).toFixed(1).replace('.',',')+'% '+(ratio<=1?'abaixo':'acima')+' da meta do cliente.');
 if(facts.length>1)return result('watch','Custo disponível, mas a frequência pede acompanhamento.');
 return ratio<=0.8?result('excellent','Custo pelo menos 20% abaixo da meta, com volume mínimo atingido.'):ratio<=1?result('good','Custo dentro da meta, com volume mínimo atingido.'):ratio<=1.2?result('watch','Custo até 20% acima da meta. Acompanhe a estabilidade.'):result('optimize','Custo mais de 20% acima da meta do cliente.','Revise criativo, oferta e público. Não altere orçamento automaticamente.');
}
export function aggregate(rows:LabRow[]):Metrics{
 const sum=(key:keyof Metrics)=>rows.length&&rows.every(r=>r.current[key]!=null)?rows.reduce((s,r)=>s+(r.current[key]||0),0):null;
 const spend=sum('spend'),impressions=sum('impressions'),clicks=sum('clicks'),results=sum('results');
 // Reach and frequency are not additive across ads.
 return {spend,impressions,clicks,results,reach:rows.length===1?rows[0].current.reach:null,frequency:rows.length===1?rows[0].current.frequency:null,ctr:divide(clicks,impressions,100),cpc:divide(spend,clicks),cpm:divide(spend,impressions,1000),cpr:divide(spend,results),conversion:divide(results,clicks,100)};
}
export type Filters={search:string;campaign:string;adset:string;format:string;status:string;objective:string;rating:string;onlySales:boolean;minResults:number};
export const blankFilters:Filters={search:'',campaign:'all',adset:'all',format:'all',status:'all',objective:'all',rating:'all',onlySales:false,minResults:0};
export function filterRows(rows:LabRow[],f:Filters){
 return rows.filter(r=>(r.name+' '+r.campaign+' '+r.client).toLowerCase().includes(f.search.toLowerCase())&&(f.campaign==='all'||r.campaignId===f.campaign)&&(f.adset==='all'||r.adsetId===f.adset)&&(f.format==='all'||r.format===f.format)&&(f.status==='all'||r.status===f.status)&&(f.objective==='all'||r.objective===f.objective)&&(f.rating==='all'||r.diagnosis.rating===f.rating)&&(!f.onlySales||(r.current.results||0)>0)&&(r.current.results||0)>=f.minResults);
}
export function comparisonWarnings(rows:LabRow[]){
 const warnings:string[]=[];
 if(new Set(rows.map(r=>r.objective)).size>1)warnings.push('Objetivos diferentes: os resultados não medem a mesma intenção.');
 if(new Set(rows.map(r=>r.adsetId)).size>1)warnings.push('Conjuntos diferentes: públicos e distribuição podem diferir.');
 if(rows.some(r=>r.diagnosis.rating==='insufficient'))warnings.push('Há anúncios com dados insuficientes; não há base para declarar vencedor.');
 if(rows.some(r=>!r.objective||!r.adsetId))warnings.push('Parte do contexto de objetivo ou público não foi retornada pela integração.');
 if(new Set(rows.map(r=>r.creativeId).filter(Boolean)).size<rows.filter(r=>r.creativeId).length)warnings.push('Há anúncios reutilizando o mesmo criativo; esta comparação é por anúncio.');
 return warnings;
}
