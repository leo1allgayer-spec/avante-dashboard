import { motion } from "framer-motion";
import { useMonthMetrics } from "@/hooks/useMetrics";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface LeadsPieChartProps {
  leads: number;
  leadsMql: number;
}

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
  const leads = payload.find((p: any) => p.dataKey === "leads")?.value || 0;
  const mql = payload.find((p: any) => p.dataKey === "mql")?.value || 0;
  const rate = leads > 0 ? ((mql / leads) * 100).toFixed(1) : "0";
  return (
    <div style={tooltipStyle}>
      <p className="text-[11px] text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-8 text-xs mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-border/30 mt-1.5 pt-1.5 text-[11px] text-muted-foreground">
        Conversão: <span className="text-foreground font-semibold">{rate}%</span>
      </div>
    </div>
  );
};

const LeadsPieChart = ({ leads, leadsMql }: LeadsPieChartProps) => {
  const { data: monthData } = useMonthMetrics();

  const chartData = (monthData || []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit" }),
    leads: Number(d.leads),
    mql: Number(d.lead_mql),
  }));

  const conversionRate = leads > 0 ? ((leadsMql / leads) * 100).toFixed(1) : "0";

  return (
    <motion.div whileHover={{ y: -2 }} className="glass-card-hover rounded-xl p-6 relative overflow-hidden group">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold text-foreground">Leads vs MQL</h3>
          <span className="text-[10px] font-bold tabular-nums px-2.5 py-1 rounded-md bg-accent/15 text-accent">
            {conversionRate}% conversão
          </span>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-lg bg-secondary/50 p-3 border border-border/30 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Total Leads</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: "hsl(270, 70%, 60%)" }}>{leads}</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 border border-border/30 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">MQL</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: "hsl(174, 75%, 48%)" }}>{leadsMql}</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} barCategoryGap="25%">
              <defs>
                <linearGradient id="leadsArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(260, 18%, 12%)", radius: 4 }} />
              <Area type="monotone" dataKey="leads" stroke="hsl(270, 70%, 60%)" strokeWidth={2} fill="url(#leadsArea)" name="Leads" />
              <Bar dataKey="mql" fill="hsl(174, 75%, 48%)" radius={[4, 4, 0, 0]} opacity={0.85} name="MQL" barSize={14} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Registre métricas para ver a evolução</p>
        )}
      </div>
    </motion.div>
  );
};

export default LeadsPieChart;
