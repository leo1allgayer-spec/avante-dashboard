export const FEEDBACK_AREAS = [
  {key:'atendimento',label:'Atendimento',question:'Como você avalia nosso atendimento?'},
  {key:'comunicacao',label:'Comunicação',question:'Como você avalia a clareza e a frequência da comunicação?'},
  {key:'resultados',label:'Resultados',question:'Como você avalia os resultados do trabalho neste mês?'},
  {key:'prazos',label:'Prazos',question:'Como você avalia o cumprimento dos prazos combinados?'},
] as const;
export type FeedbackArea = typeof FEEDBACK_AREAS[number]['key'];
export type FeedbackResponse = {id:string;nps:number;atendimento:number|null;comunicacao:number|null;resultados:number|null;prazos:number|null;reason:string;suggestion:string;respondent:string;created_at:string};
export type FeedbackInvite = {id:string;token:string;client_id:string;client_key:string;client_name:string;manager:string;month:string;expires_at:string;client_feedback_responses:FeedbackResponse[]};
export const feedbackMonth = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date()).slice(0,7);
export const feedbackClientKey = (name:string) => name.replace(/^\s*\d{1,3}[.)-]?\s+/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bcosmeticos\b/g,'cosmetico').replace(/[^a-z0-9]/g,'');
export const monthLabel = (month:string) => new Date(`${month.slice(0,7)}-01T12:00:00`).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
export function npsSummary(responses:Pick<FeedbackResponse,'nps'>[]) {
  const promoters=responses.filter(r=>r.nps>=9).length;
  const detractors=responses.filter(r=>r.nps<=6).length;
  return {total:responses.length,promoters,detractors,passives:responses.length-promoters-detractors,score:responses.length ? Math.round((promoters-detractors)/responses.length*100) : null};
}
export const heatColor = (value:number|null, nps=false) => value===null ? 'bg-muted text-muted-foreground' : value >= (nps ? 9 : 4) ? 'bg-emerald-500/20 text-emerald-300' : value >= (nps ? 7 : 3) ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300';
