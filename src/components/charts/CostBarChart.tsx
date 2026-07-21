import { motion } from "framer-motion";
import { useMonthMetrics } from "@/hooks/useMetrics";
import type { DailyMetrics } from "@/hooks/useMetrics";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, Legend,
} from "recharts";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const tooltipStyle = {
  backgroundColor: "hsl(260, 22%, 8%)",
  border: "1px solid hsl(260, 18%, 20%)",
  borderRadius: "12px",
  color: "hsl(240, 10%, 93%)",
  fontSize: 12,
  padding: "12px 16px",
  boxShadow: "0 12px 40px -12px hsl(0 0% 0% / 0.5)",
};
const axisStyle = { fontSize: 10, fill: "hsl(260, 10%, 42%)" };
const gridStroke = "hsl(260, 18%, 13%)";

interface CostBarChartProps {
  custoLead: number;
  custoMql: number;
  cac: number;
  monthData?: DailyMetrics[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-6 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const CostBarChart = ({ custoLead, custoMql, cac, monthData: providedMonthData }: CostBarChartProps) => {
  const { data: fallbackMonthData } = useMonthMetrics();
  const monthData = providedMonthData ?? fallbackMonthData;

  // Historical evolution of costs
  const historyData = (monthData || []).slice(-10).map((d) => ({
    date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit" }),
    cpl: Number(d.custo_por_lead),
    cplMql: Number(d.custo_por_lead_mql),
    cac: Number(d.cac),
  }));

  // Summary cards
  const summaryData = [
    { name: "CPL", value: custoLead, color: "hsl(174, 75%, 48%)", gradient: "from-[hsl(174,75%,48%)] to-[hsl(174,75%,35%)]" },
    { name: "CPL MQL", value: custoMql, color: "hsl(270, 70%, 60%)", gradient: "from-[hsl(270,70%,60%)] to-[hsl(270,70%,45%)]" },
    { name: "CAC", value: cac, color: "hsl(38, 92%, 50%)", gradient: "from-[hsl(38,92%,50%)] to-[hsl(38,92%,38%)]" },
  ];

  return (
    <motion.div whileHover={{ y: -2 }} className="glass-card-hover rounded-xl p-6 relative overflow-hidden group">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="relative z-10">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4">Custos de Aquisição</h3>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {summaryData.map((item) => (
            <div key={item.name} className="rounded-lg bg-secondary/50 p-3 text-center border border-border/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{item.name}</p>
              <p className="text-base font-bold tabular-nums text-foreground" style={{ color: item.color }}>
                {formatCurrency(item.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Historical Chart */}
        {historyData.length > 0 ? (
          <>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Evolução (últimos 10 dias)</p>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={historyData}>
                <defs>
                  <linearGradient id="cplGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(174, 75%, 48%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(174, 75%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="cpl" stroke="hsl(174, 75%, 48%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(174, 75%, 48%)" }} name="CPL" />
                <Line type="monotone" dataKey="cplMql" stroke="hsl(270, 70%, 60%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(270, 70%, 60%)" }} name="CPL MQL" />
                <Line type="monotone" dataKey="cac" stroke="hsl(38, 92%, 50%)" strokeWidth={2.5} dot={{ r: 3.5, fill: "hsl(38, 92%, 50%)" }} name="CAC" />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Registre métricas para ver a evolução</p>
        )}
      </div>
    </motion.div>
  );
};

export default CostBarChart;
