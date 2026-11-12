import { type LabRow, type ResultKind, resultLabels } from './analytics';
// The built-in PDF font supports Portuguese Latin characters, not emoji glyphs.
export const pdfText=(text:string)=>text.replace(/[—–]/g,'-').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/[^\x20-\xFF\n]/gu,' ').replace(/ {2,}/g,' ').trim();
const safe=(v:unknown)=>{const s=String(v??'');return /^[=+@-]/.test(s)?"'"+s:s;};
export function labCsv(rows:LabRow[],context:string[],kind:ResultKind){
 const escape=(v:unknown)=>'"'+safe(v).replace(/"/g,'""')+'"';
 const numeric=(v:number|null)=>v==null?'':v.toFixed(2).replace('.',',');
 const lines=[...context.map(c=>[c]),['Anúncio ID','Criativo ID','Anúncio','Cliente','Campanha','Conjunto','Formato','Objetivo','Status','Investimento','Impressões','Alcance por anúncio','Frequência','CTR %','CPC','CPM',resultLabels[kind],'Custo/resultado','Classificação','Explicação','Vendas vinculadas - valor','ROAS vendas']];
 for(const r of rows)lines.push([r.id,r.creativeId,r.name,r.client,r.campaign,r.adset,r.format,r.objective,r.status,numeric(r.current.spend),numeric(r.current.impressions),numeric(r.current.reach),numeric(r.current.frequency),numeric(r.current.ctr),numeric(r.current.cpc),numeric(r.current.cpm),numeric(r.current.results),numeric(r.current.cpr),r.diagnosis.rating,r.diagnosis.reason,numeric(r.revenue),numeric(r.roas)]);
 return '\ufeffsep=;\r\n'+lines.map(line=>line.map(escape).join(';')).join('\r\n');
}
export function downloadCsv(rows:LabRow[],context:string[],kind:ResultKind,name='criativos'){
 const url=URL.createObjectURL(new Blob([labCsv(rows,context,kind)],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download=name+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function downloadLabPdf(rows:LabRow[],context:string[],kind:ResultKind,observations:string[]){
 const {jsPDF}=await import('jspdf');
 const pdf=new jsPDF();let y=18;
 const line=(text:string,size=10)=>{pdf.setFontSize(size);const lines=pdf.splitTextToSize(pdfText(text),174) as string[];for(const l of lines){if(y>278){pdf.addPage();y=18;}pdf.text(l,18,y);y+=size>12?8:5;}y+=2;};
 line('Avante Digital | Análise dos Criativos',17);
 context.forEach(c=>line(c,9));
 line('Resultado analisado: '+resultLabels[kind],10);
 line('Top 10 dos anúncios filtrados',13);
 for(const [i,r]of rows.slice(0,10).entries()){
  line((i+1)+'. '+r.name,11);
  line('Campanha: '+r.campaign+' | Objetivo: '+(r.objective||'não informado'),9);
  line('Investimento: '+(r.current.spend??'não informado')+' | Resultados: '+(r.current.results??'não informado')+' | Custo/resultado: '+(r.current.cpr?.toFixed(2)??'não calculável'),9);
  line(r.diagnosis.reason,9);
 }
 line('Observações e limites',13);
 observations.forEach(text=>line(text,9));
 line('Alcance não é somado entre anúncios. Classificações usam as metas configuradas e não confirmam lucro nem saturação.',9);
 pdf.save('analise-criativos.pdf');
}
