// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreativeMonthComparison from './CreativeMonthComparison';
import CreativeResultsAnalysis from './CreativeResultsAnalysis';

vi.mock('recharts',()=>({ResponsiveContainer:()=>null,CartesianGrid:()=>null,Line:()=>null,LineChart:()=>null,Tooltip:()=>null,XAxis:()=>null,YAxis:()=>null}));
vi.mock('@/hooks/useVendas',()=>({useVendas:()=>({isSuccess:true,isError:false,data:[{id:'old',data:'2026-09-01',cliente:'Old',valor:100,status:'paga'},{id:'new',data:'2026-10-01',cliente:'New',valor:200,status:'paga'}]})}));
vi.mock('@/hooks/useCriativos',()=>({useCriativosVendas:()=>({isSuccess:true,isError:false,data:[{id:'l1',data:'2026-09-01',nome_aluno:'Old',valor_curso:100,status:'paga',codigo:'a',criativo:'Mesmo anúncio'},{id:'l2',data:'2026-10-01',nome_aluno:'New',valor_curso:200,status:'paga',codigo:'a',criativo:'Mesmo anúncio'}]})}));
vi.mock('@/hooks/useCreativePerformance',()=>({creativePerformanceQuery:(range:any)=>({queryKey:['test-month',range.start],queryFn:async()=>[],initialData:[{ad_id:'a',ad_name:'Mesmo anúncio',campaign_name:'Campanha',spend:100}]})}));
afterEach(cleanup);
it('shows monthly values separately and recomputes the comparison metric',()=>{
 render(<QueryClientProvider client={new QueryClient()}><CreativeMonthComparison months={[{key:'2026-09',start:'2026-09-01',end:'2026-09-30',label:'set./26'},{key:'2026-10',start:'2026-10-01',end:'2026-10-15',label:'out./26'}]}/></QueryClientProvider>);
 fireEvent.change(screen.getByLabelText('Métrica do comparativo'),{target:{value:'revenue'}});
 expect(screen.getByText('+100%')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Filtrar evolução'),{target:{value:'down'}});
 expect(screen.getByText('Nenhum criativo nos filtros selecionados.')).toBeTruthy();
});
it('shows ten ranked ads instead of only five, ordered by actual sales',()=>{
 const rows=Array.from({length:12},(_,i)=>({ad_id:String(i),ad_name:'Anúncio '+i,campaign_name:'Campanha',spend:100,count:i+1,revenue:(i+1)*100,roas:i+1}));
 render(<CreativeResultsAnalysis rows={rows} ready onSelect={()=>{}} metric="count"/>);
 const table=screen.getByRole('table');
 expect(within(table).getAllByRole('row')).toHaveLength(11);
 expect(within(table).getAllByRole('row')[1].textContent).toContain('Anúncio 11');
 expect(within(table).queryByText('Anúncio 0')).toBeNull();
});
