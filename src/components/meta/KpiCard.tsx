import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  trendLabel?: string;
  variant: "spend" | "revenue" | "roas" | "conversions";
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon,
  trend,
  trendLabel = "vs. últimos 30 dias",
  variant,
}) => {
  return (
    <div className={`glass-panel glass-card kpi-card kpi-${variant} animate-fade-in`}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon">{icon}</div>
      </div>
      
      <div className="kpi-value">{value}</div>
      
      {trend && (
        <div className="kpi-footer">
          <span className={`trend-indicator ${trend.isPositive ? "trend-up" : "trend-down"}`}>
            {trend.isPositive ? (
              <ArrowUpRight size={16} />
            ) : (
              <ArrowDownRight size={16} />
            )}
            {Math.abs(trend.value)}%
          </span>
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
};
export default KpiCard;
