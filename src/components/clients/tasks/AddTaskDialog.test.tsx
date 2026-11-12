// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {AddTaskDialog} from './AddTaskDialog';
vi.mock('@/components/ui/select',()=>({Select:({children,value,onValueChange}:any)=><select value={value} onChange={e=>onValueChange(e.target.value)}>{children}</select>,SelectTrigger:()=>null,SelectValue:()=>null,SelectContent:({children}:any)=><>{children}</>,SelectItem:({children,value}:any)=><option value={value}>{children}</option>}));
vi.mock('./TaskFilePicker',()=>({TaskFilePicker:({onChange}:any)=><button onClick={()=>onChange([new File(['photo'],'image.png',{type:'image/png'})])}>Foto de teste</button>}));
afterEach(cleanup);
it('keeps the demand open with description and files when saving fails',async()=>{
 const close=vi.fn();const add=vi.fn().mockRejectedValue(new Error('Sem permissão'));
 render(<AddTaskDialog open onClose={close} onAdd={add} members={[]}/>);
 fireEvent.change(screen.getByPlaceholderText('Ex: Criar relatório mensal'),{target:{value:'Criar arte'}});
 fireEvent.change(screen.getByPlaceholderText('Detalhes da tarefa...'),{target:{value:'Usar as fotos enviadas'}});
 fireEvent.click(screen.getByText('Foto de teste'));fireEvent.click(screen.getByText('Criar Tarefa'));
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toBe('Sem permissão'));
 expect(close).not.toHaveBeenCalled();expect(add).toHaveBeenCalledWith(expect.objectContaining({title:'Criar arte',description:'Usar as fotos enviadas'}),[expect.objectContaining({name:'image.png'})]);
});
