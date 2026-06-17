import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { DailyMetrics } from "@/hooks/useMetrics";

const tooltipStyle = {
  backgroundColor: "hsl(260, 22%, 10%)",
  border: "1px solid hsl(260, 18%, 18%)",
  borderRadius: "8px",
  color: "hsl(240, 10%, 93%)",
  fontSize: 12,
};
const axisStyle = { fontSize: 11, fill: "hsl(260, 10%, 45%)" };
const gridStroke = "hsl(260, 18%, 14%)";

const LeadsFunnelChart = ({ monthData }: { monthData: DailyMetrics[] }) => {
  const chartData = monthData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit" }),
    leads: d.leads,
    mql: d.lead_mql,
  }));

  if (chartData.length === 0) {
    return (
      <div className="glass-card rounded-lg p-5 flex items-center justify-center h-56">
        <p className="text-muted-foreground text-sm">Sem dados de leads no mês</p>
      </div>
    );
  }

  return (
    <motion.div whileHover={{ y: -2 }} className="glass-card-hover rounded-lg p-5">
      <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Leads vs MQL — Evolução Mensal</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gMql" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(174, 75%, 48%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(174, 75%, 48%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: gridStroke }} />
          <YAxis tick={axisStyle} axisLine={{ stroke: gridStroke }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="leads" stroke="hsl(270, 70%, 60%)" strokeWidth={2} fillOpacity={1} fill="url(#gLeads)" name="Leads" />
          <Area type="monotone" dataKey="mql" stroke="hsl(174, 75%, 48%)" strokeWidth={2} fillOpacity={1} fill="url(#gMql)" name="MQL" />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default LeadsFunnelChart;
