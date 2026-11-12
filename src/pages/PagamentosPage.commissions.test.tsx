// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import PagamentosPage from './PagamentosPage';
vi.mock('@/components/DashboardLayout',()=>({default:({children}:any)=><>{children}</>}));
vi.mock('@/components/PageTransition',()=>({default:({children}:any)=><>{children}</>}));
vi.mock('@/components/PagamentosVariaveis',()=>({default:()=>null}));
vi.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:vi.fn()})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{channel:()=>{const channel={on:()=>channel,subscribe:()=>channel};return channel;},removeChannel:vi.fn()}}));
vi.mock('@/hooks/useVendas',()=>({useVendas:()=>({data:[
 {id:'old',data:'2026-09-01',cliente:'Venda antiga paga em outubro',vendedor:'Lucas',produto:'Meta',servico:'',valor:1000,comissao:150,comissao_paga_valor:150,data_ultimo_pagamento_comissao:'2026-10-10'},
 {id:'current',data:'2026-10-01',cliente:'Venda atual',vendedor:'Lucas',produto:'Meta',servico:'',valor:1000,comissao:100,comissao_paga_valor:100,data_ultimo_pagamento_comissao:'2026-10-10'},
 {id:'cents',data:'2026-10-01',cliente:'Pagamento pequeno',vendedor:'Lucas',produto:'Meta',servico:'',valor:10,comissao:1,comissao_paga_valor:0.45,data_ultimo_pagamento_comissao:'2026-10-10'},
 {id:'unknown',data:'2026-10-01',cliente:'Sem data de pagamento',vendedor:'Lucas',produto:'Meta',servico:'',valor:1000,comissao:100,comissao_paga_valor:100},
 {id:'jodoe-site',data:'2026-10-16',cliente:'Jodoe',vendedor:'Lucas',produto:'Desenvolvimento de Site',servico:'',valor:2000,origem:'Indicação',comissao_paga_valor:0},
 {id:'jodoe-google',data:'2026-10-16',cliente:'Jodoe',vendedor:'Lucas',produto:'Gestão de Tráfego Pago - Google Ads',servico:'',valor:8000,origem:'Indicação',comissao_paga_valor:0},
 {id:'denis',data:'2026-10-16',cliente:'Denis Martins',vendedor:'Lucas',produto:'CRM/Treinamento Comercial',servico:'',valor:15900,origem:'Upsell',comissao_paga_valor:0},
 {id:'marmo-meta',data:'2026-08-06',cliente:'Espaço marmo',vendedor:'',produto:'Gestão de Tráfego Pago - Meta Ads',servico:'',valor:2000,origem:'Social Seller',comissao_paga_valor:50,data_ultimo_pagamento_comissao:'2026-09-02'},
 {id:'marmo-site',data:'2026-08-06',cliente:'Espaço marmo',vendedor:'',produto:'Desenvolvimento de Site',servico:'',valor:2000,origem:'Social Seller',comissao_paga_valor:50,data_ultimo_pagamento_comissao:'2026-09-02'},
 {id:'marmo-google',data:'2026-08-06',cliente:'Espaço marmo',vendedor:'',produto:'Gestão de Tráfego Pago - Google Ads',servico:'',valor:2000,origem:'Social Seller',comissao_paga_valor:50,data_ultimo_pagamento_comissao:'2026-09-02'},
 {id:'marmo-content',data:'2026-08-06',cliente:'Espaço marmo',vendedor:'',produto:'Captacao/Edicao de Conteudo',servico:'',valor:2000,origem:'Social Seller',comissao_paga_valor:50,data_ultimo_pagamento_comissao:'2026-09-02'},
 ],isLoading:false})}));
vi.mock('@/hooks/useFechamentosDiarios',()=>({useFechamentosDiarios:()=>({data:[
 {id:'site-receipt',venda_id:'jodoe-site',categoria:'Desenvolvimento de Site',valor_sinal:2000,valor_sinal_liquido:2000,status:'a receber'},
 {id:'google-receipt',venda_id:'jodoe-google',categoria:'Gestão de Tráfego Pago - Google Ads',valor_sinal:3000,valor_sinal_liquido:3000,status:'a receber'},
 {id:'denis-receipt',venda_id:'denis',categoria:'CRM/Treinamento Comercial',valor_sinal:7900,valor_sinal_liquido:7900,status:'a receber'},
 {id:'marmo-meta-receipt',venda_id:'marmo-meta',categoria:'Gestão de Tráfego Pago - Meta Ads',valor_sinal:0,valor_sinal_liquido:0,valor_a_entrar:2000,status:'a receber'},
 {id:'marmo-site-receipt',venda_id:'marmo-site',categoria:'Desenvolvimento de Site',valor_sinal:2000,valor_sinal_liquido:2000,status:'recebido'},
 {id:'marmo-google-receipt',venda_id:'marmo-google',categoria:'Gestão de Tráfego Pago - Google Ads',valor_sinal:2000,valor_sinal_liquido:2000,status:'recebido'},
 {id:'marmo-content-receipt',venda_id:'marmo-content',categoria:'Captacao/Edicao de Conteudo',valor_sinal:2000,valor_sinal_liquido:2000,status:'recebido'},
 ]})}));
vi.mock('@/hooks/usePagamentosVariaveis',()=>({usePagamentosVariaveis:()=>({data:[]})}));
vi.mock('@/hooks/clients/useGestaoClients',()=>({useClients:()=>({clients:[],loading:false})}));
vi.mock('@/components/ui/select',()=>({Select:({children,value,onValueChange}:any)=><select value={value} onChange={e=>onValueChange(e.target.value)}>{children}</select>,SelectTrigger:()=>null,SelectValue:()=>null,SelectContent:({children}:any)=><>{children}</>,SelectItem:({children,value}:any)=><option value={value}>{children}</option>}));
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,9,28));});afterEach(()=>{cleanup();vi.useRealTimers();});
it('shows the full paid base separately from the individual share and excludes unknown payment dates',()=>{
 render(<PagamentosPage/>);expect(screen.getByText('Venda antiga paga em outubro')).toBeTruthy();expect(screen.getByText('Pagamento pequeno')).toBeTruthy();expect(screen.queryByText('Sem data de pagamento')).toBeNull();
 expect(screen.getByText(/1 pagamentos antigos de comissão/)).toBeTruthy();
 const header=screen.getByText('Total dos três vendedores já recebido:').parentElement!;
 expect(header.textContent?.replace(/\s/g,' ')).toContain('R$ 250,45');expect(header.textContent?.replace(/\s/g,' ')).toContain('R$ 83,49');
});
it('lists unpaid service commissions separately without treating them as already paid',()=>{
 render(<PagamentosPage/>);
 const jodoe=screen.getByText('Jodoe').closest('tr')!.textContent!.replace(/\s/g,' ');
 expect(jodoe).toContain('R$ 750,00');expect(jodoe).toContain('R$ 250,00');
 const denis=screen.getByText('Denis Martins').closest('tr')!.textContent!.replace(/\s/g,' ');
 expect(denis).toContain('R$ 1.185,00');expect(denis).toContain('R$ 395,00');
 const header=screen.getByText('Total dos três vendedores a receber:').parentElement!.textContent!.replace(/\s/g,' ');
 expect(header).toContain('R$ 1.935,00');expect(header).toContain('R$ 645,00');
 expect(screen.getByText('Total dos três vendedores já recebido:').parentElement!.textContent!.replace(/\s/g,' ')).toContain('R$ 250,45');
 expect(screen.queryByText('Espaço marmo')).toBeNull();
});
