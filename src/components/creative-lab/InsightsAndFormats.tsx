import { aggregate, percentChange, type LabRow, type Target } from '@/lib/creative-lab/analytics';
import { formatNames, money, number, pct } from './shared';
export function creativeInsights(rows:LabRow[],target:Target){
 const facts:{id:string;fact:string;suggestion:string|null}[]=[];
 for(const row of rows){
  if(row.diagnosis.rating==='insufficient')continue;
  const peers=rows.filter(p=>p.id!==row.id&&p.objective===row.objective&&p.current.results!=null&&p.current.results>=target.minResults&&p.current.impressions!=null&&p.current.impressions>=target.minImpressions);
  const benchmark=aggregate(peers);
  if(benchmark.cpr!=null&&benchmark.cpr>0&&row.current.cpr!=null){
   const delta=(row.current.cpr-benchmark.cpr)/benchmark.cpr*100;
   facts.push({id:row.id+'-benchmark',fact:row.name+': custo/resultado '+Math.abs(delta).toFixed(1).replace('.',',')+'% '+(delta<=0?'menor':'maior')+' que o custo agregado dos outros anúncios comparáveis deste objetivo.',suggestion:delta>0?'Investigue diferenças de oferta, público e abordagem.':null});
  }
  if(row.diagnosis.fatigue)facts.push({id:row.id+'-fatigue',fact:row.diagnosis.fatigue,suggestion:'Hipótese: perda de aderência criativa. Teste uma variação e verifique o público antes de alterar orçamento.'});
  const growth=percentChange(row.current.cpr,row.previous?.cpr??null);
  if(growth!=null&&growth>=target.changeThreshold&&row.previous?.results!=null&&row.previous.results>=target.minResults)facts.push({id:row.id+'-growth',fact:row.name+': custo/resultado cresceu '+growth.toFixed(1).replace('.',',')+'% na janela atual.',suggestion:'Compare distribuição, volume, oferta e dias do período.'});
  if(row.diagnosis.suggestion)facts.push({id:row.id+'-suggestion',fact:row.name+': '+row.diagnosis.reason,suggestion:row.diagnosis.suggestion});
 }
 return facts.slice(0,8);
}
export default function InsightsAndFormats({rows,target,currency}:{rows:LabRow[];target:Target;currency:string}){
 const facts=creativeInsights(rows,target);
 const formats=new Map<string,LabRow[]>();rows.forEach(r=>{const key=r.objective+'|'+r.format;formats.set(key,[...(formats.get(key)||[]),r]);});
 return <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border bg-card p-5"><h3 className="font-semibold">Insights dos Criativos</h3><p className="mt-1 text-xs text-muted-foreground">Fatos observados e hipóteses separados. A média dos comparáveis é ponderada por resultados, dentro do mesmo objetivo e conta.</p>{facts.length?<ul className="mt-4 space-y-3">{facts.map(f=><li key={f.id} className="rounded-xl border bg-muted/10 p-3 text-xs leading-relaxed"><p><strong>Observação:</strong> {f.fact}</p>{f.suggestion&&<p className="mt-2 text-muted-foreground"><strong>Sugestão para investigar:</strong> {f.suggestion}</p>}</li>)}</ul>:<p className="py-6 text-sm text-muted-foreground">Sem evidência suficiente para novas recomendações. Configure a meta e revise os mínimos de volume.</p>}</section><section className="min-w-0 rounded-2xl border bg-card p-5"><h3 className="font-semibold">Desempenho por formato e objetivo</h3><p className="mt-1 text-xs text-muted-foreground">Cada objetivo fica separado. Formatos dinâmicos ou não identificados não são presumidos como imagem.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-xs"><thead className="text-left text-muted-foreground"><tr>{['Formato / objetivo','Anúncios','Investimento','Resultados','Custo/resultado','CTR'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{[...formats.entries()].map(([key,group])=>{const total=aggregate(group);return <tr key={key} className="border-t"><td className="p-2">{formatNames[group[0].format]||group[0].format}<span className="mt-1 block text-[10px] text-muted-foreground">{group[0].objective||'Objetivo não informado'}</span></td><td className="p-2">{group.length}</td><td className="p-2">{money(total.spend,currency)}</td><td className="p-2">{number(total.results)}</td><td className="p-2">{money(total.cpr,currency)}</td><td className="p-2">{pct(total.ctr)}</td></tr>})}</tbody></table></div><p className="mt-4 text-[10px] text-muted-foreground">A análise soma investimento e resultados compatíveis, sem somar alcance entre anúncios.</p></section></div>;
}
