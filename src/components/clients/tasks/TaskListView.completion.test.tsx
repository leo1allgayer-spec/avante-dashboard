// @vitest-environment jsdom
import React from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {TaskListView} from './TaskListView';
import {Task} from '@/types/clients/task';
vi.mock('@/components/ui/select',()=>({Select:({children}:any)=><div>{children}</div>,SelectTrigger:({children}:any)=><div>{children}</div>,SelectValue:()=>null,SelectContent:()=>null,SelectItem:()=>null}));
afterEach(cleanup);
const task:Task={id:'task-1',title:'Card vendedor',description:'Criar arte',assigneeId:'bia',dueDate:'2026-10-28',priority:'Alta',status:'Revisão',isDaily:false,createdAt:'2026-10-28T10:00:00Z',startedAt:null,completedAt:null,userId:'requester'};
const props={members:[],onDeleteTask:vi.fn(),filterAssignee:'',filterStatus:'',filterPriority:'',search:''};
it('confirms completion once while saving, without marking the task locally before persistence',async()=>{
 let finish!:()=>void;const update=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve;}));
 const view=render(<TaskListView {...props} tasks={[task]} onUpdateTask={update}/>);
 fireEvent.click(screen.getByRole('button',{name:'Concluir e avisar'}));
 expect(update).toHaveBeenCalledWith(expect.objectContaining({id:'task-1',status:'Concluída',userId:'requester'}));
 expect((screen.getByRole('button',{name:'Concluindo…'}) as HTMLButtonElement).disabled).toBe(true);
 finish();await waitFor(()=>expect(screen.getByRole('button',{name:'Concluir e avisar'})).toBeTruthy());
 view.rerender(<TaskListView {...props} tasks={[{...task,status:'Concluída'}]} onUpdateTask={update}/>);
 expect(screen.queryByRole('button',{name:'Concluir e avisar'})).toBeNull();
 expect(update).toHaveBeenCalledTimes(1);
});
