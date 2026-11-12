// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import MeetingClosingSelect from './MeetingClosingSelect';
import type {Meeting} from '@/types/clients/task';
const meeting={id:'1',title:'Cliente',date:'2026-10-16',time:'13:31',status:'completed',outcome:null,participants:[],description:'',origin:'CRM',service:'',modality:'online',hasClosed:false,closingStatus:'pending'} as Meeting;
afterEach(cleanup);
it('marks closing without changing attendance or schedule',async()=>{
 const update=vi.fn().mockResolvedValue(undefined);render(<MeetingClosingSelect meeting={meeting} onUpdate={update}/>);
 fireEvent.change(screen.getByLabelText('Fechou na call? Cliente'),{target:{value:'closed'}});
 await waitFor(()=>expect(update).toHaveBeenCalledWith({...meeting,closingStatus:'closed',hasClosed:true,objection:''}));
});
it('requires the objection before saving a negative closing',async()=>{
 const update=vi.fn().mockResolvedValue(undefined);render(<MeetingClosingSelect meeting={meeting} onUpdate={update}/>);
 fireEvent.change(screen.getByLabelText('Fechou na call? Cliente'),{target:{value:'not_closed'}});
 expect(update).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Marcar como não fechou'}).hasAttribute('disabled')).toBe(true);
 fireEvent.change(screen.getByLabelText('Motivo do não fechamento'),{target:{value:'Vai avaliar o orçamento'}});
 fireEvent.click(screen.getByRole('button',{name:'Marcar como não fechou'}));
 await waitFor(()=>expect(update).toHaveBeenCalledWith({...meeting,closingStatus:'not_closed',hasClosed:false,objection:'Vai avaliar o orçamento'}));
});
it('allows cancelling the reason dialog without changing the meeting',()=>{
 const update=vi.fn();render(<MeetingClosingSelect meeting={meeting} onUpdate={update}/>);
 fireEvent.change(screen.getByLabelText('Fechou na call? Cliente'),{target:{value:'not_closed'}});
 fireEvent.click(screen.getByRole('button',{name:'Cancelar',exact:true}));
 expect(update).not.toHaveBeenCalled();
});
