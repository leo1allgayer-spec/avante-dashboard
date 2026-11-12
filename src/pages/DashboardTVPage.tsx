import {collectionCalculator} from "@/lib/collectionCalculator";
import {TV_PERIODS, tvPeriodRange, tvRangeDays, type TVPeriod} from "@/lib/tvPeriod";
import SpotifyTVPlayer from "@/components/SpotifyTVPlayer";
import { contributionMargin } from "@/lib/contributionMargin";
import { TVVisibilityProvider, TVHideButton, TVSecret, TVRestoreButton } from "@/components/TVVisibility";
import { answeredCallRate } from "@/lib/crmCallRate";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useMonthMetrics, useMetricsRange } from "@/hooks/useMetrics";
import { useClients } from "@/hooks/useClients";
import { useVendas } from "@/hooks/useVendas";
import { useCursosDados } from "@/hooks/useCursosDados";
import { isCourseCategory } from "@/constants/serviceCategories";
import { useMeetings } from "@/hooks/clients/useMeetings";
import { agendaActivityCounts, dailyMeetingGoal, defaultMeetingAnalytics, meetingAnalytics } from "@/lib/meetingAnalytics";
import { useMeetingAdInvestment } from "@/hooks/clients/useMeetingAdInvestment";
import { useMeetingMonthlyMetrics } from "@/hooks/clients/useMeetingMetrics";
import { useFechamentosDiarios } from "@/hooks/useFechamentosDiarios";
import { useMetaAds } from "@/hooks/useMetaAds";
import { useCrmMql } from "@/hooks/useCrmMql";
import { useCrmCalls } from "@/hooks/useCrmCalls";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import CountUp from "react-countup";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateInRange = (date: string | null | undefined, start: string, end: string) =>
  Boolean(date && date >= start && date <= end);

const normalizeStatus = (status?: string | null) =>
  String(status || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const getActionValue = (actions: Array<{ action_type: string; value: string }> | undefined, types: string[]) => {
  if (!actions?.length) return 0;
  for (const type of types) {
    const found = actions.find((action) => action.action_type === type);
    if (found) return Number(found.value || 0);
  }
  return 0;
};

const getLeadsFromActions = (actions: Array<{ action_type: string; value: string }> | undefined) =>
  getActionValue(actions, [
    "lead",
    "onsite_conversion.lead_grouped",
    "offsite_conversion.fb_pixel_lead",
    "offsite_complete_registration_add_meta_leads",
    "offsite_content_view_add_meta_leads",
  ]);

const getConversationsFromActions = (actions: Array<{ action_type: string; value: string }> | undefined) =>
  getActionValue(actions, [
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.total_messaging_connection",
    "onsite_conversion.messaging_first_reply",
  ]);

const getCollectedNet = (item: { valor_sinal?: number | null; valor_sinal_liquido?: number | null }) =>
  Number(item.valor_sinal_liquido ?? item.valor_sinal ?? 0);

const getReceivableInPeriod = (item: {
  data: string;
  previsao_entrada?: string | null;
  parcelas_datas?: string[] | null;
  valor_parcela?: number | null;
  valor_a_entrar?: number | null;
}, start: string, end: string) => {
  const parcelDates = Array.isArray(item.parcelas_datas) ? item.parcelas_datas : [];
  const parcelsInRange = parcelDates.filter((date) => date >= start && date <= end);
  if (parcelsInRange.length > 0 && Number(item.valor_parcela || 0) > 0) {
    return parcelsInRange.length * Number(item.valor_parcela || 0);
  }
  if (item.previsao_entrada && dateInRange(item.previsao_entrada, start, end)) {
    return Number(item.valor_a_entrar || 0);
  }
  if (dateInRange(item.data, start, end) && !item.previsao_entrada && parcelDates.length === 0) {
    return Number(item.valor_a_entrar || 0);
  }
  return 0;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "hsl(260, 22%, 12%)", border: "1px solid hsl(260, 18%, 18%)" }}>
      <p className="text-slate-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-white font-medium">
          {p.name}: {typeof p.value === "number" && p.value > 100 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const DashboardTVPage = () => {
  const [period, setPeriod] = useState<TVPeriod>(() => {
    try { const saved=localStorage.getItem('tv-period'); return TV_PERIODS.some(p=>p.value===saved)?saved as TVPeriod:'month'; } catch { return 'month'; }
  });
  const [now, setNow] = useState(new Date());
  const [tvScale, setTvScale] = useState(() => Math.min(window.innerWidth / 1600, window.innerHeight / 900));
  useEffect(() => {
    const fitScreen = () => setTvScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900));
    window.addEventListener('resize', fitScreen);
    return () => window.removeEventListener('resize', fitScreen);
  }, []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: monthData } = useMonthMetrics();
  const { data: clients = [] } = useClients();

  const { data: vendas = [] } = useVendas();
  const { data: cursosDados = [], isSuccess: courseCostsReady } = useCursosDados();
  const { meetings, loading: meetingsLoading, syncing: meetingsSyncing } = useMeetings();
  const { data: fechamentos = [] } = useFechamentosDiarios();
  const { data: metaToday } = useMetaAds({ datePreset: "today" });


  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "#f59e0b", "#ef4444", "#8b5cf6"];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const invalidateLiveData = () => {
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["cursos_dados"] });
      queryClient.invalidateQueries({ queryKey: ["meeting-monthly-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["fechamentos_diarios"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    };

    const interval = window.setInterval(invalidateLiveData, 5 * 60 * 1000);
    const invalidate = (queryKey: string[]) => () => queryClient.invalidateQueries({ queryKey });
    const channel = supabase
      .channel("dashboard-tv-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_metrics" }, invalidate(["daily-metrics"]))
      .on("postgres_changes", { event: "*", schema: "public", table: "vendas" }, invalidate(["vendas"]))
      .on("postgres_changes", { event: "*", schema: "public", table: "cursos_dados" }, invalidate(["cursos_dados"]))
      .on("postgres_changes", { event: "*", schema: "public", table: "fechamentos_diarios" }, invalidate(["fechamentos_diarios"]))
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, invalidate(["clients"]))
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, invalidate(["meeting-monthly-metrics"]))
      .subscribe();

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const todayKey = formatLocalDate(now);
  const range = tvPeriodRange(period, now);
  const rangeStart = range.start;
  const rangeEnd = range.end;
  const chartStart = range.chartStart;
  const { data: metaMonth, isFetching: periodAdsLoading, isError: periodAdsError } = useMetaAds({ datePreset: "custom", since: rangeStart, until: rangeEnd });
  const { data: goalMetrics = [] } = useMetricsRange(rangeStart.slice(0,7)+'-01', rangeEnd);
  const { data: chartMetrics = [] } = useMetricsRange(chartStart, todayKey);
  const { data: chartMeta } = useMetaAds({ datePreset: "custom", since: chartStart, until: todayKey });
  const monthStart = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const { data: crmMql } = useCrmMql(rangeStart < chartStart ? rangeStart : chartStart, rangeEnd);
  const crmCalls = useCrmCalls(todayKey);
  const meetingInvestment = useMeetingAdInvestment(monthStart.slice(0, 7), {since:rangeStart, until:rangeEnd < todayKey ? rangeEnd : todayKey});
  const meetingMetrics = useMeetingMonthlyMetrics(monthStart.slice(0, 7));
  const meetingSettings = { ...defaultMeetingAnalytics, ...meetingMetrics.data?.analytics };
  const monthlyMeetingTotals = meetingAnalytics(meetings, monthStart.slice(0, 7), meetingSettings,
    meetingMetrics.data || { meetings_scheduled: 0, meetings_held: 0 });
  const selectedMeetings = meetings.filter(m => dateInRange(m.date,rangeStart,rangeEnd));
  const selectedMeetingCounts = agendaActivityCounts(selectedMeetings.map(m=>({...m,meetingType:m.meetingType==='reuniao_vendas'?'reuniao':m.meetingType})), '');
  const meetingTotals = period==='month' && meetingSettings.mode==='manual' ? monthlyMeetingTotals : {scheduled:selectedMeetingCounts.meetingsScheduled,held:selectedMeetingCounts.meetingsHeld};
  const scheduledGoal = meetingSettings.scheduledGoal ?? meetingMetrics.data?.scheduling_goal ?? 0;
  const heldGoal = meetingSettings.heldGoal ?? 0;
  const costPerMeeting = (quantity: number) => quantity > 0 && !meetingInvestment.isError && meetingInvestment.data?.investment != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(meetingInvestment.data.investment / quantity)
    : "—";
  const agendaToday = useMemo(() => agendaActivityCounts(meetings.map(m=>({...m,meetingType:m.meetingType==='reuniao_vendas'?'reuniao':m.meetingType})), todayKey), [meetings, todayKey]);

  const tvData = useMemo(() => {
    const vendasMes = vendas.filter((v) => dateInRange(v.data, rangeStart, rangeEnd) && normalizeStatus(v.status) !== "cancelada");
    const vendasHoje = vendasMes.filter((v) => v.data === todayKey);
    const cursosVendidosMes = vendasMes.filter((v) => isCourseCategory(v.servico || v.produto));
    const cursosFeitosMes = cursosDados.filter((c) => dateInRange(c.data, rangeStart, rangeEnd) && !!c.survey_response_id);

    const fechamentosAtivos = fechamentos.filter((f) => normalizeStatus(f.status) !== "cancelado");
    const fechamentosMes = fechamentosAtivos.filter((f) =>
      dateInRange(f.data, rangeStart, rangeEnd) ||
      dateInRange(f.previsao_entrada, rangeStart, rangeEnd) ||
      (Array.isArray(f.parcelas_datas) && f.parcelas_datas.some((date) => dateInRange(date, rangeStart, rangeEnd))) ||
      (Number(f.valor_recorrente || 0) > 0 && f.data <= rangeEnd)
    );
    const totalVendidoMes = vendasMes.reduce((sum, venda) => sum + Number(venda.valor || 0), 0);
    const calculator = collectionCalculator(vendas,rangeStart,rangeEnd);
    const faturamentoMes = fechamentosAtivos.reduce((sum,item)=>sum+calculator.getCollectedNetInPeriod(item),0);
    const dayCalculator = collectionCalculator(vendas,todayKey,todayKey);
    const faturamentoHoje = fechamentosAtivos.reduce((sum,item)=>sum+dayCalculator.getCollectedNetInPeriod(item),0);
    const aReceberMes = fechamentosMes.reduce(
      (sum, item) => sum + getReceivableInPeriod(item, rangeStart, rangeEnd),
      0,
    );

    const monthActionRows = (metaMonth?.campaignInsights?.length ? metaMonth.campaignInsights : metaMonth?.dailyInsights) || [];
    const todayActionRows = (metaToday?.campaignInsights?.length ? metaToday.campaignInsights : metaToday?.dailyInsights) || [];
    const sumContacts = (rows: typeof monthActionRows) => rows.reduce((sum, row) => sum + getLeadsFromActions(row.actions) + getConversationsFromActions(row.actions), 0);
    const sumConversations = (rows: typeof monthActionRows) => rows.reduce((sum, row) => sum + getConversationsFromActions(row.actions), 0);
    const leadsToday = sumContacts(todayActionRows);
    const leadsMonth = sumContacts(monthActionRows);
    const conversationsToday = sumConversations(todayActionRows);
    const conversationsPeriod = sumConversations(monthActionRows);
    const mqlToday = Number(crmMql?.daily?.[todayKey] || 0);
    const mqlMonth = Object.entries(crmMql?.daily || {}).filter(([date])=>dateInRange(date,rangeStart,rangeEnd)).reduce((sum,[,value])=>sum+Number(value||0),0);
    const eligibleObjectives = new Set(["OUTCOME_ENGAGEMENT", "OUTCOME_SALES", "OUTCOME_LEADS"]);
    const eligibleSpend = (source: typeof metaMonth) => {
      const ids = new Set((source?.campaigns || []).filter((campaign) => eligibleObjectives.has(campaign.objective.toUpperCase())).map((campaign) => campaign.id));
      return (source?.campaignInsights || []).filter((campaign) => ids.has(campaign.campaign_id)).reduce((sum, campaign) => sum + Number(campaign.spend || 0), 0);
    };
    const investimentoHoje = eligibleSpend(metaToday) || Number(metaToday?.accountInsights?.spend || 0);
    const investimentoMes = eligibleSpend(metaMonth) || Number(metaMonth?.accountInsights?.spend || 0);
    const roasMes = investimentoMes > 0 ? faturamentoMes / investimentoMes : 0;
    const approvedSales = vendasMes.filter((venda) => ["aprovada", "pago", "paga"].includes(normalizeStatus(venda.status)));
    const cac = approvedSales.length > 0 ? investimentoMes / approvedSales.length : 0;
    const cpl = leadsMonth > 0 ? investimentoMes / leadsMonth : 0;
    const cplMql = mqlMonth > 0 ? investimentoMes / mqlMonth : 0;
    const convRate = leadsMonth > 0 ? (mqlMonth / leadsMonth) * 100 : 0;
    const origemMap: Record<string, number> = {};
    vendasMes.forEach((venda) => {
      const origem = venda.origem || "Nao informado";
      origemMap[origem] = (origemMap[origem] || 0) + 1;
    });
    const origemData = Object.entries(origemMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);


    const totalOperacoesMes = vendasMes.length;
    const ticketMedio = totalOperacoesMes > 0 ? totalVendidoMes / totalOperacoesMes : 0;

    return {
      vendasMes,
      vendasHoje,
      cursosVendidosMes: cursosVendidosMes.length,
      cursosVendidosHoje: cursosVendidosMes.filter((v) => v.data === todayKey).length,
      cursosFeitosMes: cursosFeitosMes.length,
      cursosFeitosHoje: cursosFeitosMes.filter((c) => c.data === todayKey).length,
      fechamentosMes,
      faturamentoMes,
      faturamentoHoje,
      totalVendidoMes,
      aReceberMes,
      investimentoHoje,
      investimentoMes,
      leadsToday,
      leadsMonth,
      conversationsToday,
      conversationsPeriod,
      mqlToday,
      mqlMonth,
      roasMes,
      cac,
      cpl,
      cplMql,
      convRate,
      origemData,
      totalOperacoesMes,
      ticketMedio,
    };
  }, [vendas, cursosDados, fechamentos, metaToday, metaMonth, crmMql, todayKey, rangeStart, rangeEnd]);

  const monthRealized = tvData.faturamentoMes;
  const monthlyContribution = contributionMargin(monthRealized, cursosDados, rangeStart, rangeEnd);
  const totalLeads = tvData.leadsMonth;
  const totalMql = tvData.mqlMonth;
  const metaMensal = (monthData || []).reduce((max, item) => Math.max(max, Number(item.meta_mensal_prevista || 0)), 0);
  const periodGoal = period === 'month' ? metaMensal : tvRangeDays(rangeStart,rangeEnd).reduce((sum,date)=>{
    if(date.getDay()===0||date.getDay()===6)return sum;
    const rows=goalMetrics.filter(row=>row.date.slice(0,7)===formatLocalDate(date).slice(0,7));
    const goal=rows.reduce((max,row)=>Math.max(max,Number(row.meta_mensal_prevista||0)),0);
    const businessDays=tvRangeDays(formatLocalDate(new Date(date.getFullYear(),date.getMonth(),1)),formatLocalDate(new Date(date.getFullYear(),date.getMonth()+1,0))).filter(day=>day.getDay()!==0&&day.getDay()!==6).length;
    return sum+goal/businessDays;
  },0);
  const metaPct = periodGoal > 0 ? Math.min((monthRealized / periodGoal) * 100, 100) : 0;
  const roas = tvData.roasMes;
  const convRate = tvData.convRate;
  const periodGoalLabel = {day:'Meta Diária',week:'Meta Semanal',fortnight:'Meta Quinzenal',month:'Meta Mensal'}[period];
  const periodRevenueLabel = {day:'Faturamento Hoje',week:'Faturamento Semanal',fortnight:'Faturamento Quinzenal',month:'Faturamento Mensal'}[period];
  const periodSoldLabel = {day:'Vendido hoje',week:'Vendido na semana',fortnight:'Vendido na quinzena',month:'Vendido no mês'}[period];
  const metaCursos = (() => {
    const rows = [...(monthData || [])].sort((a, b) => b.date.localeCompare(a.date));
    return Number(rows.find((row) => Number(row.meta_cursos || 0) > 0)?.meta_cursos ||
      rows.find((row) => Number(row.super_meta_cursos || 0) > 0)?.super_meta_cursos || 0);
  })();

  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const meetingsToday = useMemo(() => [...new Map(meetings.filter(meeting => dateInRange(meeting.date, rangeStart, rangeEnd) && meeting.status !== "cancelled" && (meeting.agendaCategory || "reunioes") === "reunioes").map(meeting => [meeting.externalId || meeting.id, meeting])).values()].sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || (a.clientName || a.title).localeCompare(b.clientName || b.title, "pt-BR")), [meetings,rangeStart,rangeEnd]);

  const chartData = useMemo(() => {
    const days = tvRangeDays(chartStart, todayKey).map((date) => {
      const key = formatLocalDate(date);
      const metric = chartMetrics.find((item) => item.date === key);
      const metaDay = chartMeta?.dailyInsights?.find((item) => item.date_start === key);
      const calculator=collectionCalculator(vendas,key,key);
      const faturamento = fechamentos.filter(item=>normalizeStatus(item.status)!=='cancelado').reduce((sum,item)=>sum+calculator.getCollectedNetInPeriod(item),0);
      const leads = metaDay ? getLeadsFromActions(metaDay.actions) + getConversationsFromActions(metaDay.actions) : Number(metric?.leads || 0);
      const mql = Number(crmMql?.daily?.[key] || 0);

      return {
        dia: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        Faturamento: faturamento,
        Leads: leads,
        MQL: mql,
      };
    });

    return days;
  }, [chartMetrics, chartMeta, crmMql, fechamentos, vendas, chartStart, todayKey]);


  const cardStyle = { background: "hsl(260, 22%, 9%)", border: "1px solid hsl(260, 18%, 24%)" };

  return (
    <TVVisibilityProvider><div className="fixed inset-0 bg-[hsl(260,22%,5%)] text-white flex items-center justify-center overflow-hidden">
      <div className="relative shrink-0" style={{ width: 1600 * tvScale, height: 900 * tvScale }}>
      <div data-tv-canvas className="absolute left-0 top-0 flex flex-col p-6" style={{ width: 1600, height: 900, transform: `scale(${tvScale})`, transformOrigin: 'top left' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex items-start justify-between mb-4 lg:mb-5"
      >
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate("/")}
            className="mt-1 p-2 rounded-lg hover:bg-secondary/30 transition-colors text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-slate-300 mb-1">Dashboard TV</p>
            <p className="text-5xl lg:text-6xl font-display font-extrabold tabular-nums tracking-tight leading-none">
              {timeStr}
            </p>
            <SpotifyTVPlayer />
            <div className="mt-2 flex items-center gap-1" role="group" aria-label="Período do Dashboard TV">
              {TV_PERIODS.map(option=><button key={option.value} aria-pressed={period===option.value} onClick={()=>{setPeriod(option.value);try{localStorage.setItem('tv-period',option.value);}catch{}}} className={`rounded-md border px-2 py-1 text-xs font-medium ${period===option.value?'border-violet-400 bg-violet-600 text-white':'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>{option.label}</button>)}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">{rangeStart.split('-').reverse().slice(0,2).join('/')} a {rangeEnd.split('-').reverse().slice(0,2).join('/')} · {period==='week'?'últimos 7 dias':period==='fortnight'?'últimos 15 dias':range.label.toLowerCase()}{periodAdsLoading?' · Atualizando…':periodAdsError?' · Anúncios indisponíveis':''}</p>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-[3.4fr_1fr_1fr] gap-3 mx-3 flex-1">
          <div className="rounded-xl px-3 py-2" style={cardStyle}>
            <p className="text-xs text-slate-300 mb-1">Ligações · CRM <span className="text-[10px]">(atendidas: conversa ≥ 10s)</span><TVHideButton id="calls" label="ligações do CRM"/></p>
            <TVSecret id="calls">
            <table className="w-full text-sm leading-[18px] tabular-nums">
              <thead><tr className="text-[11px] leading-tight text-slate-300"><th className="text-left font-normal">Vendedor</th><th className="text-left font-normal px-2">Período</th><th className="text-right font-normal">Tentativas</th><th className="text-right font-normal pl-2">Atendidas (%)</th><th className="text-right font-normal pl-2">Não atend.</th>{crmCalls.data && [...crmCalls.data.today.sellers,...crmCalls.data.month.sellers].some(s=>s.people !== null || s.attemptsPerPerson !== null) && <><th className="text-right font-normal pl-2">Pessoas</th><th className="text-right font-normal pl-2">Tent./pessoa</th></>}</tr></thead>
              <tbody>{['Lucas','Allgayer'].flatMap(name => (['today','month'] as const).map((period,index) => {
                const seller = crmCalls.data?.[period].sellers.find(s=>s.name===name);
                return <tr key={`${name}-${period}`} className={index===0 ? 'border-t border-slate-700/50' : ''}><td className="py-0.5">{index===0 ? name : ''}</td><td className="px-2 text-slate-300">{period==='today' ? 'Hoje' : 'Mês'}</td><td className="text-right font-bold">{seller?.calls ?? '—'}</td><td className="text-right font-bold pl-2 text-emerald-300">{seller?.answered ?? '—'} <span className="font-medium text-[11px]">({answeredCallRate(seller?.calls,seller?.answered)})</span></td><td className="text-right font-bold pl-2">{seller?.notAnswered ?? '—'}</td>{crmCalls.data && [...crmCalls.data.today.sellers,...crmCalls.data.month.sellers].some(s=>s.people !== null || s.attemptsPerPerson !== null) && <><td className="text-right pl-2">{seller?.people ?? '—'}</td><td className="text-right pl-2">{seller?.attemptsPerPerson?.toLocaleString('pt-BR',{maximumFractionDigits:1}) ?? '—'}</td></>}</tr>;
              }))}</tbody>
              <tfoot>{(['today','month'] as const).map((period,index) => {
                const sellers = crmCalls.data?.[period].sellers;
                const sum = (metric:'calls'|'answered'|'notAnswered') => sellers && sellers.every(s=>s[metric] !== null) ? sellers.reduce((total,s)=>total+(s[metric] || 0),0) : null;
                return <tr key={period} className={index===0 ? "border-t border-slate-700" : ""}>
                  <td className="font-semibold">{index===0 ? 'Total' : ''}</td><td className="px-2 text-slate-300">{period==='today'?'Hoje':'Mês'}</td>
                  <td className="text-right font-bold">{sum('calls') ?? '—'}</td>
                  <td className="text-right font-bold pl-2 text-emerald-300">{sum('answered') ?? '—'} <span className="text-[11px] font-medium">({answeredCallRate(sum('calls'),sum('answered'))})</span></td>
                  <td className="text-right font-bold pl-2">{sum('notAnswered') ?? '—'}</td>
                  {crmCalls.data && [...crmCalls.data.today.sellers,...crmCalls.data.month.sellers].some(s=>s.people !== null || s.attemptsPerPerson !== null) && <><td className="text-right pl-2 text-slate-500">—</td><td className="text-right pl-2 text-slate-500">—</td></>}
                </tr>;
              })}</tfoot>
            </table>
            {crmCalls.isError && <p className="text-[10px] text-amber-300 mt-1">{crmCalls.data ? 'Atualização indisponível' : 'CRM indisponível'}</p>}
            </TVSecret>
          </div>
          {[
            { label: "Reuniões agendadas", month: meetingTotals.scheduled, today: agendaToday.meetingsScheduled, cost: costPerMeeting(meetingTotals.scheduled), goal: scheduledGoal },
            { label: "Reuniões feitas", month: meetingTotals.held, today: agendaToday.meetingsHeld, cost: costPerMeeting(meetingTotals.held), goal: heldGoal },
          ].map((item) => (
            <div key={item.label} className="rounded-xl px-3 py-1" style={cardStyle}>
              <p className="text-xs text-slate-300">{item.label} · {range.label}<TVHideButton id={'meeting:'+item.label} label={item.label}/></p>
              <TVSecret id={'meeting:'+item.label}>
              <div className="flex items-baseline justify-between gap-1">
                <p className="text-2xl font-display font-bold tabular-nums leading-tight">{meetingsLoading ? "—" : item.month}</p>
                {item.cost && <p className="text-[11px] text-slate-300" title="Investimento em anúncios + imposto do período dividido pela quantidade de reuniões">Custo: {meetingsLoading ? "—" : item.cost}</p>}
              </div>
              <p className="text-[10px] leading-3 text-slate-300">{meetingsLoading ? "Carregando…" : `Hoje: ${item.today}${item.goal && item.goal > 0 ? ` / ${dailyMeetingGoal(item.goal, todayKey)}` : ""}`}{meetingsSyncing && !meetingsLoading ? " · Atualizando…" : ""}</p>
              {item.goal !== undefined && <>
                <p className="text-[10px] leading-3 text-slate-300 mt-0.5">
                  {meetingMetrics.isLoading ? "Carregando meta…" : meetingMetrics.isError ? "Meta indisponível" : item.goal > 0 ? `Meta mês: ${item.goal} · ${dailyMeetingGoal(item.goal, todayKey) === 0 ? "Sem meta hoje" : `Faltam hoje ${Math.max(0, dailyMeetingGoal(item.goal, todayKey) - item.today)}`}` : "Meta não definida"}
                </p>
                <div role="progressbar" aria-label={`Meta diária de ${item.label.toLowerCase()}`} aria-valuenow={dailyMeetingGoal(item.goal, todayKey) > 0 ? Math.min(100, item.today / dailyMeetingGoal(item.goal, todayKey) * 100) : 0} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${dailyMeetingGoal(item.goal, todayKey) > 0 && item.today >= dailyMeetingGoal(item.goal, todayKey) ? "bg-emerald-400" : "bg-violet-500"}`} style={{ width: `${dailyMeetingGoal(item.goal, todayKey) > 0 ? Math.min(100, item.today / dailyMeetingGoal(item.goal, todayKey) * 100) : 0}%` }} />
                </div>
              </>}
              </TVSecret>
            </div>
          ))}
        </div>
        <div className="w-28 shrink-0 text-[10px] leading-4 text-slate-400 capitalize text-right mt-2"><p>{dateStr}</p><TVRestoreButton/></div>
      </motion.div>

      <div className="flex-1 grid grid-cols-12 grid-rows-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 min-h-0">
        {/* Hero: Faturamento Mensal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="col-span-5 row-span-1 rounded-2xl p-6 flex flex-col justify-between min-w-0 min-h-0"
          style={cardStyle}
        >
          <div className="grid min-w-0 grid-cols-2 gap-4 items-start">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.1em] text-slate-300 font-medium mb-1">
              Faturamento · {range.label}
              <TVHideButton id="monthly-revenue" label="faturamento mensal"/>
            </p>
            <TVSecret id="monthly-revenue">
            <p className="font-display text-[38px] font-extrabold tracking-tight leading-none">
              <CountUp end={monthRealized} duration={2.5} prefix="R$ " separator="." decimal="," decimals={0} />
            </p>
            {periodGoal > 0 && (
              <p className="text-xs xl:text-sm leading-tight text-slate-300">
                Meta do período {formatCurrency(periodGoal)} ·{" "}
                <span className={metaPct >= 80 ? "text-success" : "text-warning font-semibold"}>{metaPct.toFixed(0)}%</span>
              </p>
            )}
            </TVSecret>
          </div>
          <div className="min-w-0 border-l border-slate-700/60 pl-4">
            <p className="text-xs uppercase tracking-[0.08em] leading-tight text-slate-300 font-medium mb-2">Margem de contribuição<TVHideButton id="contribution" label="margem de contribuição"/></p>
            <TVSecret id="contribution">
            <p className="font-display text-[30px] font-extrabold leading-none tracking-tight text-emerald-400 break-words">
              {courseCostsReady ? <CountUp end={monthlyContribution.margin} duration={2.5} prefix="R$ " separator="." decimal="," decimals={0} /> : "—"}
            </p>
            <p className="mt-2 text-sm font-semibold text-emerald-300">{courseCostsReady && monthlyContribution.percentage !== null ? monthlyContribution.percentage.toLocaleString("pt-BR", {maximumFractionDigits:1}) + "%" : "—"}</p>
            <p className="mt-1 text-[10px] leading-tight text-slate-400">Imposto 9% · comissão 15%<br/>Cursos dados: {courseCostsReady ? formatCurrency(monthlyContribution.courseCosts) : "—"}</p>
            </TVSecret>
          </div>
          </div>
          <TVSecret id="monthly-revenue"><div className="h-1.5 w-full rounded-full overflow-hidden bg-secondary/40 mt-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${metaPct}%` }}
              transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
              className="h-full rounded-full bg-accent"
            />
          </div></TVSecret>
        </motion.div>

        {/* KPI cards — 7 cols, 3x2 grid */}
        <div className="col-span-7 grid grid-cols-3 grid-rows-2 gap-4 min-w-0 min-h-0">
          {[
            { label: periodRevenueLabel, value: tvData.faturamentoMes, prefix: "R$ ", suffix: "", sub: "Novos contratos" },
            { label: periodGoalLabel, value: periodGoal, prefix: "R$ ", suffix: "", sub: `Coletado ${formatCurrency(monthRealized)} · ${metaPct.toFixed(0)}%`, soldInPeriod: tvData.totalVendidoMes, progress: metaPct, remaining: periodGoal > 0 ? (monthRealized >= periodGoal ? "Meta atingida!" : `Faltam ${formatCurrency(Math.max(0, periodGoal - monthRealized))}`) : "Meta não definida" },
            { label: "ROAS", value: roas, prefix: "", suffix: "x", decimals: 1, badge: roas >= 3 ? "Excelente" : roas >= 1 ? "Positivo" : "Baixo", badgeColor: roas >= 3 ? "text-success" : roas >= 1 ? "text-accent" : "text-destructive" },
            { label: "Leads · " + range.label, value: tvData.leadsMonth, prefix: "", suffix: "", sub: `Hoje: ${tvData.leadsToday}` },
            { label: "Conversas · " + range.label, value: tvData.conversationsPeriod, prefix: "", suffix: "", accent: true, sub: `MQL: ${tvData.mqlMonth} · ${tvData.conversationsPeriod > 0 ? `${(tvData.mqlMonth / tvData.conversationsPeriod * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}` },
            { label: "Vendas · " + range.label, value: tvData.totalOperacoesMes, prefix: "", suffix: "", sub: `Vendas hoje: ${tvData.vendasHoje.length}` },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
              className={`rounded-2xl ${card.progress !== undefined ? "px-2 py-1" : "p-2"} flex flex-col justify-between min-w-0 min-h-0`}
              style={cardStyle}
            >
              <div className="flex items-center justify-between">
                <p className={`${card.progress !== undefined ? "text-sm" : "text-sm xl:text-base"} leading-tight uppercase tracking-[0.08em] text-slate-300 font-medium`}>{card.label}<TVHideButton id={'kpi:'+['Faturamento Hoje','Meta Diária','ROAS','Leads Hoje','Conversas Hoje','Vendas no Mês'][i]} label={card.label}/></p>
                <TVSecret id={'kpi:'+['Faturamento Hoje','Meta Diária','ROAS','Leads Hoje','Conversas Hoje','Vendas no Mês'][i]} inline>{card.badge && <span className={`text-xs font-semibold ${card.badgeColor}`}>{card.badge}</span>}</TVSecret>
              </div>
              <TVSecret id={'kpi:'+['Faturamento Hoje','Meta Diária','ROAS','Leads Hoje','Conversas Hoje','Vendas no Mês'][i]}>
              <div>
                <div className="flex items-end justify-between gap-2 min-w-0">
                <p className={`font-display ${card.progress !== undefined ? "text-2xl" : "text-3xl xl:text-[32px]"} font-bold tabular-nums leading-none ${card.accent ? "text-accent" : "text-white"}`}>
                  <CountUp end={card.value} duration={2} prefix={card.prefix} suffix={card.suffix} separator="." decimal="," decimals={card.decimals || 0} />
                </p>
                  {card.soldInPeriod !== undefined && <div className="min-w-0 text-right"><p className="text-[10px] leading-3 text-slate-300">{periodSoldLabel}</p><p className="font-display text-lg font-bold leading-none tabular-nums text-emerald-300">{formatCurrency(card.soldInPeriod)}</p></div>}
                </div>
                {card.sub && <p className={`${card.progress !== undefined ? "text-[10px] leading-3" : "text-xs xl:text-sm leading-tight"} text-slate-300`}>{card.sub}</p>}
                {card.progress !== undefined && <>
                  <p className="text-[10px] leading-3 text-slate-300">{card.remaining}</p>
                  <div role="progressbar" aria-label={`Progresso da ${periodGoalLabel.toLowerCase()}`} aria-valuenow={card.progress} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full ${card.progress >= 100 ? "bg-emerald-400" : "bg-violet-500"}`} style={{ width: `${card.progress}%` }} />
                  </div>
                </>}
              </div>
              </TVSecret>
            </motion.div>
          ))}
        </div>

        <div className="col-span-5 grid grid-cols-2 gap-3 min-w-0 min-h-0">
        {/* Chart: Faturamento diário */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="rounded-2xl p-3 flex flex-col min-w-0 min-h-0"
          style={cardStyle}
        >
          <p className="text-[10px] uppercase tracking-[0.06em] text-slate-300 font-medium mb-2">
            Faturamento Diário · {period === "month" ? "Últimos 7 dias" : range.label}
            <TVHideButton id="revenue-chart" label="gráfico de faturamento diário"/>
          </p>
          <TVSecret id="revenue-chart">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tvFatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dia" tick={{ fontSize: 9, fill: "#cbd5e1" }} minTickGap={8} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#cbd5e1" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Faturamento" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#tvFatGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          </TVSecret>
        </motion.div>

        {/* Chart: Leads diário */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="rounded-2xl p-3 flex flex-col min-w-0 min-h-0"
          style={cardStyle}
        >
          <p className="text-[10px] uppercase tracking-[0.06em] text-slate-300 font-medium mb-2">
            Leads Diários · {period === "month" ? "Últimos 7 dias" : range.label}
            <TVHideButton id="leads-chart" label="gráfico de leads diários"/>
          </p>
          <TVSecret id="leads-chart">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tvLeadsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dia" tick={{ fontSize: 9, fill: "#cbd5e1" }} minTickGap={8} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#cbd5e1" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Leads" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#tvLeadsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          </TVSecret>
        </motion.div>

        </div>
        {/* Daily meetings */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.5}} className="col-span-4 rounded-2xl p-3 flex flex-col min-w-0 min-h-0" style={cardStyle}>
          <p className="text-sm uppercase tracking-[0.08em] text-slate-300 font-medium mb-2">Reuniões · {range.label}<TVHideButton id="today-meetings" label="reuniões de hoje"/></p>
          <TVSecret id="today-meetings"><div data-lenis-prevent role="region" aria-label="Lista de reuniões de hoje" tabIndex={0} className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" style={{ WebkitOverflowScrolling: "touch" }}>{meetingsLoading ? <p className="text-sm text-slate-400">Carregando reuniões…</p> : meetingsToday.length === 0 ? <p className="text-sm text-slate-400">Nenhuma reunião no período.</p> : <ul className="space-y-2">{meetingsToday.map(meeting=><li key={meeting.externalId||meeting.id} className="flex items-start gap-3 border-b border-slate-700/40 pb-2 last:border-0"><span className="shrink-0 font-semibold tabular-nums text-violet-300">{period !== "day" && <span className="block text-[10px] text-slate-400">{meeting.date.slice(8,10)}/{meeting.date.slice(5,7)}</span>}{meeting.time?.slice(0,5)||"—"}</span><span className="min-w-0 flex-1 break-words text-sm font-medium">{meeting.clientName||meeting.title}</span><span className="flex shrink-0 flex-col items-end gap-1"><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meeting.status === "completed" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>{meeting.status === "completed" ? "Realizada" : "Não realizada"}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meeting.closingStatus === "not_closed" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : meeting.closingStatus === "closed" || meeting.hasClosed ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-600/50 text-slate-400"}`}>{meeting.closingStatus === "not_closed" ? "Não fechou" : meeting.closingStatus === "closed" || meeting.hasClosed ? "Fechou na reunião" : "Fechamento não informado"}</span></span></li>)}</ul>}</div></TVSecret>
        </motion.div>
        {/* CAC / CPL / Conv card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="col-span-3 row-span-1 rounded-2xl p-3 flex flex-col min-w-0 min-h-0 overflow-hidden"
          style={cardStyle}
        >
          <p className="text-sm uppercase tracking-[0.08em] text-slate-300 font-medium leading-5 shrink-0 mb-1">Custos & Conversão</p>
          <div className="grid grid-rows-5 gap-0.5 flex-1 min-h-0">
            {[
              { id: "daily-ad-spend", label: "Anúncios · " + range.label, value: metaMonth ? tvData.investimentoMes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—" },
              { id: "CAC", label: "CAC", value: formatCurrency(tvData.cac) },
              { id: "CPL", label: "CPL", value: formatCurrency(tvData.cpl) },
              { id: "CPL Conversa", label: "Custo por MQL", value: formatCurrency(tvData.cplMql) },
              { id: "Conversão", label: "MQL", value: `${convRate.toFixed(1)}%` },
            ].map((row) => (
              <div key={row.label} className="flex min-h-0 items-center justify-between gap-2">
                <span className="min-w-0 text-sm leading-5 text-slate-300">{row.label}<TVHideButton id={'cost:'+row.id} label={row.label}/></span>
                <TVSecret id={'cost:'+row.id} inline><span className="shrink-0 whitespace-nowrap font-display text-base leading-5 font-bold tabular-nums text-white">{row.value}</span></TVSecret>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Origem dos Alunos - Pie */}
        {(() => {
          const origemData = tvData.origemData;
          return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}
              className="col-span-4 rounded-2xl p-3 flex flex-col min-w-0 min-h-0" style={cardStyle}>
              <p className="text-sm uppercase tracking-[0.08em] text-slate-300 font-medium mb-2">Origem dos Alunos<TVHideButton id="origins" label="origem dos alunos"/></p>
              <TVSecret id="origins">
              <div className="flex-1 min-h-0 flex items-center gap-3">
                <div className="w-[36%] h-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={origemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="85%" label={false} labelLine={false}>
                      {origemData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0 max-h-full overflow-y-auto space-y-1">
                  {origemData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs xl:text-sm">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-300 truncate flex-1" title={item.name}>{item.name}</span>
                      <span className="font-semibold tabular-nums shrink-0">{(item.value / Math.max(1, tvData.totalOperacoesMes) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              </TVSecret>
            </motion.div>
          );
        })()}

        {/* Ranking Consultores - Bar */}
        {(() => {
          return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.65 }}
              className="col-span-5 rounded-2xl p-3 flex flex-col min-w-0 min-h-0" style={cardStyle}>
              <p className="text-sm uppercase tracking-[0.08em] text-slate-300 font-medium mb-2">Cursos · {range.label}</p>
              <div className="flex-1 min-h-0 flex">
                <div className="w-full grid grid-cols-2 gap-4 items-center">
                  {[
                    { label: "Cursos vendidos", value: tvData.cursosVendidosMes, today: tvData.cursosVendidosHoje },
                    { label: "Cursos feitos", value: tvData.cursosFeitosMes, today: tvData.cursosFeitosHoje },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-sm text-slate-300">{item.label} · {range.label}<TVHideButton id={'course:'+item.label} label={item.label}/></p>
                      <TVSecret id={'course:'+item.label}>
                      <p className="text-4xl xl:text-5xl font-display font-bold tabular-nums">{item.value}</p>
                      <p className="text-xs text-slate-300">Hoje: {item.today}</p>
                      <p className="text-xs text-slate-300 mt-1">
                        {metaCursos > 0 ? `Meta mensal: ${metaCursos} · ${item.value >= metaCursos ? "Meta atingida!" : `Faltam ${Math.max(0, metaCursos - item.value)}`}` : "Meta não definida"}
                      </p>
                      <div role="progressbar" aria-label={`Progresso de ${item.label.toLowerCase()}`} aria-valuenow={metaCursos > 0 ? Math.min(100, item.value / metaCursos * 100) : 0} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className={`h-full rounded-full ${metaCursos > 0 && item.value >= metaCursos ? "bg-emerald-400" : "bg-violet-500"}`} style={{ width: `${metaCursos > 0 ? Math.min(100, item.value / metaCursos * 100) : 0}%` }} />
                      </div>
                      </TVSecret>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Ticket + Nota + Exclusividade */}
        {(() => {
          const notasV = clients.filter(c => c.nota != null && c.nota > 0);
          const notaM = notasV.length > 0 ? notasV.reduce((s, c) => s + Number(c.nota), 0) / notasV.length : 0;
          return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}
              className="col-span-3 rounded-2xl p-3 flex flex-col justify-between min-w-0 min-h-0" style={cardStyle}>
              <p className="text-sm uppercase tracking-[0.08em] text-slate-300 font-medium mb-2">Análise de Vendas</p>
              <div className="space-y-1 flex-1 flex flex-col justify-center">
                {[
                  { label: "Vendas · " + range.label, value: String(tvData.totalOperacoesMes) },
                  { label: "Ticket Médio", value: formatCurrency(tvData.ticketMedio) },
                  { label: "Nota Média", value: `${notaM.toFixed(1)} ⭐` },
                  { label: "A receber", value: formatCurrency(tvData.aReceberMes) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{row.label}<TVHideButton id={'sales:'+row.label} label={row.label+' na análise de vendas'}/></span>
                    <TVSecret id={'sales:'+row.label} inline><span className="font-display text-lg font-bold tabular-nums text-white">{row.value}</span></TVSecret>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 flex items-center justify-center text-xs text-slate-300 uppercase tracking-[0.1em]"
      >
        <span>Atualização automática · {now.toLocaleDateString("pt-BR")}</span>
      </motion.div>
      </div>
      </div>
    </div></TVVisibilityProvider>
  );
};

export default DashboardTVPage;















