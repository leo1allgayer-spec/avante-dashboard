// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import DashboardTVPage from './DashboardTVPage';
const today=new Date(2026,9,21,12);
const key=(offset:number)=>{const d=new Date(today);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
vi.mock('react-router-dom',()=>({useNavigate:()=>vi.fn()}));
vi.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:vi.fn()})}));
vi.mock('@/hooks/useMetrics',()=>({useMonthMetrics:()=>({data:[{date:'2026-10-01',meta_mensal_prevista:22000}]}),useMetricsRange:()=>({data:[{date:'2026-10-01',meta_mensal_prevista:22000}]})}));
vi.mock('@/hooks/useClients',()=>({useClients:()=>({data:[]})}));
vi.mock('@/hooks/useVendas',()=>({useVendas:()=>({data:[{data:key(0),valor:1000},{data:key(-6),valor:2000},{data:key(-14),valor:4000},{data:key(-15),valor:8000},{data:key(0),valor:99999,status:'cancelada'}]})}));
vi.mock('@/hooks/useCursosDados',()=>({useCursosDados:()=>({data:[],isSuccess:true})}));
vi.mock('@/hooks/clients/useMeetings',()=>({useMeetings:()=>({meetings:[],loading:false,syncing:false})}));
vi.mock('@/hooks/useFechamentosDiarios',()=>({useFechamentosDiarios:()=>({data:[{data:key(0),valor_sinal:100,valor_sinal_liquido:100},{data:key(-6),valor_sinal:200,valor_sinal_liquido:200},{data:key(-14),valor_sinal:400,valor_sinal_liquido:400},{data:key(-15),valor_sinal:800,valor_sinal_liquido:800},{data:key(0),valor_sinal:9999,valor_sinal_liquido:9999,status:'cancelado'}]})}));
vi.mock('@/hooks/useMetaAds',()=>({useMetaAds:()=>({data:{campaigns:[],dailyInsights:[],accountInsights:{spend:0}}})}));
vi.mock('@/hooks/useCrmMql',()=>({useCrmMql:()=>({data:{total:0,daily:{}}})}));
vi.mock('@/hooks/useCrmCalls',()=>({useCrmCalls:()=>({})}));
vi.mock('@/hooks/clients/useMeetingAdInvestment',()=>({useMeetingAdInvestment:()=>({})}));
vi.mock('@/hooks/clients/useMeetingMetrics',()=>({useMeetingMonthlyMetrics:()=>({})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{channel:()=>{const c={on:()=>c,subscribe:()=>c};return c;},removeChannel:vi.fn()}}));
vi.mock('@/components/SpotifyTVPlayer',()=>({default:()=>null}));
vi.mock('@/components/TVVisibility',()=>({TVVisibilityProvider:({children}:any)=><>{children}</>,TVSecret:({children}:any)=><>{children}</>,TVHideButton:()=>null,TVRestoreButton:()=>null}));
vi.mock('react-countup',()=>({default:({end}:any)=><span data-testid="value">{end}</span>}));
vi.mock('framer-motion',()=>({motion:{div:({children,initial,animate,transition,...props}:any)=><div {...props}>{children}</div>}}));
vi.mock('recharts',()=>({ResponsiveContainer:()=>null,AreaChart:()=>null,Area:()=>null,XAxis:()=>null,YAxis:()=>null,Tooltip:()=>null,PieChart:()=>null,Pie:()=>null,Cell:()=>null}));
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(today);});
afterEach(()=>{cleanup();localStorage.clear();vi.useRealTimers();});
it('changes collected revenue for day, inclusive week and fortnight, excludes cancellations and remembers the filter',()=>{
 render(<DashboardTVPage/>);
 const revenue=()=>screen.getByText(/^Faturamento ·/).parentElement!.querySelector('[data-testid=value]')!.textContent;
 fireEvent.click(screen.getByRole('button',{name:/^Dia$/}));expect(revenue()).toBe('100');
 fireEvent.click(screen.getByRole('button',{name:/^Semana$/}));expect(revenue()).toBe('300');
 fireEvent.click(screen.getByRole('button',{name:/^Quinzena$/}));expect(revenue()).toBe('700');expect(localStorage.getItem('tv-period')).toBe('fortnight');
 expect(screen.getByRole('button',{name:/^Quinzena$/}).getAttribute('aria-pressed')).toBe('true');
});


it('updates the revenue card, goal, progress, collected and sold values for the same selected range',()=>{
 render(<DashboardTVPage/>);
 for(const [option,revenueLabel,goalLabel,revenue,goal,sold] of [
 ['Dia','Faturamento Hoje','Meta Diária',100,1000,'1.000'],
 ['Semana','Faturamento Semanal','Meta Semanal',300,5000,'3.000'],
 ['Quinzena','Faturamento Quinzenal','Meta Quinzenal',700,11000,'7.000'],
 ['Mês','Faturamento Mensal','Meta Mensal',1500,22000,'15.000'],
 ] as const){
 fireEvent.click(screen.getByRole('button',{name:option}));
 const card=(label:string)=>screen.getByText(label).parentElement!.parentElement!;
 expect(card(revenueLabel).querySelector('[data-testid=value]')?.textContent).toBe(String(revenue));
 const goalCard=card(goalLabel);
 expect(goalCard.querySelector('[data-testid=value]')?.textContent).toBe(String(goal));
 expect(goalCard.textContent).toContain(sold);
 expect(goalCard.textContent?.replace(/\s/g,' ')).toContain(`Coletado R$ ${revenue.toLocaleString('pt-BR')}`);
 expect(Number(goalCard.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'))).toBeCloseTo(revenue/goal*100);
 }
});

