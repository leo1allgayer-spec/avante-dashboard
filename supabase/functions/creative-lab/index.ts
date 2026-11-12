import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const allowed=new Set(["digitalavante3@gmail.com","nicolaspatzlaff02@gmail.com","lucadsilva666@gmail.com","leonardowebster.ja@gmail.com"]);
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
class Failure extends Error{constructor(message:string,public status=400){super(message)}}
const metadataCache=new Map<string,{at:number;rows:any[]}>();
function safeImage(value:unknown){if(typeof value!=="string")return null;try{const u=new URL(value);return u.protocol==="https:"&&!u.searchParams.has("access_token")?u.href:null;}catch{return null}}
function formatCreative(creative:any){
 const story=creative?.object_story_spec||{};
 const feed=creative?.asset_feed_spec;
 if(feed&&(feed.images?.length||feed.videos?.length))return "dinamico";
 if(story.link_data?.child_attachments?.length)return "carrossel";
 if(creative?.video_id||story.video_data?.video_id||creative?.object_type==="VIDEO")return "video";
 if(creative?.image_url||story.photo_data||story.link_data?.image_hash||creative?.object_type==="PHOTO")return "imagem";
 return "nao_informado";
}
function dates(since:unknown,until:unknown){
 if(typeof since!=="string"||typeof until!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(since)||!/^\d{4}-\d{2}-\d{2}$/.test(until))throw new Failure("Informe datas válidas.");
 const a=Date.parse(since+"T12:00:00Z"),b=Date.parse(until+"T12:00:00Z");
 if(!Number.isFinite(a)||!Number.isFinite(b)||since>until||b-a>366*86400000)throw new Failure("Selecione até 12 meses em ordem.");
 const size=Math.round((b-a)/86400000)+1;
 const key=(ms:number)=>new Date(ms).toISOString().slice(0,10);
 return {since,until,previous:{since:key(a-size*86400000),until:key(a-86400000)},size};
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 if(req.method!=="POST")return reply({error:"Método não permitido."},405);
 try{
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db=createClient(Deno.env.get("SUPABASE_URL")!,service,{auth:{persistSession:false}});
  const bearer=(req.headers.get("Authorization")||"").replace(/^Bearer /,"");
  const trusted=Boolean(service&&bearer===service);
  const {data:{user},error}=trusted?{data:{user:{email:"service-role"}},error:null}:await db.auth.getUser(bearer);
  if(error||!user)throw new Failure("Entre novamente no dashboard.",401);
  const email=(user.email||"").toLowerCase();
  const restricted=new Set(["beatrizfsavante@gmail.com","avantegabriela51@gmail.com","hjasiulzwicz@gmail.com","emanoelbull@gmail.com"]);
  if(!trusted&&(restricted.has(email)||(user as any).app_metadata?.clients_access==="summary"))throw new Failure("Este perfil não tem acesso à Central de Criativos.",403);
  const canReadClients=trusted||allowed.has(email);
  const body=await req.json().catch(()=>({}));
  const token=Deno.env.get("META_ACCESS_TOKEN")?.trim();
  if(!token)throw new Failure("A conexão Meta não está configurada.",503);
  const version=Deno.env.get("META_API_VERSION")||"v25.0";
  async function graph(path:string,params:Record<string,unknown>={}){
   const url=new URL("https://graph.facebook.com/"+version+"/"+path);
   for(const [k,v]of Object.entries(params))if(v!==undefined)url.searchParams.set(k,String(v));
   const res=await fetch(url,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(25000)});
   const data=await res.json().catch(()=>null);
   if(!res.ok||data?.error)throw new Failure("A Meta não retornou estes dados (código "+(data?.error?.code||res.status)+"). Verifique as permissões da conexão.",502);
   return data;
  }
  async function pages(path:string,params:Record<string,unknown>){
   const rows:any[]=[];let after:string|undefined;
   for(let page=0;page<100;page++){
    const data=await graph(path,{...params,...(after?{after}:{}),limit:100});
    rows.push(...(data.data||[]));
    if(!data.paging?.next)return rows;
    const next=data.paging?.cursors?.after;
    if(!next||next===after)throw new Failure("A consulta paginada da Meta ficou incompleta.",502);
    after=next;
   }
   throw new Failure("Volume grande demais. Reduza o período.",502);
  }
  const configured=Deno.env.get("META_AD_ACCOUNT_ID")?.replace(/^act_/,"");
  const {data:connections,error:connectionError}=await db.from("client_meta_accounts").select("client_id,account_id,account_name,currency,timezone_name");
  if(connectionError)throw new Failure("Não foi possível consultar as contas conectadas.",503);
  const {data:clients}=await db.from("gestao_clients").select("id,name");
  const options:any[]=[];
  if(configured)options.push({id:"act_"+configured,name:"Conta Avante",clientId:"avante",clientName:"Avante Digital",currency:"BRL",timezone:"America/Sao_Paulo",internal:true});
  for(const c of canReadClients?connections||[]:[])if(!options.some(a=>a.id===c.account_id))options.push({id:c.account_id,name:c.account_name,clientId:c.client_id,clientName:clients?.find(x=>x.id===c.client_id)?.name||c.account_name,currency:c.currency,timezone:c.timezone_name,internal:false});
  if(body.action==="accounts")return reply({accounts:options});
  const account=options.find(a=>a.id===body.accountId);
  if(!account)throw new Failure("Selecione uma conta conectada.",403);
  if(["target","save_target"].includes(body.action)){
   const kind=String(body.resultType||"sales");
   if(!["sales","leads","messages","purchases","clicks","engagement"].includes(kind))throw new Failure("Tipo de resultado inválido.");
   if(body.action==="save_target"){
    const t=body.target||{};
    const numeric=(key:string,min:number,max:number)=>{const value=Number(t[key]);if(!Number.isFinite(value)||value<min||value>max)throw new Failure("Revise os limites da meta: "+key);return value};
    const target={account_id:account.id,result_type:kind,cpr:t.cpr==null||t.cpr===""?null:numeric("cpr",0.01,10000000),min_impressions:numeric("minImpressions",1,100000000),min_results:numeric("minResults",1,1000000),min_spend:numeric("minSpend",0,100000000),ctr_floor:t.ctrFloor==null||t.ctrFloor===""?null:numeric("ctrFloor",0,100),frequency_ceiling:t.frequencyCeiling==null||t.frequencyCeiling===""?null:numeric("frequencyCeiling",1,10000),change_threshold:numeric("changeThreshold",1,1000),updated_at:new Date().toISOString()};
    const {error}=await db.from("creative_lab_targets").upsert(target,{onConflict:"account_id,result_type"});
    if(error)throw new Failure("Não foi possível salvar a meta.",503);
   }
   const {data,error}=await db.from("creative_lab_targets").select("*").eq("account_id",account.id).eq("result_type",kind).maybeSingle();
   if(error)throw new Failure("Metas da análise indisponíveis.",503);
   return reply({target:data});
  }
  const range=dates(body.since,body.until);
  const fields="ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,spend,impressions,clicks,reach,frequency,inline_link_clicks,actions,date_start,date_stop";
  const insight=(start:string,end:string,extra:Record<string,unknown>={})=>pages(account.id+"/insights",{fields,level:"ad",time_range:JSON.stringify({since:start,until:end}),...extra});
  if(body.action==="daily"){
   const ids=Array.isArray(body.adIds)?body.adIds.filter((v:unknown)=>typeof v==="string"&&/^\d+$/.test(v as string)):[];
   if(ids.length<1||ids.length>4)throw new Failure("Selecione de 1 a 4 anúncios.");
   const daily=await insight(range.since,range.until,{time_increment:1,filtering:JSON.stringify([{field:"ad.id",operator:"IN",value:ids}])});
   return reply({daily,account,range});
  }
  if(body.action!=="data")throw new Failure("Ação inválida.");
  const warnings:string[]=[];
  async function metadata(ids:string[]){
   if(!ids.length)return [];
   const cacheKey=account.id+ids.slice().sort().join(",");
   const filtering=JSON.stringify([{field:"id",operator:"IN",value:ids}]);
   const cached=metadataCache.get(cacheKey);
   if(cached&&Date.now()-cached.at<600000)return cached.rows;
   const rich="id,name,effective_status,adset{id,name,optimization_goal},campaign{id,name,objective},creative{id,name,thumbnail_url,image_url,video_id,object_type,object_story_spec,asset_feed_spec}";
   let rows:any[];
   try{rows=await pages(account.id+"/ads",{fields:rich,filtering});}
   catch{
    warnings.push("A Meta limitou as informações de mídia. Miniaturas e formatos podem estar indisponíveis.");
    try{rows=await pages(account.id+"/ads",{fields:"id,name,effective_status,adset{id,name,optimization_goal},campaign{id,name,objective},creative{id,thumbnail_url,object_type}",filtering});}
    catch{warnings.push("Status, formato, objetivo e miniaturas não foram autorizados pela Meta.");return [];}
   }
   metadataCache.set(cacheKey,{at:Date.now(),rows});
   return rows;
  }
  const [current,previous]=await Promise.all([insight(range.since,range.until),body.includePrevious===false?Promise.resolve(null):insight(range.previous.since,range.previous.until).catch(()=>{warnings.push("Período anterior indisponível. Diagnóstico histórico e fadiga não serão calculados.");return null})]);
  const ids=[...new Set([...current,...previous||[]].map(ad=>ad.ad_id))];
  const ads=body.includeMetadata===false?[]:await metadata(ids);
  const mapped=ads.map(ad=>({adId:ad.id,adName:ad.name,status:ad.effective_status||null,adsetId:ad.adset?.id||null,adsetName:ad.adset?.name||null,objective:ad.campaign?.objective||null,optimizationGoal:ad.adset?.optimization_goal||null,campaignId:ad.campaign?.id||null,campaignName:ad.campaign?.name||null,creativeId:ad.creative?.id||null,format:formatCreative(ad.creative),thumbnail:safeImage(ad.creative?.thumbnail_url||ad.creative?.image_url),videoUrl:ad.creative?.video_id?"https://www.facebook.com/"+encodeURIComponent(ad.creative.video_id):null}));
  return reply({account,current,previous,metadata:mapped,range,warnings,fetchedAt:new Date().toISOString()});
 }catch(error){return reply({error:error instanceof Failure?error.message:"Falha ao consultar a análise de criativos."},error instanceof Failure?error.status:500);}
});
