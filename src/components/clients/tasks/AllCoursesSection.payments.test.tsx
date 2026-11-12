// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {AllCoursesSection} from './AllCoursesSection';
const fixture=vi.hoisted(()=>({course:'Curso Inteligência Artificial',name:'Bruno Borges',item:'Curso de IA',remaining:1000,date:'2026-10-26'}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({session:{user:{id:'manager',email:'nicolaspatzlaff02@gmail.com'}}})}));
vi.mock('@tanstack/react-query',()=>({useQuery:()=>({data:[{student_name:fixture.name,course_name:fixture.item,remaining:fixture.remaining},...(fixture.name==='Carine Capelão Vargas Britto'?[{student_name:fixture.name,course_name:'Curso de Meta Ads',remaining:1433.34},{student_name:fixture.name,course_name:'Social Media',remaining:1433.34}]:[])],isPending:false,isError:false})}));
vi.mock('@/integrations/supabase/clientsClient',()=>({supabaseClients:{from:(table:string)=>({select:()=>({order:async()=>({data:table==='course_bookings'?[{id:'test-booking',student_name:fixture.name,course_name:fixture.course,date:fixture.date,time:'Tarde',course_status:'a confirmar',status:'confirmed',phone:'5551998705886'}]:[],error:null})})}),channel:()=>{const channel={on:()=>channel,subscribe:()=>channel};return channel;},removeChannel:vi.fn()}}));
afterEach(()=>{cleanup();vi.useRealTimers();});
it.each(['Curso Inteligência Artificial','Curso de Inteligência Artificial','Curso de IA'])('identifies Bruno IA course and the 1000 remaining for %s',async course=>{
 Object.assign(fixture,{course,name:'Bruno Borges',item:'Curso de IA',remaining:1000,date:'2026-10-26'});vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,9,26,10));
 render(<AllCoursesSection/>);
 expect(await screen.findAllByText('Bruno Borges')).toHaveLength(2);
 expect(screen.getByText('Curso Inteligência Artificial')).toBeTruthy();
 expect(screen.getByText(/Falta pagar R\$\s*1\.000,00/)).toBeTruthy();
 expect(screen.queryByText('Pagamento não identificado')).toBeNull();
});
it('identifies Carine video balance separately from the other two purchased courses',async()=>{
 Object.assign(fixture,{course:'Curso Captação e Edição de Vídeo',name:'Carine Capelão Vargas Britto',item:'Curso Captacao/Edicao',remaining:1433.34,date:'2026-11-03'});
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,10,3,10));
 render(<AllCoursesSection/>);
 expect(await screen.findAllByText('Carine Capelão Vargas Britto')).toHaveLength(2);
 expect(screen.getByText('Curso Captação e Edição de Vídeo')).toBeTruthy();
 expect(screen.getByText(/Falta pagar R\$\s*1\.433,34/)).toBeTruthy();
 expect(screen.queryByText('Pagamento não identificado')).toBeNull();
});
