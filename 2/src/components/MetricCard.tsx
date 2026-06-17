import { ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import CountUp from "react-countup";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "accent" | "primary" | "success" | "warning";
  countUp?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

const iconBg: Record<string, string> = {
  default: "bg-secondary text-muted-foreground",
  accent: "bg-accent/10 text-accent",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

const borderAccent: Record<string, string> = {
  default: "",
  accent: "border-l-2 border-l-accent",
  primary: "border-l-2 border-l-primary",
  success: "border-l-2 border-l-success",
  warning: "border-l-2 border-l-warning",
};

const MetricCard = ({
  title, value, subtitle, icon, trend, trendValue,
  variant = "default", countUp = false, prefix = "", suffix = "", decimals = 0,
}: MetricCardProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const numValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.-]/g, ""));

  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`glass-card-hover rounded-lg p-5 ${borderAccent[variant]} relative overflow-hidden`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{title}</p>
          <p className="font-display text-2xl font-bold text-foreground tracking-tight">
            {countUp && isInView && !isNaN(numValue) ? (
              <CountUp end={numValue} duration={2} prefix={prefix} suffix={suffix} decimals={decimals} separator="." decimal="," />
            ) : value}
          </p>
          {subtitle && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg[variant]}`}>
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ${
            trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
          }`}>
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"} {trendValue}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default MetricCard;
