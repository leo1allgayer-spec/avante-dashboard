import { AlertStatus } from "@/types/client";

interface StatusIndicatorProps {
  status: AlertStatus;
  label?: string;
}

const config: Record<AlertStatus, { emoji: string; label: string; classes: string }> = {
  ok: { emoji: "🟢", label: "Em dia", classes: "bg-status-ok status-ok" },
  warn: { emoji: "🟡", label: "Atenção", classes: "bg-status-warn status-warn" },
  today: { emoji: "🟠", label: "Hoje", classes: "bg-status-today text-status-today" },
  late: { emoji: "🔴", label: "Atrasado", classes: "bg-status-late status-late" },
};

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${c.classes}`}>
      <span>{c.emoji}</span>
      {label || c.label}
    </span>
  );
}
