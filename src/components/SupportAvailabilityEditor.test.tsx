// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import SupportAvailabilityEditor from './SupportAvailabilityEditor';
const mocks=vi.hoisted(()=>({save:vi.fn(),update:vi.fn(),remove:vi.fn(),toast:vi.fn()}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:mocks.toast})}));
vi.mock('@/hooks/useSupportSchedule',()=>({
 useSupportRules:()=>({data:[{id:'weekly',weekday:1,start_time:'10:00:00',capacity:1,active:true}],isPending:false,isError:false}),
 useSupportDateOverrides:()=>({data:[],isPending:false,isError:false}),
 useSaveSupportAvailability:()=>({mutateAsync:mocks.save,isPending:false}),
 useUpdateSupportRule:()=>({mutateAsync:mocks.update,isPending:false}),
 useDeleteSupportRule:()=>({mutateAsync:mocks.remove,isPending:false}),
 useRemoveSupportOverride:()=>({mutateAsync:mocks.remove,isPending:false})
}));
beforeEach(()=>{vi.clearAllMocks();mocks.save.mockResolvedValue(undefined);mocks.update.mockResolvedValue(undefined);});
afterEach(cleanup);
it('reviews a batch for multiple weekdays and only writes after confirmation',async()=>{
 render(<SupportAvailabilityEditor/>);
 fireEvent.click(screen.getByRole('button',{name:'Terça-feira',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Revisar e liberar 8 horário(s)',exact:true}));
 expect(mocks.save).not.toHaveBeenCalled();
 expect(screen.getByRole('alertdialog').textContent).toContain('Segunda-feira, Terça-feira');
 fireEvent.click(screen.getByRole('button',{name:'Confirmar ajuste',exact:true}));
 await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));
 expect(mocks.save.mock.calls[0][0].rows).toHaveLength(8);
 expect(new Set(mocks.save.mock.calls[0][0].rows.map((r:{weekday:number})=>r.weekday))).toEqual(new Set([1,2]));
});
it('keeps weekly row edits local until Save is clicked',async()=>{
 render(<SupportAvailabilityEditor/>);
 fireEvent.change(screen.getByLabelText('Vagas 10:00'),{target:{value:'3'}});
 expect(mocks.update).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Salvar',exact:true}));
 await waitFor(()=>expect(mocks.update).toHaveBeenCalledWith({id:'weekly',start_time:'10:00',capacity:3,active:true}));
});
it('moves a date-specific slot atomically without changing the weekly rule',async()=>{
 render(<SupportAvailabilityEditor/>);
 fireEvent.click(screen.getByRole('button',{name:'Somente uma data',exact:true}));
 fireEvent.change(screen.getByLabelText('Data do ajuste'),{target:{value:'2026-10-19'}});
 fireEvent.change(screen.getByLabelText('Início 10:00'),{target:{value:'11:00'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar',exact:true}));
 await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));
 const input=mocks.save.mock.calls[0][0];
 expect(input.scope).toBe('date');expect(input.rows).toHaveLength(2);
 expect(input.rows[0]).toMatchObject({slot_date:'2026-10-19',start_time:'10:00:00',active:false});
 expect(input.rows[1]).toMatchObject({slot_date:'2026-10-19',start_time:'11:00',active:true});
 expect(mocks.update).not.toHaveBeenCalled();
});
