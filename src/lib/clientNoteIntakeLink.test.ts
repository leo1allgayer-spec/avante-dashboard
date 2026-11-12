import { expect,it,vi } from 'vitest';
import { clientNoteIntakeLink } from './clientNoteIntakeLink';
it('preserves the existing linked-client URL without creating a second record',async()=>{
 const save=vi.fn();const db={from:vi.fn()};
 expect(await clientNoteIntakeLink(db,'https://dashboard.test','original-token',save)).toBe('https://dashboard.test/cadastro-notas-cliente?token=original-token');
 expect(save).not.toHaveBeenCalled();expect(db.from).not.toHaveBeenCalled();
});
it('saves a new standalone sheet first and uses its own token, not its id',async()=>{
 const save=vi.fn().mockResolvedValue('saved-id');
 const single=vi.fn().mockResolvedValue({data:{form_token:'private-token'}}),eq=vi.fn(()=>({single}));
 const db={from:vi.fn(()=>({select:()=>({eq})}))};
 expect(await clientNoteIntakeLink(db,'https://dashboard.test',undefined,save)).toBe('https://dashboard.test/cadastro-notas-cliente?ficha=private-token');
 expect(eq).toHaveBeenCalledWith('id','saved-id');
 expect(save.mock.invocationCallOrder[0]).toBeLessThan(db.from.mock.invocationCallOrder[0]);
});
it('does not generate a link when saving fails',async()=>{
 const db={from:vi.fn()};await expect(clientNoteIntakeLink(db,'https://dashboard.test',undefined,async()=>false)).rejects.toThrow('Salve a ficha');
 expect(db.from).not.toHaveBeenCalled();
});
it('reports missing token rather than copying an invalid link',async()=>{
 const db={from:()=>({select:()=>({eq:()=>({single:async()=>({data:{},error:null})})})})};
 await expect(clientNoteIntakeLink(db,'https://dashboard.test',undefined,async()=>'saved-id')).rejects.toThrow('A ficha foi salva');
});
