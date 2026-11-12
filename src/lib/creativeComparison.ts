export type CreativeMonth = {key:string;start:string;end:string;label:string};
export function creativeMonths(first:string,last:string,today:string):CreativeMonth[] {
 if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(first) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(last) || first>last || last>today.slice(0,7)) return [];
 const distance=(Number(last.slice(0,4))-Number(first.slice(0,4)))*12+Number(last.slice(5))-Number(first.slice(5));
 if (distance>=12) return [];
 return Array.from({length:distance+1},(_,i)=>{
  const date=new Date(Number(first.slice(0,4)),Number(first.slice(5))-1+i,1,12);
  const key=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
  const lastDay=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
  return {key,start:key+'-01',end:key===today.slice(0,7)?today:key+'-'+String(lastDay).padStart(2,'0'),label:date.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})};
 });
}
export function creativeTrend(before:number|null,after:number|null,available:boolean) {
 if(!available || before===null || after===null)return {label:'Sem base comparável',direction:'unknown'};
 if(before===0)return after>0?{label:'Novo resultado',direction:'up'}:{label:'Sem resultado nos dois meses',direction:'flat'};
 const delta=(after-before)/before*100;
 return {label:(delta>0?'+':'')+delta.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%',direction:delta>0?'up':delta<0?'down':'flat'};
}
