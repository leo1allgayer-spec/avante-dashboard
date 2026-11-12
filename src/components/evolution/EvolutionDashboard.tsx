import { useMemo, useState } from "react";
import { RefreshCw, TrendingUp } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MonthlyMetricsTimeline from "@/components/MonthlyMetricsTimeline";
import { useEvolutionData } from "@/hooks/useEvolutionData";
import { change, chartRanges, clientSnapshot, courseSales, dateKey, evolutionRange, inRange, ratio, revenueSummary, salesSummary, type EvolutionPreset, type DateRange } from "@/lib/evolutionMetrics";
import { isCourseCategory } from "@/constants/serviceCategories";
import EvolutionGoal from "./EvolutionGoal";
import GoalHistoryPanel from "@/components/GoalHistoryPanel";
import BusinessCrossPanel from "./BusinessCrossPanel";
import { evolutionContractChurn } from "@/lib/clientChurn";
import EvolutionFunnel from "./EvolutionFunnel";
import { Comparison, Metric, Section, money, number, percent } from "./EvolutionPrimitives";

const presets: [EvolutionPreset, string][] = [["month", "Este mês"], ["previous", "Mês anterior"], ["3", "Últimos 3 meses"], ["6", "Últimos 6 meses"], ["12", "Últimos 12 meses"], ["year", "Ano atual"], ["custom", "Personalizado"]];
const dateLabel = (date: string) => date.split("-").reverse().join("/");
const missingCosts = "Falta um histórico consolidado de despesas e comissões quitadas. Pagamentos variáveis registram compromissos, não a quitação.";
const missingPortfolio = "Faltam datas de saída e histórico de status dos contratos. Cliente pausado não é tratado como perdido.";
const selectStyle = "h-10 max-w-full rounded-lg border border-input bg-background px-3 text-sm";

export default function EvolutionDashboard() {
  const [preset, setPreset] = useState<EvolutionPreset>("month");
  const [custom, setCustom] = useState<DateRange>(() => evolutionRange("month"));
  const [appliedCustom, setAppliedCustom] = useState(custom);
  const range = useMemo(() => evolutionRange(preset, new Date(), appliedCustom), [preset, appliedCustom]);
  const d = useEvolutionData(range);
  const previous = d.previous;
  const ready = Boolean(d.sales.data && d.closings.data);
  const calculated = useMemo(() => {
    if (!d.sales.data || !d.closings.data) return null;
    const sales = d.sales.data, closings = d.closings.data;
    return {
      current: revenueSummary(sales, closings, range), previous: revenueSummary(sales, closings, previous),
      sales: salesSummary(sales, range), oldSales: salesSummary(sales, previous),
      courses: salesSummary(courseSales(sales), range), oldCourses: salesSummary(courseSales(sales), previous),
      monthly: chartRanges(range).map(month => ({ ...month, label: new Date(`${month.start}T12:00:00`).toLocaleDateString("pt-BR", month.start === month.end ? { day: "2-digit", month: "2-digit" } : { month: "short", year: "2-digit" }), revenue: revenueSummary(sales, closings, month).total })),
    };
  }, [d.sales.data, d.closings.data, range, previous.start, previous.end]);
  const clients = useMemo(() => d.clients.data ? clientSnapshot(d.clients.data, range) : null, [d.clients.data, range]);
  const oldClients = useMemo(() => d.clients.data ? clientSnapshot(d.clients.data, previous) : null, [d.clients.data, previous.start, previous.end]);
  const contractChurn = useMemo(() => d.clients.data ? evolutionContractChurn(d.clients.data, range) : null, [d.clients.data, range]);
  const investment = d.investment(range), oldInvestment = d.investment(previous);
  const meetings = d.meetingCounts(range), oldMeetings = d.meetingCounts(previous);
  const leads = d.leads(range), oldLeads = d.leads(previous);
  const mqlInRange = (period: DateRange) => d.crm.data?.daily
    ? Object.entries(d.crm.data.daily).filter(([date]) => inRange(date, period)).reduce((sum, [, count]) => sum + Number(count || 0), 0)
    : null;
  const mql = mqlInRange(range), oldMql = mqlInRange(previous);
  const revenue = calculated?.current.total ?? null, oldRevenue = calculated?.previous.total ?? null;
  const sources = [...new Set([...Object.keys(calculated?.current.categories || {}), ...Object.keys(calculated?.previous.categories || {})])].map(name => ({ name, value: calculated?.current.categories[name] || 0, previous: calculated?.previous.categories[name] || 0 })).sort((a,b) => b.value - a.value);
  const courseSources = sources.filter(s => isCourseCategory(s.name));
  const financialRows = calculated?.monthly.map(row => ({ ...row, costs: d.investment(row), profit: null })) || [];
  const forecastPayments = d.payments.data?.filter(p => {
    if (!/^\d{4}-\d{2}$/.test(p.mes_ano)) return false;
    const maxDay = new Date(Number(p.mes_ano.slice(0,4)), Number(p.mes_ano.slice(5,7)), 0).getDate();
    return inRange(`${p.mes_ano}-${String(Math.min(maxDay, Math.max(1,p.dia_pagamento))).padStart(2,"0")}`, range);
  }).reduce((sum,p) => sum + Number(p.valor || 0), 0) ?? null;
  const cac = ratio(investment, clients?.joined ?? null), oldCac = ratio(oldInvestment, oldClients?.joined ?? null);
  const financialError = d.sales.isError || d.closings.isError;
  const queries = [d.sales,d.closings,d.payments,d.clients,d.metrics,d.meta,d.crm,d.agenda];
  const refreshing = queries.some(q => q.isFetching);
  const errorNames = [d.sales.isError && "vendas", d.closings.isError && "recebimentos", d.clients.isError && "clientes", d.payments.isError && "pagamentos", d.metrics.isError && "metas", d.meta.isError && "anúncios", d.crm.isError && "leads do CRM", d.agenda.isError && "agenda"].filter(Boolean);
  const revenueChange = change(revenue, oldRevenue);
  const insights = [
    revenueChange == null ? "Comparação de faturamento indisponível: o período anterior não tem uma base positiva." : `Faturamento ${revenueChange > 0 ? "aumentou" : revenueChange < 0 ? "diminuiu" : "ficou estável em"} ${percent(Math.abs(revenueChange))} em relação ao período anterior.`,
    sources[0]?.value > 0 && revenue ? `${sources[0].name} representa ${percent(sources[0].value / revenue * 100)} do faturamento do período.` : null,
    clients?.recordedJoined ? `${clients.recordedJoined} cliente(s) com início de contrato registrado neste período.` : null,
    cac != null ? `O investimento em anúncios por novo cliente da carteira foi ${money(cac)}. Outros custos de aquisição não estão identificados.` : null,
    range.end >= dateKey(new Date()) ? "O período inclui o mês em andamento; compare os resultados considerando que ele ainda não terminou." : null,
    "Lucro, churn e LTV aguardam histórico financeiro e de contratos suficiente para um cálculo confiável.",
  ].filter(Boolean);
  const renderSources = (rows: typeof sources) => rows.length ? <div className="space-y-4">{rows.map(s => <div key={s.name} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_160px_210px]"><div className="min-w-0"><p className="mb-2 break-words text-sm">{s.name}</p><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${revenue && revenue > 0 ? Math.max(0,Math.min(100,s.value / revenue * 100)) : 0}%` }}/></div></div><div className="text-sm tabular-nums"><strong>{money(s.value)}</strong><span className="ml-2 text-xs text-muted-foreground">{percent(revenue && revenue > 0 ? s.value / revenue * 100 : null)}</span></div><Comparison current={s.value} previous={s.previous}/></div>)}</div> : <p className="text-sm text-muted-foreground">{ready ? "Sem recebimentos no período." : "Dados insuficientes: aguardando recebimentos."}</p>;

  return <div className="min-w-0 space-y-6">
    <Section title="Visão executiva" description="Faturamento por data do recebimento, líquido das taxas de pagamento. Novas vendas representam valores contratados. MRR e clientes ativos são a posição atual.">
      <div className="flex flex-wrap items-end gap-3"><label className="flex flex-col gap-2 text-xs text-muted-foreground">Período<select aria-label="Período global" className={selectStyle} value={preset} onChange={e => setPreset(e.target.value as EvolutionPreset)}>{presets.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {preset === "custom" && <><label className="min-w-0 text-xs text-muted-foreground">Data inicial<Input aria-label="Data inicial" type="date" className="mt-2 w-40 max-w-full" value={custom.start} onChange={e => setCustom({...custom,start:e.target.value})}/></label><label className="min-w-0 text-xs text-muted-foreground">Data final<Input aria-label="Data final" type="date" className="mt-2 w-40 max-w-full" value={custom.end} onChange={e => setCustom({...custom,end:e.target.value})}/></label><Button disabled={!custom.start || !custom.end || custom.start > custom.end} onClick={() => setAppliedCustom(custom)}>Aplicar período</Button></>}
        <Button variant="outline" className="sm:ml-auto" disabled={refreshing} onClick={() => queries.forEach(q => { void q.refetch(); })}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}/>{refreshing ? "Atualizando" : "Atualizar dados"}</Button>
      </div>
      {custom.start > custom.end && preset === "custom" && <p role="alert" className="mt-2 text-sm text-destructive">A data final deve ser igual ou posterior à inicial.</p>}
      <p className="mt-4 text-xs text-muted-foreground">{dateLabel(range.start)} a {dateLabel(range.end)} · Comparação: {dateLabel(previous.start)} a {dateLabel(previous.end)}</p>
      {errorNames.length > 0 && <p role="alert" className="mt-3 text-sm text-amber-500">Não foi possível atualizar: {errorNames.join(", ")}. Use “Atualizar dados” para tentar novamente. Valores carregados anteriormente podem estar desatualizados.</p>}
    </Section>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <Metric title="Faturamento coletado" value={money(revenue)} current={revenue} previous={oldRevenue} detail={financialError ? "Falha na consulta financeira" : "Recebimentos líquidos no período"}/>
      <Metric title="Lucro líquido" value="Dados insuficientes" detail={missingCosts}/>
      <Metric title="Margem líquida" value="Dados insuficientes" detail="Depende do lucro líquido e de faturamento maior que zero."/>
      <Metric title="MRR atual" value={money(clients?.mrr ?? null)} detail={clients?.missingContracts ? `${clients.missingContracts} contrato(s) ativo(s) sem valor mensal. Valores conhecidos: ${money(clients.knownMrr)}.` : "Contratos ativos MRR, excluindo TCV e permutas. Sem histórico para comparar."}/>
      <Metric title="Clientes ativos hoje" value={number(clients?.active ?? null)} detail={`Entradas no período: ${number(clients?.joined ?? null)}. Saídas: dados insuficientes. Sem histórico para comparar a posição ativa.`}/>
      <Metric title="Novas vendas" value={number(calculated?.sales.count ?? null)} current={calculated?.sales.count ?? null} previous={calculated?.oldSales.count ?? null} detail={`${money(calculated?.sales.value ?? null)} contratados · itens da mesma compra agrupados`}/>
    </div>
    <EvolutionGoal range={range} metrics={d.metrics.data} sales={d.sales.data} closings={d.closings.data}/>
    <GoalHistoryPanel month={range.end.slice(0, 7)}/>
    <Section title="Evolução financeira" description="Faturamento × custos × lucro. A série de custos mostra apenas anúncios com imposto de 12,25%. O lucro não é desenhado enquanto faltar a base completa de despesas.">
      <div className="h-72 min-w-0"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={financialRows} margin={{left:0,right:12,top:8,bottom:0}}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3"/><XAxis dataKey="label" tick={{fontSize:11}}/><YAxis width={70} tick={{fontSize:11}} tickFormatter={v => new Intl.NumberFormat("pt-BR", {notation:"compact"}).format(v)}/><Tooltip contentStyle={{background:"hsl(var(--popover))",borderColor:"hsl(var(--border))",borderRadius:12}} formatter={(v:number) => money(v)}/><Legend wrapperStyle={{fontSize:11}}/><Area dataKey="revenue" name="Faturamento coletado" fill="#3b82f622" stroke="#3b82f6" strokeWidth={3}/><Line dataKey="costs" name="Custo identificado: anúncios" stroke="#f59e0b" strokeWidth={2} dot={{r:3}}/><Line dataKey="profit" name="Lucro (dados insuficientes)" stroke="#10b981" connectNulls={false}/></ComposedChart></ResponsiveContainer></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric title="Anúncios + imposto" value={money(investment)} current={investment} previous={oldInvestment} detail="Investimento utilizado nos indicadores de aquisição"/><Metric title="Pagamentos variáveis previstos" value={money(forecastPayments)} detail="Compromissos cadastrados com vencimento no período. Não equivalem ao total de despesas pagas e não foram somados aos anúncios."/></div>
    </Section>
    <Section title="Receita por fonte" description="Categorias existentes em produtos e serviços. Participação sobre o faturamento coletado, sem alterar os lançamentos.">{renderSources(sources)}</Section>
    <EvolutionFunnel leads={leads} mql={mql} scheduled={meetings.scheduled} held={meetings.held} sales={calculated?.sales.count ?? null} ticket={calculated?.sales.ticket ?? null} investment={investment} previous={{leads:oldLeads,mql:oldMql,scheduled:oldMeetings.scheduled,held:oldMeetings.held,sales:calculated?.oldSales.count ?? null}}/>
    <Section title="Evolução da carteira de clientes" description="Carteira de serviços cadastrada na gestão de clientes; inclui as áreas de Meta Ads e Google Ads.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric title="Ativos hoje" value={number(clients?.active ?? null)} detail="Posição atual, independente do filtro"/><Metric title="Novos clientes" value={number(clients?.joined ?? null)} current={clients?.joined ?? null} previous={oldClients?.joined ?? null} detail={clients?.joined == null ? `Faltam datas de início. Entradas identificadas: ${number(clients?.recordedJoined ?? null)}.` : "Pela data de início do contrato"}/><Metric title="Contratos encerrados" value={contractChurn ? String(contractChurn.closed) : "Dados insuficientes"} detail="Encerramentos confirmados no cadastro; cobertura depende do preenchimento da equipe."/><Metric title="Saldo líquido de clientes" value="Dados insuficientes" detail="Novos clientes menos clientes perdidos"/><Metric title="Churn contratual" value={percent(contractChurn?.rate ?? null)} detail={`Perdas da carteira de abertura ÷ contratos na abertura. ${contractChurn?.missing ?? "—"} cadastro(s) incompleto(s). Base contratual atual, sem reconstruir ciclos anteriores.`}/></div>
      <div className="mt-4 rounded-xl border border-dashed p-6"><h3 className="text-sm font-medium">Clientes ativos ao longo do tempo</h3><p className="mt-2 text-sm text-muted-foreground">Dados insuficientes</p><p className="mt-1 text-xs text-muted-foreground">{missingPortfolio}</p></div>
    </Section>
    <Section title="Aquisição e valor do cliente" description="CAC da carteira de serviços: anúncios ÷ clientes com início de contrato no período. O investimento pode atender também aos cursos; a integração atual não separa esse gasto por público.">
      <div className="grid gap-3 sm:grid-cols-3"><Metric title="CAC — base anúncios" value={money(cac)} current={cac} previous={oldCac} detail="Demais custos comerciais não possuem identificação de aquisição. Não entram automaticamente no cálculo."/><Metric title="LTV médio" value="Dados insuficientes" detail="Faltam vínculos completos entre cliente e recebimentos, e histórico de duração e encerramento dos contratos."/><Metric title="LTV / CAC" value="Dados insuficientes" detail="Depende de LTV histórico e CAC maior que zero."/></div>
    </Section>
    <Section title="Performance dos cursos" description="Cursos identificados pelas categorias já cadastradas. O ranking usa recebimentos; o ticket usa valores das novas compras de cursos.">
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Faturamento com cursos" value={money(calculated?.current.courses ?? null)} current={calculated?.current.courses ?? null} previous={calculated?.previous.courses ?? null}/><Metric title="Vendas de cursos" value={number(calculated?.courses.count ?? null)} current={calculated?.courses.count ?? null} previous={calculated?.oldCourses.count ?? null}/><Metric title="Alunos compradores" value={number(calculated?.courses.students ?? null)} current={calculated?.courses.students ?? null} previous={calculated?.oldCourses.students ?? null} detail="Compradores distintos nas vendas de cursos; não comprova matrícula ou presença."/><Metric title="Ticket de cursos" value={money(calculated?.courses.ticket ?? null)} current={calculated?.courses.ticket ?? null} previous={calculated?.oldCourses.ticket ?? null}/></div>
      <h3 className="mb-4 text-sm font-medium">Ranking por faturamento</h3>{renderSources(courseSources)}
    </Section>
    <BusinessCrossPanel sales={d.sales.data} closings={d.closings.data} clients={d.clients.data} range={range}/>
    <Section title="Insights do período" action={<TrendingUp className="h-5 w-5 text-primary"/>}><ul className="space-y-3">{insights.map(text => <li key={text} className="flex gap-3 text-sm leading-relaxed"><span className="text-primary" aria-hidden="true">→</span>{text}</li>)}</ul></Section>
    <Section title="Análises detalhadas" description="Gráficos anteriores preservados com o filtro global. Aqui, leads vêm dos anúncios e MQL do CRM; no funil executivo, leads vêm do CRM. O CAC histórico desta seção usa compradores, conforme a metodologia original.">
      {ready && d.metrics.data && d.meta.data && d.crm.data ? <MonthlyMetricsTimeline monthlyOnly range={range} source={{metrics:d.metrics.data,vendas:d.sales.data!.filter(s => inRange(s.data,range)),meta:d.meta.data}} mql={d.crm.data}/> : <p className="text-sm text-muted-foreground">{financialError || d.metrics.isError || d.meta.isError || d.crm.isError ? "Dados insuficientes: as análises detalhadas precisam das consultas financeiras, métricas, anúncios e CRM. Tente atualizar os dados." : "Carregando análises detalhadas..."}</p>}
    </Section>
  </div>;
}
