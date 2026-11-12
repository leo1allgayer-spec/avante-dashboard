// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import FinancialExpensesPage from './FinancialExpensesPage';
const mocks=vi.hoisted(()=>({save:vi.fn().mockResolvedValue(undefined),expenses:[] as any[],adsError:false,adsSpend:'0',metaClients:[] as any[],googleClients:[] as any[]}));
vi.mock('@/components/DashboardLayout',()=>({default:({children}:any)=><div>{children}</div>}));
vi.mock('@/components/PageTransition',()=>({default:({children}:any)=><div>{children}</div>}));
vi.mock('@/components/MonthYearSelect',()=>({default:()=>null}));
vi.mock('@/hooks/useFechamentosDiarios',()=>({useFechamentosDiarios:()=>({data:[{data:new Date().toISOString().slice(0,10),valor_sinal:1000,valor_sinal_liquido:950,status:'recebido'}]})}));
vi.mock('@/hooks/useVendas',()=>({useVendas:()=>({data:[]})}));
vi.mock('@/hooks/useFinancialExpenses',()=>({useFinancialExpensesRange:()=>({data:mocks.expenses,isLoading:false,isError:false}),useFinancialExpenses:()=>({data:mocks.expenses,isLoading:false,isError:false}),useSaveFinancialExpenses:()=>({mutateAsync:mocks.save,isPending:false})}));
vi.mock('@/hooks/clients/useGestaoClients',()=>({useClients:(area:string)=>({clients:area==='meta_ads'?mocks.metaClients:mocks.googleClients,loading:false,loadError:false})}));
vi.mock('@/hooks/useCursosDados',()=>({useCursosDados:()=>({data:[],isLoading:false,isError:false})}));
vi.mock('@/hooks/useMetaAds',()=>({useMetaAds:()=>({data:{accountInsights:{spend:mocks.adsSpend}},isLoading:false,isError:mocks.adsError})}));

afterEach(()=>{cleanup();mocks.save.mockClear();mocks.expenses=[];mocks.adsError=false;mocks.adsSpend='0';mocks.metaClients=[];mocks.googleClients=[];});
it('saves explicit zero values and leaves unfilled categories pending',async()=>{
 render(<FinancialExpensesPage/>);
 const input=screen.getByRole('spinbutton',{name:/Valor de Despesas fixas/});
 fireEvent.change(input,{target:{value:'0'}});
 fireEvent.click(screen.getAllByRole('button',{name:'Salvar despesas'})[0]);
 await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));
 const rows=mocks.save.mock.calls[0][0];
 expect(rows.find((r:any)=>r.category==='fixed').amount).toBe(0);
 expect(rows.find((r:any)=>r.category==='taxes').amount).toBeNull();
 expect(rows.some((r:any)=>r.category==='card_fees')).toBe(false);
});
it('does not replace unsaved financial edits when query data changes',async()=>{
 const view=render(<FinancialExpensesPage/>);
 const input=screen.getByRole('spinbutton',{name:/Valor de Despesas fixas/}) as HTMLInputElement;
 fireEvent.change(input,{target:{value:'123.45'}});
 mocks.expenses=[{month:new Date().toISOString().slice(0,7)+'-01',category:'fixed',amount:500,notes:''}];
 view.rerender(<FinancialExpensesPage/>);
 expect(input.value).toBe('123.45');
 expect(screen.getByText('Prévia com alterações não salvas')).toBeTruthy();
});

it('uses the chosen dates for ad spend and warns about full monthly manual costs',()=>{
 render(<FinancialExpensesPage/>);
 fireEvent.change(screen.getByLabelText('Analisar de'),{target:{value:'2026-09-15'}});
 fireEvent.change(screen.getByLabelText('Até'),{target:{value:'2026-10-20'}});
 expect(screen.getByText(/Intervalo com mês parcial/)).toBeTruthy();
 expect((screen.getByLabelText('Analisar de') as HTMLInputElement).value).toBe('2026-09-15');
});
it('does not show a misleading profit when automatic ads fail',()=>{
 mocks.adsError=true;
 render(<FinancialExpensesPage/>);
 expect(screen.getByRole('alert').textContent).toContain('resultado está incompleto');
 const label=screen.getByText('Lucro sobre valores recebidos');
 expect(label.parentElement?.textContent).toContain('—');
});

it('uses contract paid and pending amounts without duplicating Meta and Google clients',()=>{
 const month=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date()).slice(0,7);
 const client={id:'meta',name:'Cliente A',status:'Ativo',contractType:'MRR',contractValue:2000,monthlyContractValue:2000,receivedMonth:month,monthlyReceived:1200,paymentStatus:'a receber'};
 mocks.metaClients=[client,{...client,id:'paused',name:'Pausado',status:'Pausado'}];
 mocks.googleClients=[{...client,id:'google'}];
 render(<FinancialExpensesPage/>);
 expect(screen.getByText('Contratos: recebido no mês').parentElement?.textContent).toContain((1200).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
 expect(screen.getByText('Contratos: a receber no mês').parentElement?.textContent).toContain((800).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
 expect(screen.getByText('Recebido líquido').parentElement?.textContent).toContain((2150).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
});
