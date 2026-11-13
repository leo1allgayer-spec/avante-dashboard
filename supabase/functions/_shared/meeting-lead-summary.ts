type RecordValue=Record<string,unknown>;
const record=(v:unknown):RecordValue=>v&&typeof v==='object'&&!Array.isArray(v)?v as RecordValue:{};
const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[_-]/g,' ').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const summaryFieldLabels=new Set([
 'socios','socio','tem socio','tem socios','has partners','has partner',
 'tipo de negocio','tipo negocio','business type','business segment',
 'faturamento','faturamento mensal','monthly revenue','revenue range','monthly billing',
 'interesse','interesse curso assessoria','curso ou assessoria','service interest','interest type',
]);
const stripSummaryFields=(value:string)=>value.split(/\r?\n/).filter(line=>{
 const match=line.trim().replace(/^[-*•]\s*/, '').match(/^\*{0,2}([^:]+?)\*{0,2}\s*:\s*.*$/);
 return !match||!summaryFieldLabels.has(normalize(match[1]));
}).join('\n').replace(/\n{3,}/g,'\n\n').trim();
const text=(v:unknown):string=>{
 if(v===true)return 'Sim';if(v===false)return 'Não';
 if(typeof v==='number'&&Number.isFinite(v))return v.toLocaleString('pt-BR');
 if(typeof v==='string')return v.trim().slice(0,500);
 if(Array.isArray(v))return v.map(text).filter(Boolean).join(', ').slice(0,500);
 if(v&&typeof v==='object'){const r=record(v);return text(r.value??r.answer??r.resposta??r.label);}
 return '';
};
export function meetingLeadSummary(lead:unknown,appointmentNotes=''){
 const values=new Map<string,string>();
 const walk=(value:unknown,depth=0)=>{
  if(depth>3)return;
  if(Array.isArray(value)){value.forEach(v=>walk(v,depth+1));return;}
  const r=record(value);
  const label=text(r.label??r.field_name??r.field_label??r.key??r.question??r.name);
  if(label&&('value' in r||'answer' in r||'resposta' in r))values.set(normalize(label),text(r.value??r.answer??r.resposta));
  for(const [key,value]of Object.entries(r)){
   const str=text(value);if(str)values.set(normalize(key),str);
   if(['qualification','qualificacao','custom_fields','customFields','answers','respostas','fields','metadata','profile','lead'].includes(key))walk(value,depth+1);
  }
 };
 walk(lead);
 const explicit=new Map<string,string>();
 appointmentNotes.split('\n').forEach(line=>{const m=line.match(/^\s*([^:]{2,80}):\s*(.+)$/);if(m)explicit.set(normalize(m[1]),m[2].trim().slice(0,500));});
 const noteSources=[appointmentNotes,text(record(lead).notes??record(lead).description??record(lead).summary)].map(value=>value.trim()).filter(Boolean);
 const notes=[...new Set(noteSources)].join('\n');
 notes.split('\n').forEach(line=>{const m=line.match(/^\s*([^:]{2,80}):\s*(.+)$/);if(m&&!values.has(normalize(m[1])))values.set(normalize(m[1]),m[2].trim().slice(0,500));});
 const find=(keys:string[])=>{for(const k of keys){const v=explicit.get(normalize(k));if(v)return v;}for(const k of keys){const v=values.get(normalize(k));if(v)return v;}return 'Não informado';};
 const partners=find(['has_partners','has_partner','tem_socio','tem_socios','possui_socio','possui_socios','socios','socio','tem sócio?']);
 const business=find(['business_type','business_segment','tipo_negocio','tipo_de_negocio','tipo de negócio','tipo de empresa','segment','segmento','nicho','industry']);
 const revenue=find(['monthly_revenue','revenue_range','monthly_billing','faturamento_mensal','faturamento','faixa_de_faturamento','receita_mensal']);
 const interest=find(['service_interest','interested_service','interest_type','tipo_interesse','servico_interesse','curso_ou_assessoria','curso ou assessoria','interesse','interesse (curso/assessoria)','produto de interesse']);
 const note=stripSummaryFields(notes).slice(0,900);
 return ['\n\n📝 *Resumo do lead*',`Sócios: ${partners}`,`Tipo de negócio: ${business}`,`Faturamento: ${revenue}`,`Interesse (curso/assessoria): ${interest}`,...(note?['',`Observações: ${note}`]:[])].join('\n');
}
export async function loadMeetingLeadSummary(leadId:unknown,apiKey:string|undefined,request:typeof fetch=fetch){
 if(typeof leadId!=='string'||!leadId||!apiKey||leadId.length>200)return {};
 try{
  const response=await request(`https://crm.solairew.com.br/api/v1/leads/${encodeURIComponent(leadId)}`,{headers:{Authorization:`Bearer ${apiKey}`,Accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!response.ok)return {};
  const result=record(await response.json());
  return record(result.data??result.lead??result);
 }catch{return {};}
}
