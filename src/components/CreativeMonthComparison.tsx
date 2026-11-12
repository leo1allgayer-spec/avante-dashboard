import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { creativePerformanceQuery } from '@/hooks/useCreativePerformance';
import { useVendas } from '@/hooks/useVendas';
import { useCriativosVendas } from '@/hooks/useCriativos';
import { creativeSalesRoas } from '@/lib/creativeSalesRoas';
import { creativeTrend, type CreativeMonth } from '@/lib/creativeComparison';
import { money } from '@/components/evolution/EvolutionPrimitives';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
type Metric='count'|'revenue'|'roas'|'cpa';
const labels:Record<Metric,string>={count:'Vendas',revenue:'Valor vendido',roas:'ROAS',cpa:'Custo por venda'};
const fmt=(n:number|null,key:Metric)=>n==null?'—':key==='count'?String(n):key==='roas'?n.toLocaleString('pt-BR',{maximumFractionDigits:2})+'x':money(n);
export default function CreativeMonthComparison({months}:{months:CreativeMonth[]}) {
 const queries=useQueries({queries:months.map(month=>creativePerformanceQuery(month))});
 const sales=useVendas(), links=useCriativosVendas();
 const [search,setSearch]=useState(''),[metric,setMetric]=useState<Metric>('count'),[filter,setFilter]=useState('all'),[selected,setSelected]=useState(''),[showAll,setShowAll]=useState(false);
 const ready=queries.every(q=>q.isSuccess)&&sales.isSuccess&&links.isSuccess;
 const failed=queries.some(q=>q.isError)||sales.isError||links.isError;
 const ads=useMemo(()=>[...new Map(queries.flatMap(q=>q.data || []).map(ad=>[ad.ad_id,ad])).values()],[queries]);
 const results=months.map((month,index)=>{
  if(!queries[index].isSuccess || !sales.isSuccess || !links.isSuccess)return null;
  const byId=new Map((queries[index].data || []).map(ad=>[ad.ad_id,ad]));
  const monthAds=ads.map(ad=>({...ad,spend:byId.get(ad.ad_id)?.spend || 0}));
  const attribution=creativeSalesRoas(monthAds,sales.data || [],links.data || [],month.start,month.end);
  return {byId,attribution};
 });
 const list=ads.map(ad=>{
  const cells=results.map(result=>{
   if(!result)return null;
   const sale=result.attribution.byAd.get(ad.ad_id)!;
   const spend=result.byId.get(ad.ad_id)?.spend || 0;
   return {...sale,spend,cpa:sale.count>0&&spend>0?spend/sale.count:null,active:spend>0};
  });
  const latest=cells[cells.length-1],before=cells[cells.length-2];
  const trend=creativeTrend(before?.[metric]??null,latest?.[metric]??null,Boolean(before?.active&&latest?.active));
  return {...ad,cells,trend,latest,totalSales:cells.reduce((sum,c)=>sum+(c?.count || 0),0)};
 }).filter(ad=>`${ad.ad_name} ${ad.campaign_name}`.toLowerCase().includes(search.toLowerCase()) && (filter==='all'||filter==='selling'&&(ad.latest?.count || 0)>0||filter==='up'&&ad.trend.direction==='up'||filter==='down'&&ad.trend.direction==='down'||filter==='stopped'&&ad.cells.length>1&&ad.cells[ad.cells.length-2]?.active&&!ad.latest?.active))
 .sort((a,b)=>metric==='cpa'?(a.latest?.cpa??Infinity)-(b.latest?.cpa??Infinity):Number(b.latest?.[metric]??-1)-Number(a.latest?.[metric]??-1)||b.totalSales-a.totalSales);
 const chosen=list.find(ad=>ad.ad_id===selected)||list[0];
 const chart=months.map((month,i)=>({month:month.label,value:chosen?.cells[i]?.[metric]??null}));
 return <section className="space-y-4 rounded-2xl border bg-card/60 p-4 sm:p-6">
  <div><h2 className="text-base font-semibold">O criativo continua vendendo?</h2><p className="mt-1 text-xs text-muted-foreground">O mesmo ID de anúncio é acompanhado em cada mês. A variação compara os dois últimos meses selecionados. Anúncios diferentes com o mesmo nome não são somados.</p><p className="mt-2 text-xs text-amber-500">O mês atual vai até hoje. Meses anteriores são completos; diferenças de dias e investimento afetam a comparação. Vendas são consideradas pela data do lançamento.</p></div>
  <div className="flex flex-wrap gap-3"><Input className="max-w-xs" aria-label="Buscar no comparativo" placeholder="Criativo ou campanha…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Métrica do comparativo" className="rounded-lg border bg-background p-2 text-sm" value={metric} onChange={e=>setMetric(e.target.value as Metric)}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}{key==='cpa'?' (menor primeiro)':''}</option>)}</select><select aria-label="Filtrar evolução" className="rounded-lg border bg-background p-2 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos os criativos</option><option value="selling">Vendendo no último mês</option><option value="up">Indicador aumentou</option><option value="down">Indicador diminuiu</option><option value="stopped">Sem veiculação no último mês</option></select></div>
  {failed&&<div role="alert" className="rounded-xl border border-amber-500/30 p-4 text-sm text-amber-500">Alguns dados não carregaram. “—” significa indisponível, não zero. <Button variant="outline" size="sm" onClick={()=>{queries.forEach(q=>q.refetch());sales.refetch();links.refetch();}}>Tentar novamente</Button></div>}
  {!ready&&!failed&&<p className="text-sm text-muted-foreground">Carregando os meses selecionados…</p>}
  {chosen&&<div className="min-w-0 rounded-xl border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">Evolução de {labels[metric].toLowerCase()}</h3><select aria-label="Criativo do gráfico mensal" className="max-w-full rounded-lg border bg-background p-2 text-sm sm:max-w-md" value={chosen.ad_id} onChange={e=>setSelected(e.target.value)}>{list.map(ad=><option key={ad.ad_id} value={ad.ad_id}>{ad.ad_name} · {ad.campaign_name}</option>)}</select></div><div className="mt-4 h-60"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{left:12,right:20,top:10,bottom:8}}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={n=>fmt(n,metric)} width={85}/><Tooltip formatter={(n:number)=>[fmt(n,metric),labels[metric]]} contentStyle={{background:'hsl(var(--popover))',borderColor:'hsl(var(--border))',borderRadius:12}}/><Line dataKey="value" name={labels[metric]} type="linear" stroke="#8b5cf6" strokeWidth={3} dot={{r:4}} connectNulls={false}/></LineChart></ResponsiveContainer></div></div>}
  <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="p-3">Criativo / campanha</th>{months.map(month=><th key={month.key} className="min-w-40 p-3 capitalize">{month.label}<span className="mt-1 block text-[10px] font-normal">{month.end.slice(8)} dias · {labels[metric]}</span></th>)}<th className="min-w-36 p-3">Variação</th></tr></thead><tbody>{(showAll?list:list.slice(0,10)).map((ad,index)=><tr key={ad.ad_id} className="border-t align-top"><td className="min-w-56 max-w-80 p-3"><button onClick={()=>setSelected(ad.ad_id)} className="break-words text-left font-medium text-primary hover:underline">{index+1}º · {ad.ad_name}</button><p className="mt-1 text-xs text-muted-foreground">{ad.campaign_name}</p></td>{ad.cells.map((cell,i)=><td key={months[i].key} className="p-3"><strong>{fmt(cell?.[metric]??null,metric)}</strong>{cell&&<><p className="mt-1 text-xs text-muted-foreground">{cell.count} venda(s) · {money(cell.revenue)}</p><p className="mt-1 text-xs text-muted-foreground">Gasto {money(cell.spend)} · ROAS {fmt(cell.roas,'roas')}</p>{!cell.active&&<p className="mt-1 text-[10px] text-amber-500">Sem investimento retornado</p>}{cell.count>0&&cell.count<3&&<p className="mt-1 text-[10px] text-amber-500">Base pequena</p>}</>}</td>)}<td className="p-3"><span className={ad.trend.direction==='up'?'text-blue-500':ad.trend.direction==='down'?'text-amber-500':'text-muted-foreground'}>{ad.trend.label}</span>{metric==='cpa'&&<p className="mt-1 text-[10px] text-muted-foreground">Para custo/venda, menor é melhor.</p>}</td></tr>)}</tbody></table>{ready&&!list.length&&<p className="p-5 text-sm text-muted-foreground">Nenhum criativo nos filtros selecionados.</p>}</div>
  {list.length>10&&<Button variant="outline" onClick={()=>setShowAll(!showAll)}>{showAll?'Mostrar top 10':`Mostrar todos (${list.length})`}</Button>}
  {results.some(result=>(result?.attribution.unattributedCount || 0)>0)&&<p className="text-xs text-amber-500">Vendas sem vínculo único com os anúncios retornados: {months.map((month,i)=>results[i] ? `${month.label}: ${results[i]!.attribution.unattributedCount}` : `${month.label}: indisponível`).join(' · ')}. Essas vendas não entram nos indicadores por criativo.</p>}
  <p className="text-xs text-muted-foreground">ROAS usa vendas vinculadas ÷ investimento bruto da Meta. Anúncios sem investimento não têm ROAS calculável. Confira os vínculos das vendas e o objetivo da campanha antes de concluir que um anúncio perdeu desempenho.</p>
 </section>;
}
