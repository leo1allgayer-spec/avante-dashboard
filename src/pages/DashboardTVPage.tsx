import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMonthMetrics, useTodayMetrics } from "@/hooks/useMetrics";
import { useClients } from "@/hooks/useClients";
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
  const { data: today } = useTodayMetrics();
  const { data: monthData } = useMonthMetrics();
  const { data: clients = [] } = useClients();

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "#f59e0b", "#ef4444", "#8b5cf6"];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const monthRealized = (monthData || []).reduce((s, d) => s + Number(d.faturamento_dia), 0);
  const totalLeads = (monthData || []).reduce((s, d) => s + Number(d.leads), 0);
  const totalMql = (monthData || []).reduce((s, d) => s + Number(d.lead_mql), 0);
  const metaMensal = today?.meta_mensal_prevista || 0;
  const metaPct = metaMensal > 0 ? Math.min((monthRealized / metaMensal) * 100, 100) : 0;
  const roas = today?.roas || 0;
  const convRate = totalLeads > 0 ? ((totalMql / totalLeads) * 100) : 0;
  const metaDiaria = today?.meta_diaria_prevista || 0;
  const metaDiariaReal = today?.meta_diaria_realizada || 0;
  const metaDiariaPct = metaDiaria > 0 ? Math.min((metaDiariaReal / metaDiaria) * 100, 100) : 0;

  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Chart data from monthData
  const chartData = (monthData || [])
    .slice(-15)
    .map((d) => ({
      dia: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      Faturamento: Number(d.faturamento_dia),
      Leads: Number(d.leads),
      MQL: Number(d.lead_mql),
    }));

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
            { label: "Faturamento Hoje", value: today?.faturamento_dia || 0, prefix: "R$ ", suffix: "" },
            { label: "Meta Diária", value: metaDiariaReal, prefix: "R$ ", suffix: "", sub: metaDiaria > 0 ? `de ${formatCurrency(metaDiaria)} · ${metaDiariaPct.toFixed(0)}%` : undefined },
            { label: "ROAS", value: roas, prefix: "", suffix: "x", decimals: 1, badge: roas >= 3 ? "Excelente" : roas >= 1 ? "Positivo" : "Baixo", badgeColor: roas >= 3 ? "text-success" : roas >= 1 ? "text-accent" : "text-destructive" },
            { label: "Leads Hoje", value: today?.leads || 0, prefix: "", suffix: "", sub: `mês: ${totalLeads}` },
            { label: "MQL Hoje", value: today?.lead_mql || 0, prefix: "", suffix: "", accent: true, sub: convRate > 0 ? `conversão: ${convRate.toFixed(1)}%` : undefined },
            { label: "CAC", value: today?.cac || 0, prefix: "R$ ", suffix: "", sub: `CPL: ${formatCurrency(today?.custo_por_lead || 0)}` },
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
              { label: "CAC", value: formatCurrency(today?.cac || 0) },
              { label: "CPL", value: formatCurrency(today?.custo_por_lead || 0) },
              { label: "CPL MQL", value: formatCurrency(today?.custo_por_lead_mql || 0) },
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
          const origemMap: Record<string, number> = {};
          clients.forEach((c) => { const o = c.origem || "N/I"; origemMap[o] = (origemMap[o] || 0) + 1; });
          const origemData = Object.entries(origemMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
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
          const cMap: Record<string, number> = {};
          clients.forEach((c) => { const con = c.consultor || "N/I"; cMap[con] = (cMap[con] || 0) + Number(c.valor || 0); });
          const cData = Object.entries(cMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
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
          const totalFat = clients.reduce((s, c) => s + Number(c.valor || 0), 0);
          const ticket = clients.length > 0 ? totalFat / clients.length : 0;
          const notasV = clients.filter(c => c.nota != null && c.nota > 0);
          const notaM = notasV.length > 0 ? notasV.reduce((s, c) => s + Number(c.nota), 0) / notasV.length : 0;
          const excl = clients.length > 0 ? (clients.filter(c => c.exclusividade).length / clients.length * 100) : 0;
          return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}
              className="col-span-12 lg:col-span-3 rounded-2xl p-5 flex flex-col justify-between" style={cardStyle}>
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/40 font-medium mb-3">Análise de Vendas</p>
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                {[
                  { label: "Total Alunos", value: String(clients.length) },
                  { label: "Ticket Médio", value: `R$ ${ticket.toFixed(0)}` },
                  { label: "Nota Média", value: `${notaM.toFixed(1)} ⭐` },
                  { label: "Exclusividade", value: `${excl.toFixed(0)}%` },
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
