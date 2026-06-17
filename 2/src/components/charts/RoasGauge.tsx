import { motion } from "framer-motion";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

interface RoasGaugeProps {
  roas: number;
}

const RoasGauge = ({ roas }: RoasGaugeProps) => {
  const maxRoas = Math.max(roas * 1.5, 5);
  const pct = Math.min((roas / maxRoas) * 100, 100);
  const color = roas >= 3 ? "hsl(152, 60%, 42%)" : roas >= 1 ? "hsl(174, 75%, 48%)" : "hsl(4, 72%, 56%)";
  const label = roas >= 3 ? "Excelente" : roas >= 1 ? "Positivo" : "Negativo";

  const data = [
    { name: "bg", value: 100, fill: "hsl(260, 18%, 14%)" },
    { name: "ROAS", value: pct, fill: color },
  ];

  return (
    <motion.div whileHover={{ y: -2 }} className="glass-card-hover rounded-lg p-5 relative">
      <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">ROAS</h3>
      <ResponsiveContainer width="100%" height={250}>
        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="85%" barSize={12} data={data} startAngle={210} endAngle={-30}>
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(260, 18%, 12%)" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="font-display text-3xl font-bold" style={{ color }}>{roas.toFixed(1)}x</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default RoasGauge;
