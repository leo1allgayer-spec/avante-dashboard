import type { Client } from '@/types/clients/client';
export function clientFromNoteDefaults(note:Record<string,unknown>):Partial<Client>{
 const text=(key:string)=>typeof note[key]==='string'?note[key] as string:'';
 return {name:text('tradeName')||text('companyName')||text('responsibleName'),company:text('companyName'),responsibleName:text('responsibleName'),email:text('email'),phone:text('phone'),servicesDescription:text('contractObject'),paymentMethod:text('paymentMethod'),contractCompanyData:[text('cnpj')&&'CNPJ: '+text('cnpj'),text('address'),text('cep')&&'CEP: '+text('cep')].filter(Boolean).join(' · ')};
}
export async function createGestaoClientFromNote(db:any,noteId:string,client:Client,area:'meta_ads'|'google_ads'){
 const {data,error}=await db.rpc('create_gestao_client_from_note',{p_note_id:noteId,p_settings:{name:client.name,company:client.company,instagram:client.instagram,manager:client.manager,area,monthlyBudget:client.monthlyBudget,paymentDate:client.paymentDate,commissionValue:client.commissionValue,contractValue:client.contractValue,contractType:client.contractType,contractMonths:client.contractMonths,reportDay:client.reportDay}});
 if(error)throw new Error(error.message||'Não foi possível criar o cliente.');
 if(typeof data!=='string'||!data)throw new Error('A criação do cliente não foi confirmada.');
 return data;
}
