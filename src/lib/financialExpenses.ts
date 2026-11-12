import { canonicalizeSaleCategory } from '@/constants/serviceCategories';
import { collectionCalculator } from './collectionCalculator';
import type { Venda } from '@/hooks/useVendas';
import type { FechamentoDiario } from '@/hooks/useFechamentosDiarios';
export const EXPENSE_CATEGORIES = [
  { id: 'fixed', label: 'Despesas fixas' },
  { id: 'variable', label: 'Despesas variáveis' },
  { id: 'investment', label: 'Outros investimentos' },
  { id: 'influencers', label: 'Investimento em influencers', detail: 'Informe o total investido e os nomes dos influencers no campo ao lado.' },
  { id: 'non_operating', label: 'Despesas não operacionais', detail: 'Empréstimos e outros desembolsos não operacionais. Informe os detalhes ao lado.' },
  { id: 'taxes', label: 'Impostos' },
  { id: 'sales_commission', label: 'Comissões de vendas' },
  { id: 'operational_commission', label: 'Comissões operacionais', detail: 'Gestão de tráfego, captação, desenvolvimento de sites etc. Não inclua as comissões automáticas de vendas e cursos dados.' },
] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['id'];
export type MonthlyExpense = { id?: string; month: string; category: ExpenseCategory; amount: number | null; notes: string; updated_at?: string };
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const normalized = (value?: string) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function financialExpenseSummary(month: string, sales: (Pick<Venda,'data'|'valor'|'status'> & Partial<Venda>)[], collections: (Pick<FechamentoDiario,'data'|'valor_sinal'|'valor_sinal_liquido'|'status'> & Partial<FechamentoDiario>)[], expenses: {category:string;amount:number|null}[], range?: {since:string;until:string}, adSpend = 0, courses: {data:string;comissao_extra:number;comissao_paga_valor?:number;data_pagamento_comissao?:string|null}[] = [], contracts?: {received:number;pending:number;names:string[]}) {
  const active = (status: string) => !['cancelado', 'cancelada'].includes(normalized(status));
  const inRange = (date: string) => range ? date.slice(0,10)>=range.since && date.slice(0,10)<=range.until : date.startsWith(month);
  const contractNames=new Set((contracts?.names||[]).map(name=>normalized(name).replace(/[^a-z0-9]/g,'')));
  const isContractRevenue=(name:string|undefined,category:string|undefined,recurring=0)=>contractNames.has(normalized(name).replace(/[^a-z0-9]/g,'')) && (recurring>0 || ['Gestão de Tráfego Pago - Meta Ads','Gestão de Tráfego Pago - Google Ads','Assessoria 360','Social Media'].includes(canonicalizeSaleCategory(category)));
  const revenueSales=sales.filter(s=>!isContractRevenue(s.cliente,s.servico||s.produto));
  const sold = round(revenueSales.filter(s=>inRange(s.data) && active(s.status)).reduce((sum,s)=>sum+Number(s.valor||0),0));
  const since = range?.since || month+'-01';
  const until = range?.until || `${month}-${new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate()}`;
  const calculator = collectionCalculator(sales as Venda[],since,until);
  const paid = collections.filter(s=>active(s.status)&&!isContractRevenue(s.cliente,s.categoria||s.produto_servico,Number(s.valor_recorrente||0)));
  const contractReceived=contracts?.received||0,contractPending=contracts?.pending||0;
  const gross = round(contractReceived+paid.reduce((sum,s)=>sum+calculator.getCollectedGrossInPeriod(s as FechamentoDiario),0));
  const net = round(contractReceived+paid.reduce((sum,s)=>sum+calculator.getCollectedNetInPeriod(s as FechamentoDiario),0));
  const cardFees = round(Math.max(0,gross-net));
  const paidCommission=(s:typeof sales[number])=>Math.max(0,Number(s.comissao_paga_valor ?? (s.status_comissao==='paga'?s.comissao:0))||0);
  const salesCommission = round(sales.filter(s=>s.data_ultimo_pagamento_comissao&&inRange(s.data_ultimo_pagamento_comissao)).reduce((sum,s)=>sum+paidCommission(s),0));
  const undatedSalesCommission=round(sales.filter(s=>!s.data_ultimo_pagamento_comissao).reduce((sum,s)=>sum+paidCommission(s),0));
  const courseCommission = round(courses.filter(c=>c.data_pagamento_comissao&&inRange(c.data_pagamento_comissao)).reduce((sum,c)=>sum+Math.max(0,Number(c.comissao_paga_valor||0)),0));
  const undatedCourseCommission=round(courses.filter(c=>!c.data_pagamento_comissao).reduce((sum,c)=>sum+Math.max(0,Number(c.comissao_paga_valor||0)),0));
  const manualExpenses = expenses.filter(e=>e.category!=='sales_commission');
  const manualCosts = round(manualExpenses.reduce((sum,e)=>sum+Number(e.amount||0),0));
  const adTax = round(adSpend * 0.1225);
  const adTotal = round(adSpend);
  const adMedia = round(adTotal - adTax);
  const costs = round(manualCosts + adTotal + salesCommission + courseCommission);
  const result = round(net-costs);
  const projectedRevenue=round(sold+contractReceived+contractPending);
  const projected = round(projectedRevenue-cardFees-costs);
  return { contractReceived,contractPending,projectedRevenue,undatedSalesCommission,undatedCourseCommission,adMedia,adTax,adTotal,salesCommission,courseCommission,manualCosts,adSpend,sold,gross,net,cardFees,costs,totalCosts:round(costs+cardFees),result,percentage:net>0?result/net*100:null,projected,projectedPercentage:projectedRevenue>0?projected/projectedRevenue*100:null,complete:EXPENSE_CATEGORIES.filter(c=>c.id!=='sales_commission').every(c=>expenses.some(e=>e.category===c.id && e.amount!==null)) };
}
