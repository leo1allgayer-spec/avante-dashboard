import type { Client } from "@/types/clients/client";
import { inRange, type DateRange, type EvolutionClient } from "./evolutionMetrics";
export function clientChurn(clients:Pick<Client,"startDate"|"contractLifecycle"|"contractEndDate">[],range:DateRange) {
 const known=clients.filter(c=>c.startDate&&((c.contractLifecycle==="vigente")||(c.contractLifecycle==="encerrado"&&c.contractEndDate&&c.contractEndDate>=c.startDate)));
 const missing=clients.length-known.length;
 const opening=known.filter(c=>c.startDate<range.start&&(!c.contractEndDate||c.contractEndDate>=range.start));
 const lostOpening=opening.filter(c=>c.contractLifecycle==="encerrado"&&inRange(c.contractEndDate,range)).length;
 const closed=known.filter(c=>c.contractLifecycle==="encerrado"&&inRange(c.contractEndDate,range)).length;
 return {missing,opening:opening.length,closed,rate:missing===0&&opening.length?lostOpening/opening.length*100:null};
}
export function evolutionContractChurn(clients:EvolutionClient[],range:DateRange) {
 return clientChurn(clients.map(c=>{
  let profile: {contractLifecycle?:Client["contractLifecycle"];contractEndDate?:string}={};
  try { const stored=Array.isArray(c.notes)?c.notes.find(n=>n.id==="__client_profile__"):null;profile=stored?JSON.parse(stored.text):{}; } catch { /* Missing profile remains unknown. */ }
  return {startDate:c.start_date||"",contractLifecycle:profile.contractLifecycle,contractEndDate:profile.contractEndDate};
 }),range);
}
