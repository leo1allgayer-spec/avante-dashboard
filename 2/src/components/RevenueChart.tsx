import { motion } from "framer-motion";
import { useMonthMetrics } from "@/hooks/useMetrics";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine,
} from "recharts";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

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

const RevenueChart = () => {
  const { data: monthData } = useMonthMetrics();

  const chartData = (monthData || []).map((d, i, arr) => {
    const acumulado = arr.slice(0, i + 1).reduce((s, x) => s + Number(x.faturamento_dia), 0);
    return {
      date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit" }),
      faturamento: Number(d.faturamento_dia),
      meta: Number(d.meta_diaria_prevista),
      acumulado,
    };
  });

  const avgMeta = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.meta, 0) / chartData.length
    : 0;

  if (chartData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Registre métricas para visualizar o gráfico</p>
      </div>
    );
  }

  return (
    <motion.div whileHover={{ y: -2 }} className="glass-card-hover rounded-xl p-6 relative overflow-hidden group">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold text-foreground">Faturamento vs Meta</h3>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "linear-gradient(135deg, hsl(174, 75%, 48%), hsl(174, 75%, 38%))" }} />
              Faturamento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full bg-[hsl(270,70%,60%)]" style={{ borderTop: "2px dashed hsl(270, 70%, 60%)" }} />
              Meta
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} barCategoryGap="20%">
            <defs>
              <linearGradient id="fatBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(174, 75%, 52%)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="hsl(174, 75%, 38%)" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="metaLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(270, 70%, 55%)" />
                <stop offset="100%" stopColor="hsl(310, 60%, 55%)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(260, 18%, 12%)", radius: 4 }} />
            {avgMeta > 0 && (
              <ReferenceLine y={avgMeta} stroke="hsl(270, 70%, 60%)" strokeDasharray="6 4" strokeOpacity={0.4} label={{ value: `Meta: ${formatCurrency(avgMeta)}`, position: "insideTopRight", fill: "hsl(270, 70%, 60%)", fontSize: 10 }} />
            )}
            <Bar dataKey="faturamento" fill="url(#fatBar)" radius={[6, 6, 0, 0]} name="Faturamento" />
            <Line type="monotone" dataKey="meta" stroke="url(#metaLine)" strokeWidth={2.5} dot={false} strokeDasharray="6 3" name="Meta" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default RevenueChart;
