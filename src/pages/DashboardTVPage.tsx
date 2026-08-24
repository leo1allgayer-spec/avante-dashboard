import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useMonthMetrics, useTodayMetrics } from "@/hooks/useMetrics";
import { useClients } from "@/hooks/useClients";
import { useVendas } from "@/hooks/useVendas";
import { useFechamentosDiarios } from "@/hooks/useFechamentosDiarios";
import { useMetaAds } from "@/hooks/useMetaAds";
import { useCrmMql } from "@/hooks/useCrmMql";
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
  BarChart,
  Bar,
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
      <p className="text-muted-foreground/60 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-foreground font-medium">
          {p.name}: {typeof p.value === "number" && p.value > 100 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const DashboardTVPage = () => {
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: today } = useTodayMetrics();
  const { data: monthData } = useMonthMetrics();
  const { data: clients = [] } = useClients();
  const { data: vendas = [] } = useVendas();
  const { data: fechamentos = [] } = useFechamentosDiarios();
  const { data: metaToday } = useMetaAds({ datePreset: "today" });
  const { data: metaMonth } = useMetaAds({ datePreset: "this_month" });

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "#f59e0b", "#ef4444", "#8b5cf6"];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const invalidateLiveData = () => {
      queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["fechamentos_diarios"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    };

    const interval = window.setInterval(invalidateLiveData, 60 * 1000);
    const channel = supabase
      .channel("dashboard-tv-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_metrics" }, invalidateLiveData)
      .on("postgres_changes", { event: "*", schema: "public", table: "vendas" }, invalidateLiveData)
      .on("postgres_changes", { event: "*", schema: "public", table: "fechamentos_diarios" }, invalidateLiveData)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, invalidateLiveData)
      .subscribe();

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const todayKey = formatLocalDate(now);
  const monthStart = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const { data: crmMql } = useCrmMql(monthStart, monthEnd);

  const tvData = useMemo(() => {
    const vendasMes = vendas.filter((v) => dateInRange(v.data, monthStart, monthEnd) && normalizeStatus(v.status) !== "cancelada");
    const vendasHoje = vendasMes.filter((v) => v.data === todayKey);

    const fechamentosAtivos = fechamentos.filter((f) => normalizeStatus(f.status) !== "cancelado");
    const fechamentosMes = fechamentosAtivos.filter((f) =>
      dateInRange(f.data, monthStart, monthEnd) ||
      dateInRange(f.previsao_entrada, monthStart, monthEnd) ||
      (Array.isArray(f.parcelas_datas) && f.parcelas_datas.some((date) => dateInRange(date, monthStart, monthEnd))) ||
      (Number(f.valor_recorrente || 0) > 0 && f.data <= monthEnd)
    );
    const totalVendidoMes = vendasMes.reduce((sum, venda) => sum + Number(venda.valor || 0), 0);
    const collectedByDay = new Map<string, number>();
    fechamentosMes.forEach((item) => {
      if (!dateInRange(item.data, monthStart, monthEnd)) return;
      collectedByDay.set(item.data, (collectedByDay.get(item.data) || 0) + getCollectedNet(item));
    });
    const faturamentoMes = Array.from(collectedByDay.values()).reduce((sum, value) => sum + value, 0);
    const faturamentoHoje = collectedByDay.get(todayKey) || 0;
    const aReceberMes = fechamentosMes.reduce(
      (sum, item) => sum + getReceivableInPeriod(item, monthStart, monthEnd),
      0,
    );

    const monthActionRows = (metaMonth?.campaignInsights?.length ? metaMonth.campaignInsights : metaMonth?.dailyInsights) || [];
    const todayActionRows = (metaToday?.campaignInsights?.length ? metaToday.campaignInsights : metaToday?.dailyInsights) || [];
    const sumContacts = (rows: typeof monthActionRows) => rows.reduce((sum, row) => sum + getLeadsFromActions(row.actions) + getConversationsFromActions(row.actions), 0);
    const sumConversations = (rows: typeof monthActionRows) => rows.reduce((sum, row) => sum + getConversationsFromActions(row.actions), 0);
    const leadsToday = sumContacts(todayActionRows);
    const leadsMonth = sumContacts(monthActionRows);
    const conversationsToday = sumConversations(todayActionRows);
    const mqlToday = Number(crmMql?.daily?.[todayKey] || 0);
    const mqlMonth = Number(crmMql?.total || 0);
    const eligibleObjectives = new Set(["OUTCOME_ENGAGEMENT", "OUTCOME_SALES", "OUTCOME_LEADS"]);
    const eligibleSpend = (source: typeof metaMonth) => {
      const ids = new Set((source?.campaigns || []).filter((campaign) => eligibleObjectives.has(campaign.objective.toUpperCase())).map((campaign) => campaign.id));
      return (source?.campaignInsights || []).filter((campaign) => ids.has(campaign.campaign_id)).reduce((sum, campaign) => sum + Number(campaign.spend || 0), 0);
    };
    const investimentoHoje = eligibleSpend(metaToday) || Number(metaToday?.accountInsights?.spend || 0);
    const investimentoMes = eligibleSpend(metaMonth) || Number(metaMonth?.accountInsights?.spend || 0);
    const roasMes = investimentoMes > 0 ? faturamentoMes / investimentoMes : 0;
    const approvedSales = vendasMes.filter((venda) => ["aprovada", "pago", "paga"].includes(normalizeStatus(venda.status)));
    const cac = approvedSales.length > 0 ? investimentoMes / approvedSales.length : Number(today?.cac || 0);
    const cpl = leadsMonth > 0 ? investimentoMes / leadsMonth : Number(today?.custo_por_lead || 0);
    const cplMql = mqlMonth > 0 ? investimentoMes / mqlMonth : Number(today?.custo_por_lead_mql || 0);
    const convRate = leadsMonth > 0 ? (mqlMonth / leadsMonth) * 100 : 0;
    const origemMap: Record<string, number> = {};
    vendasMes.forEach((venda) => {
      const origem = venda.origem || "Nao informado";
      origemMap[origem] = (origemMap[origem] || 0) + 1;
    });
    const origemData = Object.entries(origemMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const consultorMap: Record<string, number> = {};
    fechamentosMes.forEach((item) => {
      if (!dateInRange(item.data, monthStart, monthEnd)) return;
      const vendedor = item.vendedor || "Nao informado";
      consultorMap[vendedor] = (consultorMap[vendedor] || 0) + getCollectedNet(item);
    });
    const consultorData = Object.entries(consultorMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const totalOperacoesMes = vendasMes.length;
    const ticketMedio = totalOperacoesMes > 0 ? totalVendidoMes / totalOperacoesMes : 0;

    return {
      vendasMes,
      vendasHoje,
      fechamentosMes,
      faturamentoMes,
      faturamentoHoje,
      totalVendidoMes,
      collectedByDay,
      aReceberMes,
      investimentoHoje,
      investimentoMes,
      leadsToday,
      leadsMonth,
      conversationsToday,
      mqlToday,
      mqlMonth,
      roasMes,
      cac,
      cpl,
      cplMql,
      convRate,
      origemData,
      consultorData,
      totalOperacoesMes,
      ticketMedio,
    };
  }, [vendas, fechamentos, metaToday, metaMonth, crmMql, todayKey, monthStart, monthEnd]);

  const monthRealized = tvData.faturamentoMes;
  const totalLeads = tvData.leadsMonth;
  const totalMql = tvData.mqlMonth;
  const metaMensal = (monthData || []).reduce((max, item) => Math.max(max, Number(item.meta_mensal_prevista || 0)), 0);
  const metaPct = metaMensal > 0 ? Math.min((monthRealized / metaMensal) * 100, 100) : 0;
  const roas = tvData.roasMes;
  const convRate = tvData.convRate;
  const businessDaysInMonth = Array.from({ length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() }, (_, index) => new Date(now.getFullYear(), now.getMonth(), index + 1)).filter((date) => date.getDay() >= 1 && date.getDay() <= 5).length;
  const metaDiaria = businessDaysInMonth > 0 ? metaMensal / businessDaysInMonth : 0;
  const metaDiariaReal = tvData.faturamentoHoje;
  const metaDiariaPct = metaDiaria > 0 ? Math.min((metaDiariaReal / metaDiaria) * 100, 100) : 0;

  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const chartData = useMemo(() => {
    const days = Array.from({ length: 15 }, (_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (14 - index));
      const key = formatLocalDate(date);
      const metric = (monthData || []).find((item) => item.date === key);
      const metaDay = metaMonth?.dailyInsights?.find((item) => item.date_start === key);
      const faturamento = tvData.collectedByDay.get(key) || 0;
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
  }, [monthData, metaMonth, crmMql, tvData.collectedByDay, now]);

  const cardStyle = { background: "hsl(260, 22%, 9%)", border: "1px solid hsl(260, 18%, 14%)" };

  return (
    <div className="fixed inset-0 bg-[hsl(260,22%,5%)] text-foreground flex flex-col p-6 lg:p-10 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex items-start justify-between mb-6 lg:mb-8"
      >
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate("/")}
            className="mt-1 p-2 rounded-lg hover:bg-secondary/30 transition-colors text-muted-foreground/50 hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/40 mb-1">Dashboard TV</p>
            <p className="text-5xl lg:text-7xl font-display font-extrabold tabular-nums tracking-tight leading-none">
              {timeStr}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/50 capitalize text-right max-w-xs mt-2">
          {dateStr}
        </p>
      </motion.div>

      <div className="flex-1 grid grid-cols-12 auto-rows-fr gap-4 lg:gap-5 min-h-0 overflow-hidden">
        {/* Hero: Faturamento Mensal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="col-span-12 lg:col-span-5 row-span-1 rounded-2xl p-6 flex flex-col justify-between"
          style={cardStyle}
        >
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground/50 font-medium mb-1">
              Faturamento Mensal
            </p>
            <p className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-none">
              <CountUp end={monthRealized} duration={2.5} prefix="R$ " separator="." decimal="," decimals={0} />
            </p>
            {metaMensal > 0 && (
              <p className="text-sm text-muted-foreground/40 mt-2">
                Meta {formatCurrency(metaMensal)} ·{" "}
                <span className={metaPct >= 80 ? "text-success" : "text-warning font-semibold"}>{metaPct.toFixed(0)}%</span>
              </p>
            )}
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden bg-secondary/40 mt-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${metaPct}%` }}
              transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
              className="h-full rounded-full bg-accent"
            />
          </div>
        </motion.div>

        {/* KPI cards — 7 cols, 3x2 grid */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-3 grid-rows-2 gap-4 lg:gap-5">
          {[
            { label: "Faturamento Hoje", value: tvData.faturamentoHoje, prefix: "R$ ", suffix: "" },
            { label: "Meta Diária", value: metaDiaria, prefix: "R$ ", suffix: "", sub: `realizado ${formatCurrency(metaDiariaReal)} · ${metaDiariaPct.toFixed(0)}%` },
            { label: "ROAS", value: roas, prefix: "", suffix: "x", decimals: 1, badge: roas >= 3 ? "Excelente" : roas >= 1 ? "Positivo" : "Baixo", badgeColor: roas >= 3 ? "text-success" : roas >= 1 ? "text-accent" : "text-destructive" },
            { label: "Leads Hoje", value: tvData.leadsToday, prefix: "", suffix: "", sub: `mês: ${totalLeads}` },
            { label: "Conversas Hoje", value: tvData.conversationsToday, prefix: "", suffix: "", accent: true, sub: `MQL hoje: ${tvData.mqlToday}` },
            { label: "CAC", value: tvData.cac, prefix: "R$ ", suffix: "", sub: `CPL: ${formatCurrency(tvData.cpl)}` },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
              className="rounded-2xl p-4 flex flex-col justify-between"
              style={cardStyle}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/40 font-medium">{card.label}</p>
                {card.badge && <span className={`text-[9px] font-semibold ${card.badgeColor}`}>{card.badge}</span>}
              </div>
              <div>
                <p className={`font-display text-xl lg:text-2xl font-bold tabular-nums leading-none ${card.accent ? "text-accent" : "text-foreground"}`}>
                  <CountUp end={card.value} duration={2} prefix={card.prefix} suffix={card.suffix} separator="." decimal="," decimals={card.decimals || 0} />
                </p>
                {card.sub && <p className="text-[9px] text-muted-foreground/30 mt-1">{card.sub}</p>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chart: Faturamento diário */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="col-span-12 lg:col-span-5 row-span-1 rounded-2xl p-5 flex flex-col"
          style={cardStyle}
        >
          <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/40 font-medium mb-3">
            Faturamento Diário — Últimos 15 dias
          </p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tvFatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dia" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.3)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.3)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Faturamento" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#tvFatGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart: Leads diário */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="col-span-12 lg:col-span-4 row-span-1 rounded-2xl p-5 flex flex-col"
          style={cardStyle}
        >
          <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/40 font-medium mb-3">
            Leads Diários — Últimos 15 dias
          </p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tvLeadsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dia" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.3)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.3)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Leads" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#tvLeadsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* CAC / CPL / Conv card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="col-span-12 lg:col-span-3 row-span-1 rounded-2xl p-5 flex flex-col justify-between"
          style={cardStyle}
        >
          <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/40 font-medium mb-3">Custos & Conversão</p>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {[
              { label: "CAC", value: formatCurrency(tvData.cac) },
              { label: "CPL", value: formatCurrency(tvData.cpl) },
              { label: "CPL Conversa", value: formatCurrency(tvData.cplMql) },
              { label: "Conversão", value: `${convRate.toFixed(1)}%` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground/40">{row.label}</span>
                <span className="font-display text-lg font-bold tabular-nums text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Origem dos Alunos - Pie */}
        {(() => {
          const origemData = tvData.origemData;
          return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}
              className="col-span-12 lg:col-span-4 rounded-2xl p-5 flex flex-col" style={cardStyle}>
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/40 font-medium mb-2">Origem dos Alunos</p>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={origemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                      {origemData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          );
        })()}

        {/* Ranking Consultores - Bar */}
        {(() => {
          const cData = tvData.consultorData;
          return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.65 }}
              className="col-span-12 lg:col-span-5 rounded-2xl p-5 flex flex-col" style={cardStyle}>
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/40 font-medium mb-2">Faturamento por Consultor</p>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cData} margin={{ left: -10, bottom: 30 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.3)" }} angle={-25} textAnchor="end" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.3)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Bar dataKey="value" name="Faturamento" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
              className="col-span-12 lg:col-span-3 rounded-2xl p-5 flex flex-col justify-between" style={cardStyle}>
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/40 font-medium mb-3">Análise de Vendas</p>
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                {[
                  { label: "Vendas / Fechamentos", value: String(tvData.totalOperacoesMes) },
                  { label: "Ticket Médio", value: formatCurrency(tvData.ticketMedio) },
                  { label: "Nota Média", value: `${notaM.toFixed(1)} ⭐` },
                  { label: "A receber", value: formatCurrency(tvData.aReceberMes) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground/40">{row.label}</span>
                    <span className="font-display text-lg font-bold tabular-nums text-foreground">{row.value}</span>
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
        className="mt-4 flex items-center justify-center text-[10px] text-muted-foreground/25 uppercase tracking-[0.2em]"
      >
        <span>Atualização automática · {now.toLocaleDateString("pt-BR")}</span>
      </motion.div>
    </div>
  );
};

export default DashboardTVPage;









