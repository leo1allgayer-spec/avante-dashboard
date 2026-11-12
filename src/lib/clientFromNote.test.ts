import { expect,it,vi } from 'vitest';
import { clientFromNoteDefaults,createGestaoClientFromNote } from './clientFromNote';
it('prefills identifying and contact data without treating legal contract totals as monthly fees',()=>{
 const data=clientFromNoteDefaults({tradeName:'Loja Carla',companyName:'Carla Ltda',responsibleName:'Carla',email:'carla@example.com',phone:'555100000000',cnpj:'123',address:'Rua A',contractObject:'Gestão de tráfego',contractValue:'12000',internalNotes:'Interno'});
 expect(data).toMatchObject({name:'Loja Carla',company:'Carla Ltda',responsibleName:'Carla',email:'carla@example.com',phone:'555100000000',servicesDescription:'Gestão de tráfego'});
 expect(data).not.toHaveProperty('contractValue');expect(data).not.toHaveProperty('internalNotes');
});
it('creates and links through one transactional request using reviewed area and settings',async()=>{
 const db={rpc:vi.fn().mockResolvedValue({data:'linked-id',error:null})};
 const client={name:'Carla',company:'Empresa',instagram:'@carla',manager:'Nicolas',contractType:'TCV',contractMonths:12,contractValue:12000,monthlyBudget:500,paymentDate:15,commissionValue:100,reportDay:'Segunda-feira'};
 expect(await createGestaoClientFromNote(db,'note-id',client as any,'google_ads')).toBe('linked-id');
 expect(db.rpc).toHaveBeenCalledWith('create_gestao_client_from_note',{p_note_id:'note-id',p_settings:{...client,area:'google_ads'}});
});
it('does not report creation as successful on permission or linking failure',async()=>{
 await expect(createGestaoClientFromNote({rpc:async()=>({error:{message:'Acesso negado'}})},'note',{} as any,'meta_ads')).rejects.toThrow('Acesso negado');
});
