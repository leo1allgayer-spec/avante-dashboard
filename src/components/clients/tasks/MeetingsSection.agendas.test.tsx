// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {MeetingsSection} from './MeetingsSection';
vi.mock('@/hooks/clients/useMeetingMetrics',()=>({useMeetingMonthlyMetrics:()=>({data:undefined}),useSaveMeetingMonthlyMetrics:()=>({isPending:false,mutateAsync:vi.fn()})}));
vi.mock('@/components/ui/select',()=>({Select:({value,onValueChange,children}:any)=><select value={value} onChange={e=>onValueChange(e.target.value)}>{children}</select>,SelectTrigger:()=>null,SelectValue:()=>null,SelectContent:({children}:any)=><>{children}</>,SelectItem:({value,children}:any)=><option value={value}>{children}</option>}));
vi.mock('./MeetingClosingSelect',()=>({default:()=>null}));
afterEach(cleanup);
const Location=()=>{const l=useLocation();return <p data-testid="location">{l.pathname}</p>;};
function setup(open=true,meetings:any[]=[],blocks:any[]=[]){const add=vi.fn().mockResolvedValue(undefined);render(<MemoryRouter initialEntries={['/agenda-geral']}><MeetingsSection meetings={meetings} blocks={blocks} members={['Emanoel Bull','Leonardo Webster'].map(name=>({id:name,name} as any))} agendaCategory="all" agendaTitle="Agenda Geral" onAdd={add} onUpdate={vi.fn()} onDelete={vi.fn()}/><Location/></MemoryRouter>);if(open)fireEvent.click(screen.getByRole('button',{name:'Agendar'}));return add;}
const destination=()=>screen.getByRole('option',{name:'Agenda Geral'}).closest('select')!;
function fill(name='Emanoel Bull'){
 fireEvent.change(screen.getByPlaceholderText('Nome da pessoa ou assunto'),{target:{value:'Compromisso'}});
 fireEvent.change(screen.getByRole('dialog').querySelector('input[type=date]')!,{target:{value:'2026-12-25'}});
 const responsible=screen.getAllByRole('option',{name}).find(el=>el.closest('select')?.querySelector('option[value="__none"]'))!.closest('select')!;
 fireEvent.change(responsible,{target:{value:name}});
}
const submit=()=>fireEvent.click(screen.getAllByRole('button',{name:'Agendar'}).at(-1)!);
it('starts with a real general destination and saves a general commitment',async()=>{
 const add=setup();expect(destination().value).toBe('geral');fill();submit();
 await waitFor(()=>expect(add).toHaveBeenCalledWith(expect.objectContaining({agendaCategory:'geral'})));
});
it.each([['__support','/agenda-suporte'],['__courses','/tasks']])('opens the dedicated flow for %s without creating a fake meeting',async(value,path)=>{
 const add=setup();fireEvent.change(destination(),{target:{value}});expect(screen.getByTestId('location').textContent).toBe(path);expect(add).not.toHaveBeenCalled();expect(screen.queryByRole('dialog')).toBeNull();
});
it('requires general destination for a non-closer assignee',async()=>{
 const add=setup();fill();fireEvent.change(destination(),{target:{value:'reunioes'}});submit();
 expect(screen.getByText(/Para outro responsável, use Agenda Geral/)).toBeTruthy();expect(add).not.toHaveBeenCalled();
 fireEvent.change(destination(),{target:{value:'geral'}});submit();await waitFor(()=>expect(add).toHaveBeenCalled());
});
it('isolates a day and preserves blocks when navigating across weeks',()=>{
 const meeting=(id:string,date:string,title:string)=>({id,date,title,time:'11:00',participants:[],status:'pending',agendaCategory:'geral'});
 setup(false,[meeting('a','2026-10-25','Domingo exclusivo'),meeting('b','2026-10-26','Segunda exclusiva')],[{id:'block',startDate:'2026-10-26',endDate:'2026-10-26',allDay:true,responsible:'Nicolas',reason:'Bloqueio exclusivo'}]);
 fireEvent.click(screen.getByRole('button',{name:/^Dia$/}));fireEvent.change(screen.getByLabelText('Data da agenda'),{target:{value:'2026-10-25'}});
 expect(screen.getByText('Domingo exclusivo')).toBeTruthy();expect(screen.queryByText('Segunda exclusiva')).toBeNull();expect(screen.queryByText('Bloqueio exclusivo')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Próximo dia'}));expect(screen.queryByText('Domingo exclusivo')).toBeNull();expect(screen.getByText('Segunda exclusiva')).toBeTruthy();expect(screen.getByText('Bloqueio exclusivo')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Próximo dia'}));expect(screen.getByText('Nenhum compromisso ou bloqueio neste dia.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/^Semana$/}));expect(screen.getByText('Segunda exclusiva')).toBeTruthy();
});
it('filters strictly by responsible, including blocks, without matching participants or professionals',()=>{
 const base={date:'2026-10-29',time:'11:00',participants:[],status:'pending',agendaCategory:'geral'};
 setup(false,[
  {...base,id:'own',title:'Responsável Webster',responsible:'Leonardo webster'},
  {...base,id:'participant',title:'Apenas participante',responsible:'Emanoel Bull',participants:['Leonardo Webster'],professional:'Leonardo Webster'},
  {...base,id:'unassigned',title:'Sem pessoa responsável',responsible:''},
 ],[
  {id:'webster-block',startDate:'2026-10-29',endDate:'2026-10-29',allDay:true,responsible:'Leonardo Webster',reason:'Bloqueio do Webster'},
  {id:'emanoel-block',startDate:'2026-10-29',endDate:'2026-10-29',allDay:true,responsible:'Emanoel Bull',reason:'Bloqueio do Emanoel'},
 ]);
 fireEvent.change(screen.getByLabelText('Data da agenda'),{target:{value:'2026-10-29'}});
 const responsible=screen.getByRole('option',{name:'Todos os responsáveis'}).closest('select')!;
 fireEvent.change(responsible,{target:{value:'Leonardo Webster'}});
 expect(screen.getByText('Responsável Webster')).toBeTruthy();expect(screen.queryByText('Apenas participante')).toBeNull();expect(screen.queryByText('Sem pessoa responsável')).toBeNull();
 expect(screen.getByText('Bloqueio do Webster')).toBeTruthy();expect(screen.queryByText('Bloqueio do Emanoel')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/^Dia$/}));
 expect(screen.getByText('Responsável Webster')).toBeTruthy();expect(screen.queryByText('Apenas participante')).toBeNull();
 fireEvent.change(responsible,{target:{value:'__unassigned'}});
 expect(screen.getByText('Sem pessoa responsável')).toBeTruthy();expect(screen.queryByText('Responsável Webster')).toBeNull();expect(screen.queryByText('Bloqueio do Webster')).toBeNull();
 fireEvent.change(responsible,{target:{value:'all'}});
 expect(screen.getByText('Apenas participante')).toBeTruthy();expect(screen.getByText('Bloqueio do Emanoel')).toBeTruthy();
});
it('shows the same support appointment for both Nicolas and Emanoel without duplicating it',()=>{
 setup(false,[{id:'support-test',date:'2026-11-05',time:'10:00',title:'Suporte compartilhado',participants:['Nicolas','Emanoel Bull'],responsible:'Nicolas',responsibles:['Nicolas','Emanoel Bull'],status:'pending',agendaCategory:'geral',meetingType:'suporte',origin:'suporte',service:'Suporte'}]);
 fireEvent.change(screen.getByLabelText('Data da agenda'),{target:{value:'2026-11-05'}});
 const responsible=screen.getByRole('option',{name:'Todos os responsáveis'}).closest('select')!;
 for(const name of ['Nicolas','Emanoel Bull','all']){
  fireEvent.change(responsible,{target:{value:name}});
  expect(screen.getAllByText('Suporte compartilhado')).toHaveLength(1);
  expect(screen.getByText('Resp. Nicolas e Emanoel Bull')).toBeTruthy();
 }
 fireEvent.change(responsible,{target:{value:'Leonardo Webster'}});
 expect(screen.queryByText('Suporte compartilhado')).toBeNull();
});
it.each([['reuniao','geral'],['reuniao_vendas','reunioes']])('routes Webster type %s to %s',async(type,category)=>{
 const add=setup();fill('Leonardo Webster');
 fireEvent.change(screen.getByRole('option',{name:/^Reunião de vendas$/}).closest('select')!,{target:{value:type}});submit();
 await waitFor(()=>expect(add).toHaveBeenCalledWith(expect.objectContaining({agendaCategory:category,meetingType:type})));
});

it('saves closer lead fields alongside observations in the meeting sent to CRM',async()=>{
 const add=setup();fill('Leonardo Webster');
 fireEvent.change(screen.getByRole('option',{name:/^Reunião de vendas$/}).closest('select')!,{target:{value:'reuniao_vendas'}});
 fireEvent.change(screen.getByRole('option',{name:/^Sim$/}).closest('select')!,{target:{value:'Sim'}});
 fireEvent.change(screen.getByLabelText('Tipo de negócio'),{target:{value:'Loja'}});
 fireEvent.change(screen.getByLabelText('Faturamento mensal'),{target:{value:'R$ 20 mil'}});
 fireEvent.change(screen.getByLabelText('Interesse (curso/assessoria)'),{target:{value:'Assessoria'}});
 submit();
 await waitFor(()=>expect(add).toHaveBeenCalledWith(expect.objectContaining({agendaCategory:'reunioes',description:'Sócios: Sim\nTipo de negócio: Loja\nFaturamento: R$ 20 mil\nInteresse (curso/assessoria): Assessoria'})));
});

it('restores lead answers and keeps notes separate when editing',()=>{
 const date=new Date();const dateKey=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 setup(false,[{id:'lead-edit',date:dateKey,title:'Cliente com resumo',time:'11:00',responsible:'Leonardo Webster',participants:[],status:'pending',agendaCategory:'reunioes',meetingType:'reuniao_vendas',description:'Trazer relatório\nSócios: Não\nTipo de negócio: Clínica\nFaturamento: R$ 30 mil\nInteresse (curso/assessoria): Curso'}]);
 fireEvent.click(screen.getByTitle('Remarcar reunião'));
 expect((screen.getByLabelText('Tipo de negócio') as HTMLInputElement).value).toBe('Clínica');
 expect((screen.getByLabelText('Faturamento mensal') as HTMLInputElement).value).toBe('R$ 30 mil');
 expect((screen.getByLabelText('Interesse (curso/assessoria)') as HTMLInputElement).value).toBe('Curso');
 expect((screen.getByRole('option',{name:/^Não$/}).closest('select') as HTMLSelectElement).value).toBe('Não');
 expect((screen.getByRole('dialog').querySelector('textarea') as HTMLTextAreaElement).value).toBe('Trazer relatório');
});
it('shows course teachers in responsible filters and opens the course agenda for changes',()=>{
 setup(false,[{id:'course-test',date:'2026-11-02',time:'14:00',title:'Curso Meta Ads',participants:['Nicolas'],responsible:'Nicolas',description:'Alunos: Ana',status:'pending',agendaCategory:'geral',meetingType:'curso',origin:'curso',modality:'presencial'}]);
 fireEvent.change(screen.getByLabelText('Data da agenda'),{target:{value:'2026-11-02'}});
 const responsible=screen.getByRole('option',{name:'Todos os responsáveis'}).closest('select')!;
 fireEvent.change(responsible,{target:{value:'Nicolas'}});
 expect(screen.getByText('Curso Meta Ads')).toBeTruthy();expect(screen.getByText('Resp. Nicolas')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Ver curso'}));expect(screen.getByTestId('location').textContent).toBe('/tasks');
});
