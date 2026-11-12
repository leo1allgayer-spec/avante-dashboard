import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { creativeLabRequest } from './data';
import { money, number, pct, SelectFilter } from './shared';
import { metrics, type LabRow, type RawInsight, type ResultKind } from '@/lib/creative-lab/analytics';
import { creativeSalesRoas } from '@/lib/creativeSalesRoas';
import type { Venda } from '@/hooks/useVendas';
import type { CriativoVenda } from '@/hooks/useCriativos';
const palette=['#8b5cf6','#06b6d4','#f59e0b','#10b981'];
export default function DailyChart({rows,accountId,since,until,kind,currency,sales,links,salesReady}:{rows:LabRow[];accountId:string;since:string;until:string;kind:ResultKind;currency:string;sales:Venda[];links:CriativoVenda[];salesReady:boolean}){
 const [metric,setMetric]=useState('results');
 const ids=rows.map(r=>r.id).sort();
 const query=useQuery<{daily:RawInsight[]}>({queryKey:['creative-lab-daily',accountId,since,until,ids],queryFn:()=>creativeLabRequest({action:'daily',accountId,since,until,adIds:ids}),enabled:ids.length>0&&ids.length<=4,staleTime:300000,retry:1});
 const series=useMemo(()=>{
  if(!query.data)return [];
  const byDay=new Map<string,RawInsight[]>();query.data.daily.forEach(raw=>{const date=raw.date_start;if(date)byDay.set(date,[...(byDay.get(date)||[]),raw]);});
  const days=[];const cursor=new Date(since+'T12:00:00Z'),end=new Date(until+'T12:00:00Z');
  while(cursor<=end){const date=cursor.toISOString().slice(0,10),point:Record<string,unknown>={date:date.split('-').reverse().join('/')};const daily=byDay.get(date)||[];
   const attribution=kind==='sales'&&salesReady?creativeSalesRoas(rows.map(r=>({ad_id:r.id,ad_name:r.name,spend:0})),sales,links,date,date):null;
   for(const row of rows){const raw=daily.find(r=>r.ad_id===row.id)||{ad_id:row.id,ad_name:row.name,campaign_id:row.campaignId,campaign_name:row.campaign,spend:0,impressions:0,clicks:0,reach:0,inline_link_clicks:0,actions:[]};point[row.id]=metrics(raw,kind,attribution?.byAd.get(row.id)?.count??null)[metric as keyof ReturnType<typeof metrics>];}
   days.push(point);cursor.setUTCDate(cursor.getUTCDate()+1);
  }
  return days;
 },[query.data,rows,kind,salesReady,sales,links,since,until,metric]);
 const format=(value:number)=>['ctr'].includes(metric)?pct(value):['spend','cpr','cpm'].includes(metric)?money(value,currency):number(value);
 return <section className="min-w-0 rounded-xl border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Evolução diária</h3><SelectFilter label="Indicador do gráfico" value={metric} onChange={setMetric} options={[{value:'results',label:'Resultados por dia'},{value:'spend',label:'Investimento diário'},{value:'cpr',label:'Custo/resultado'},{value:'ctr',label:'CTR'},{value:'cpm',label:'CPM'},{value:'frequency',label:'Frequência'}]}/></div><p className="mt-2 text-xs text-muted-foreground">Até quatro anúncios no mesmo gráfico. Valores ausentes ficam como lacunas. A janela anterior equivalente está no comparador.</p>{query.isPending?<div className="mt-4 h-56 animate-pulse rounded-xl bg-muted/40"/>:query.isError?<p role="alert" className="py-6 text-sm text-amber-500">A Meta não retornou o histórico diário. Verifique as permissões e tente novamente.</p>:<div className="mt-4 h-72 min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={series} margin={{right:15,left:12,bottom:10}}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:10}} minTickGap={35}/><YAxis tick={{fontSize:10}} width={80} tickFormatter={format}/><Tooltip formatter={(value:number)=>format(value)} contentStyle={{background:'hsl(var(--popover))',borderColor:'hsl(var(--border))',borderRadius:12}}/><Legend wrapperStyle={{fontSize:11}}/>{rows.map((r,i)=><Line key={r.id} dataKey={r.id} name={r.name} stroke={palette[i]} dot={false} type="linear" connectNulls={false} strokeWidth={2}/>)}</LineChart></ResponsiveContainer></div>}</section>;
}
