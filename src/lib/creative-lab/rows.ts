import { creativeSalesRoas } from '@/lib/creativeSalesRoas';
import type { Venda } from '@/hooks/useVendas';
import type { CriativoVenda } from '@/hooks/useCriativos';
import { diagnose, metrics, type LabData, type LabRow, type RawInsight, type ResultKind, type Target } from './analytics';
const empty=(id:string,name:string):RawInsight=>({ad_id:id,ad_name:name,campaign_id:'',campaign_name:'',spend:0,impressions:0,clicks:0,reach:0,inline_link_clicks:0,actions:[]});
export function buildLabRows(data:LabData|undefined,kind:ResultKind,target:Target,sales:Venda[],links:CriativoVenda[],salesReady:boolean):LabRow[]{
 if(!data)return [];
 const current=new Map(data.current.map(r=>[r.ad_id,r])),previous=new Map((data.previous||[]).map(r=>[r.ad_id,r])),media=new Map(data.metadata.map(r=>[r.adId,r]));
 const ids=[...new Set([...current.keys(),...previous.keys(),...media.keys()])];
 const ads=ids.map(id=>({ad_id:id,ad_name:current.get(id)?.ad_name||previous.get(id)?.ad_name||media.get(id)?.adName||id,spend:Number(current.get(id)?.spend||0)}));
 const attribution=kind==='sales'&&data.account.internal&&salesReady?creativeSalesRoas(ads,sales,links,data.range.since,data.range.until):null;
 const priorAttribution=attribution&&data.previous?creativeSalesRoas(ads,sales,links,data.range.previous.since,data.range.previous.until):null;
 return ids.map(id=>{
  const meta=media.get(id),now=current.get(id),prior=previous.get(id);
  const name=now?.ad_name||prior?.ad_name||meta?.adName||id;
  const currentMetrics=metrics(now||empty(id,name),kind,attribution?.byAd.get(id)?.count??null);
  const previousMetrics=data.previous?metrics(prior||empty(id,name),kind,priorAttribution?.byAd.get(id)?.count??null):null;
  const revenue=attribution?.byAd.get(id)?.revenue??null;
  return {id,name,client:data.account.clientName,accountId:data.account.id,campaignId:now?.campaign_id||prior?.campaign_id||meta?.campaignId||'',campaign:now?.campaign_name||prior?.campaign_name||meta?.campaignName||'Campanha não informada',adsetId:now?.adset_id||prior?.adset_id||meta?.adsetId||'',adset:now?.adset_name||prior?.adset_name||meta?.adsetName||'Conjunto não informado',objective:meta?.objective||'',status:meta?.status||'UNKNOWN',format:meta?.format||'nao_informado',creativeId:meta?.creativeId||'',thumbnail:meta?.thumbnail||null,videoUrl:meta?.videoUrl||null,current:currentMetrics,previous:previousMetrics,revenue,roas:revenue!=null&&currentMetrics.spend!=null&&currentMetrics.spend>0?revenue/currentMetrics.spend:null,diagnosis:diagnose(currentMetrics,previousMetrics,target,data.range.size,!!meta?.objective),noActivity:!now};
 });
}
