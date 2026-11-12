// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
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
vi.mock('@/hooks/clients/useCourseBookings',()=>({useCourseBookings:()=>({bookings:[...['Rita','Damaris'].map((studentName,index)=>({id:studentName,studentName,phone:`555199999000${index}`,date:'2026-10-07',time:'Tarde',courseName:'Curso Social Media',courseStatus:'concluído',status:'confirmed'})),{id:'bruno',studentName:'Bruno Borges',phone:'5551998705886',date:'2099-10-26',time:'Tarde',courseName:'Curso Inteligência Artificial',courseStatus:'a confirmar',status:'confirmed'}]})}));
afterEach(cleanup);
it('can mark a support group before a survey without marking the course completed',()=>{
 render(<FutureStudentsPage/>);
 const row=screen.getByText('Bruno Borges').closest('tr')!;
 fireEvent.click(within(row).getByRole('checkbox',{name:/Grupo de suporte de Bruno Borges/}));
 expect(groupMutation).toHaveBeenCalledWith({studentId:'bruno',course:'Curso de IA',created:true},expect.any(Object));
 expect(within(row).getByText('Pendente')).toBeTruthy();
 expect(within(row).queryByText('Curso feito')).toBeNull();
});
it('shows both Social Media courses as completed while distinguishing Damaris missing survey',()=>{
 render(<FutureStudentsPage/>);
 fireEvent.mouseDown(screen.getByRole('tab',{name:/Cursos feitos/}),{button:0,ctrlKey:false});
 const socialRows=screen.getAllByText('Curso Social Media').map(element=>element.closest('tr')!);
 expect(socialRows).toHaveLength(2);
 const rita=socialRows.find(row=>within(row).queryByText('Rita'))!;
 const damaris=socialRows.find(row=>within(row).queryByText('Damaris'))!;
 for(const row of [rita,damaris]){expect(within(row).getByText('Curso feito')).toBeTruthy();expect(within(row).getByText('Curso realizado')).toBeTruthy();expect(within(row).queryByText('Ainda não marcado')).toBeNull();}
 expect(within(rita).getByText('Formulário preenchido')).toBeTruthy();
 expect(within(damaris).getByText('Formulário ainda não preenchido')).toBeTruthy();
});
it('shows Bruno scheduled date for IA despite the full course name used by the agenda',()=>{
 render(<FutureStudentsPage/>);
 const row=screen.getByText('Bruno Borges').closest('tr')!;
 expect(within(row).getByText('Curso marcado')).toBeTruthy();
 expect(within(row).queryByText('Ainda não marcado')).toBeNull();
 expect(within(row).getByText(/26\/10\/2099.*Tarde/)).toBeTruthy();
 expect(within(row).getByText('Pendente')).toBeTruthy();
});
