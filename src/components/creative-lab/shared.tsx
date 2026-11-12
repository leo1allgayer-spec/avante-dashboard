import { useState } from 'react';
import { ImageOff, Play, ExternalLink } from 'lucide-react';
import { ratingLabels, type LabRow, type Rating } from '@/lib/creative-lab/analytics';
export const number=(n:number|null|undefined)=>n==null?'—':n.toLocaleString('pt-BR',{maximumFractionDigits:1});
export const pct=(n:number|null|undefined)=>n==null?'—':number(n)+'%';
export const money=(n:number|null|undefined,currency='BRL')=>n==null?'—':n.toLocaleString('pt-BR',{style:'currency',currency,maximumFractionDigits:2});
const colors:Record<Rating,string>={excellent:'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',good:'border-cyan-500/30 bg-cyan-500/10 text-cyan-500',watch:'border-amber-500/30 bg-amber-500/10 text-amber-500',optimize:'border-rose-500/30 bg-rose-500/10 text-rose-500',insufficient:'border-border bg-muted/40 text-muted-foreground'};
export function RatingBadge({row}:{row:LabRow}){return <span title={row.diagnosis.reason} className={'inline-block rounded-full border px-2 py-1 text-[10px] leading-tight '+colors[row.diagnosis.rating]}>{ratingLabels[row.diagnosis.rating]}</span>;}
export function Media({row,large=false}:{row:LabRow;large?:boolean}){
 const [failed,setFailed]=useState(false);
 return <div className={'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/30 '+(large?'aspect-video w-full':'h-14 w-16')}>
 {row.thumbnail&&!failed?<img src={row.thumbnail} alt={'Miniatura de '+row.name} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)} className="h-full w-full object-contain"/>:<div className="flex flex-col items-center gap-1 p-2 text-muted-foreground"><ImageOff className="h-5 w-5"/>{large&&<span className="text-xs">Prévia indisponível na integração</span>}</div>}
 {row.format==='video'&&<Play className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-background/80 p-1"/>}
 </div>;
}
export function VideoLink({row}:{row:LabRow}){return row.videoUrl?<a href={row.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3"/>Abrir vídeo na Meta</a>:null;}
export const formatNames:Record<string,string>={imagem:'Imagem',video:'Vídeo',carrossel:'Carrossel',dinamico:'Dinâmico / múltiplos formatos',nao_informado:'Não informado'};
export function SelectFilter({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}){
 return <label className="min-w-0 space-y-1 text-xs text-muted-foreground">{label}<select aria-label={label} value={value} onChange={e=>onChange(e.target.value)} className="block h-10 w-full min-w-0 max-w-full rounded-lg border bg-background px-2 text-sm text-foreground">{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
