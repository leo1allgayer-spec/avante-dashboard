export interface MeetingLeadFields {partners:string;business:string;revenue:string;interest:string;}
export const emptyMeetingLeadFields=():MeetingLeadFields=>({partners:'',business:'',revenue:'',interest:''});
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const fieldForLabel=(label:string):keyof MeetingLeadFields|undefined=>{
 const key=normalize(label);
 if(['socios','tem socios','tem socio'].includes(key))return 'partners';
 if(['tipo de negocio','tipo negocio'].includes(key))return 'business';
 if(['faturamento','faturamento mensal'].includes(key))return 'revenue';
 if(['interesse','interesse (curso/assessoria)','curso ou assessoria'].includes(key))return 'interest';
};
export function readMeetingLeadFields(notes:string){
 const fields=emptyMeetingLeadFields();const remaining:string[]=[];
 for(const line of (notes||'').split('\n')){
  const match=line.match(/^\s*([^:]+):\s*(.*)$/);const key=match&&fieldForLabel(match[1]);
  if(key){const value=match![2].trim();fields[key]=normalize(value)==='nao informado'?'':value;}else remaining.push(line);
 }
 return {fields,notes:remaining.join('\n').trim()};
}
export function writeMeetingLeadFields(notes:string,fields:MeetingLeadFields){
 const labels:Record<keyof MeetingLeadFields,string>={partners:'Sócios',business:'Tipo de negócio',revenue:'Faturamento',interest:'Interesse (curso/assessoria)'};
 const summary=(Object.keys(labels) as (keyof MeetingLeadFields)[]).filter(key=>fields[key].trim()).map(key=>`${labels[key]}: ${fields[key].trim().replace(/[\r\n]+/g,' ')}`);
 return [readMeetingLeadFields(notes).notes,...summary].filter(Boolean).join('\n');
}
