import {it,expect} from 'vitest';
import {removeSaleDraftRow} from './removeSaleDraftRow';
it('preserves IDs when removing an existing middle item followed by adding or editing another',()=>{
 const result=removeSaleDraftRow(['A','B','C','new'],['idA','idB','idC'],1);
 expect(result).toEqual({items:['A','C','new'],records:['idA','idC'],removed:'idB'});
 expect(removeSaleDraftRow(result.items,result.records,0)).toEqual({items:['C','new'],records:['idC'],removed:'idA'});
});
it('removes an unsaved item without deleting an existing record',()=>{
 expect(removeSaleDraftRow(['A','new'],['idA'],1)).toEqual({items:['A'],records:['idA'],removed:undefined});
 expect(()=>removeSaleDraftRow(['A'],['idA'],0)).toThrow();
});
