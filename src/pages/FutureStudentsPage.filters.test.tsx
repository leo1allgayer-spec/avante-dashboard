// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach,beforeEach} from 'vitest';
import {render,screen,fireEvent,within,cleanup} from '@testing-library/react';
import FutureStudentsPage from './FutureStudentsPage';
const { groupMutation } = vi.hoisted(() => ({ groupMutation: vi.fn() }));
vi.mock('@/components/DashboardLayout',()=>({default:({children}:any)=><>{children}</>}));
vi.mock('@/components/PageTransition',()=>({default:({children}:any)=><>{children}</>}));
vi.mock('@/components/MetricCard',()=>({default:({title,value}:any)=><p>{title}: {value}</p>}));
vi.mock('@/components/MonthYearSelect',()=>({default:()=>null}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
vi.mock('@/hooks/useFutureStudents',()=>({
 useSetFutureStudentSupportGroup:()=>({isPending:false,mutate:groupMutation}),
 useFutureStudents:()=>({data:[...['Rita','Damaris'].map((nome,index)=>({id:nome,nome,telefone:`555199999000${index}`,cpf:`0000000000${index}`,created_at:'2026-09-30T12:00:00Z',curso:'Curso Social Media',valor_sinal:2000,itens:[{nome:'Curso de Meta Ads',tipo:'curso',valor_sinal:1000,data:'2026-09-30'},{nome:'Curso de Social Midia',tipo:'curso',valor_sinal:1000,data:'2026-09-30'}]})),{id:'bruno',nome:'Bruno Borges',telefone:'5551998705886',cpf:'035.607.420-05',created_at:'2026-10-26T13:34:29Z',curso:'Curso Inteligência Artificial',valor_sinal:1500,itens:[{nome:'Curso de IA',tipo:'curso',valor_sinal:1500,valor_pendente:1000,data:'2026-10-26'}]}],isLoading:false}),
 useUpdateFutureStudent:()=>({isPending:false,mutateAsync:vi.fn()}),useDeleteFutureStudent:()=>({isPending:false,mutateAsync:vi.fn()})
}));
vi.mock('@/hooks/useSurveyInsights',()=>({useSurveyResponses:()=>({data:[{nome:'Rita',whatsapp:'5551999990000',curso_realizado:'Curso de Meta Ads'},{nome:'Damaris',whatsapp:'5551999990001',curso_realizado:'Curso de Meta Ads'},{nome:'Rita',whatsapp:'5551999990000',curso_realizado:'Curso de Social Media'}],isLoading:false})}));
vi.mock('@/hooks/clients/useCourseBookings',()=>({useCourseBookings:()=>({bookings:[...['Rita','Damaris'].map((studentName,index)=>({id:studentName,studentName,phone:`555199999000${index}`,date:'2026-10-07',time:'Tarde',courseName:'Curso Social Media',courseStatus:'concluído',status:'confirmed'})),{id:'bruno',studentName:'Bruno Borges',phone:'5551998705886',date:'2026-11-26',time:'Tarde',courseName:'Curso Inteligência Artificial',courseStatus:'a confirmar',status:'confirmed'}]})}));

beforeEach(() => { vi.useFakeTimers({toFake:["Date"]}); vi.setSystemTime(new Date("2026-11-23T12:00:00Z")); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('filters the table, financial totals and badges through date summary cards', () => {
 render(<FutureStudentsPage/>);
 const november = screen.getByRole('button',{name:/Novembro\/2026/});
 expect(november.textContent).toContain('1 cursos');
 expect(november.textContent).toContain('2.500,00');
 fireEvent.click(november);
 expect(screen.getByRole('tab',{name:/Pendentes/}).textContent).toContain('1');
 expect(screen.getByRole('tab',{name:/Cursos feitos/}).textContent).toContain('0');
 expect(screen.getByText('Total em sinais: 1500')).toBeTruthy();
 expect(screen.getByText('Total a receber: 1000')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/Dezembro\/2026/}));
 expect(screen.queryByText('Bruno Borges')).toBeNull();
 expect(screen.getByRole('tab',{name:/Pendentes/}).textContent).toContain('0');
 expect(screen.getByText('Total em sinais: 0')).toBeTruthy();
});
it('keeps searches, completed tab counts and undated/past categories consistent', () => {
 render(<FutureStudentsPage/>);
 fireEvent.mouseDown(screen.getByRole('tab',{name:/Cursos feitos/}),{button:0,ctrlKey:false});
 expect(screen.getByRole('button',{name:/Datas passadas/}).textContent).toContain('2 cursos');
 expect(screen.getByRole('button',{name:/Sem data/}).textContent).toContain('2 cursos');
 fireEvent.click(screen.getByRole('button',{name:/Sem data/}));
 fireEvent.change(screen.getByPlaceholderText('Buscar por nome, CPF ou telefone...'),{target:{value:'Damaris'}});
 expect(screen.getByRole('tab',{name:/Cursos feitos/}).textContent).toContain('1');
 expect(screen.getByRole('tab',{name:/Pendentes/}).textContent).toContain('0');
 expect(screen.queryByText('Rita')).toBeNull();
 expect(screen.getByText('Damaris')).toBeTruthy();
});
