import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import CountUp from "react-countup";

interface GoalProgressProps {
  label: string;
  prevista: number;
  realizada: number;
  superMeta?: number;
  format?: "currency" | "number";
}

const formatValue = (value: number, format: "currency" | "number") => {
  if (format === "currency") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }
  return new Intl.NumberFormat("pt-BR").format(value);
};

const GoalProgress = ({ label, prevista, realizada, superMeta, format = "currency" }: GoalProgressProps) => {
  const percentage = prevista > 0 ? Math.min((realizada / prevista) * 100, 100) : 0;
  const superPercentage = superMeta && superMeta > 0 ? Math.min((realizada / superMeta) * 100, 100) : 0;
  const isOver = realizada > prevista && prevista > 0;
  const isSuperOver = superMeta ? realizada >= superMeta : false;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [animWidth, setAnimWidth] = useState(0);
  const [animSuperWidth, setAnimSuperWidth] = useState(0);

  useEffect(() => {
    if (isInView) {
      const t = setTimeout(() => {
        setAnimWidth(percentage);
        setAnimSuperWidth(superPercentage);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isInView, percentage, superPercentage]);

  const barColor = isOver ? "bg-success" : percentage >= 80 ? "bg-accent" : "bg-primary";
  const superBarColor = isSuperOver ? "bg-success" : superPercentage >= 80 ? "bg-amber-500" : "bg-amber-400/60";

  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -2 }}
      className="glass-card-hover rounded-lg p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">{label}</h3>
        <span className={`text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-md ${
          isOver ? "bg-success/15 text-success" : percentage >= 80 ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary"
        }`}>
          {isInView ? <CountUp end={percentage} duration={1.5} decimals={0} suffix="%" /> : "0%"}
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Meta: <span className="text-foreground/70 font-medium">{formatValue(prevista, format)}</span></span>
          <span>Realizada: <span className="text-foreground/70 font-medium">{formatValue(realizada, format)}</span></span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${animWidth}%` }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className={`h-full rounded-full ${barColor} relative`}
          >
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>

      {superMeta != null && superMeta > 0 && (
        <div className="space-y-2.5 pt-1 border-t border-border/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold">Super Meta</span>
            <span className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-md ${
              isSuperOver ? "bg-success/15 text-success" : "bg-amber-400/15 text-amber-400"
            }`}>
              {isInView ? <CountUp end={superPercentage} duration={1.5} decimals={0} suffix="%" /> : "0%"}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Super Meta: <span className="text-amber-400/70 font-medium">{formatValue(superMeta, format)}</span></span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${animSuperWidth}%` }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${superBarColor} relative`}
            >
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default GoalProgress;
