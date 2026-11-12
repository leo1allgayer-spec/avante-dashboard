// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,within,cleanup,waitFor} from '@testing-library/react';
import {AllCoursesSection} from './AllCoursesSection';
const mocks=vi.hoisted(()=>({course:'Curso Meta Ads',transfer:vi.fn().mockResolvedValue({changed:true,studentCount:2,warning:''})}));
vi.mock('@/lib/transferCourseInstructor',()=>({transferCourseInstructor:(...args:any[])=>mocks.transfer(...args)}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({session:{user:{id:'manager',email:'nicolaspatzlaff02@gmail.com'}}})}));
vi.mock('@tanstack/react-query',()=>({useQuery:()=>({data:[],isPending:false,isError:false})}));
vi.mock('@/components/ui/select',()=>({Select:({children,value,onValueChange}:any)=><select value={value} onChange={e=>onValueChange(e.target.value)}>{children}</select>,SelectTrigger:()=>null,SelectValue:()=>null,SelectContent:({children}:any)=><>{children}</>,SelectItem:({value,children}:any)=><option value={value}>{children}</option>}));
vi.mock('@/integrations/supabase/clientsClient',()=>({supabaseClients:{from:(table:string)=>({select:()=>({order:async()=>({data:table==='course_bookings'?['Larissa','Vanessa'].map((name,index)=>({id:`booking-${index}`,student_name:name,course_name:mocks.course,date:'2026-10-29',time:'Tarde',course_status:'confirmado',status:'confirmed',instructor:mocks.course==='Curso Meta Ads'?'Nicolas':null,phone:'5551999999999',email:'test@example.invalid'})):[],error:null})})}),channel:()=>{const c={on:()=>c,subscribe:()=>c};return c;},removeChannel:vi.fn()}}));
afterEach(()=>{mocks.course='Curso Meta Ads';cleanup();vi.useRealTimers();vi.clearAllMocks();});
it('shows the whole class before saving and notifying the new professor',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,9,29,10));
 render(<AllCoursesSection/>);
 fireEvent.click(await screen.findByRole('button',{name:'Trocar professor da turma de Larissa'}));
 const dialog=screen.getByRole('dialog');expect(within(dialog).getByText('Larissa')).toBeTruthy();expect(within(dialog).getByText('Vanessa')).toBeTruthy();
 const save=within(dialog).getByRole('button',{name:'Salvar e avisar professor'});expect((save as HTMLButtonElement).disabled).toBe(true);
 fireEvent.change(within(dialog).getByRole('combobox'),{target:{value:'Henrique'}});fireEvent.click(save);
 await waitFor(()=>expect(mocks.transfer).toHaveBeenCalledWith(expect.anything(),'booking-0','Henrique','Nicolas','2026-10-29','Tarde',['booking-0']));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
});

it('can select all, deselect all, then transfer only the other student',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,9,29,10));
 render(<AllCoursesSection/>);
 fireEvent.click(await screen.findByRole('button',{name:'Trocar professor da turma de Larissa'}));
 const dialog=screen.getByRole('dialog');
 expect((within(dialog).getByRole('checkbox',{name:'Larissa'}) as HTMLInputElement).checked).toBe(true);
 expect((within(dialog).getByRole('checkbox',{name:'Vanessa'}) as HTMLInputElement).checked).toBe(false);
 fireEvent.click(within(dialog).getByRole('button',{name:'Selecionar todos'}));
 expect(within(dialog).getAllByRole('checkbox').every(c=>(c as HTMLInputElement).checked)).toBe(true);
 fireEvent.click(within(dialog).getByRole('button',{name:'Desmarcar todos'}));
 fireEvent.change(within(dialog).getByRole('combobox'),{target:{value:'Henrique'}});
 expect((within(dialog).getByRole('button',{name:'Salvar e avisar professor'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(within(dialog).getByRole('checkbox',{name:'Vanessa'}));
 fireEvent.click(within(dialog).getByRole('button',{name:'Salvar e avisar professor'}));
 await waitFor(()=>expect(mocks.transfer).toHaveBeenCalledWith(expect.anything(),'booking-1','Henrique','Nicolas','2026-10-29','Tarde',['booking-1']));
});

it('allows assigning a selected video student to Nicolas',async()=>{
 mocks.course='Curso Captação e Edição de Vídeo';
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,9,29,10));render(<AllCoursesSection/>);
 fireEvent.click(await screen.findByRole('button',{name:'Trocar professor da turma de Larissa'}));const dialog=screen.getByRole('dialog');
 expect(within(dialog).queryByRole('option',{name:'Henrique'})).toBeNull();
 fireEvent.change(within(dialog).getByRole('combobox'),{target:{value:'Nicolas'}});
 fireEvent.click(within(dialog).getByRole('button',{name:'Salvar e avisar professor'}));
 await waitFor(()=>expect(mocks.transfer).toHaveBeenCalledWith(expect.anything(),'booking-0','Nicolas',undefined,'2026-10-29','Tarde',['booking-0']));
});
