import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FilterMode } from "@/hooks/useDateFilter";

interface DateFilterBarProps {
  mode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
  label: string;
  onBack: () => void;
  onForward: () => void;
}

const modes: { value: FilterMode; label: string }[] = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
];

const DateFilterBar = ({ mode, onModeChange, label, onBack, onForward }: DateFilterBarProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-1">
      {/* Mode Toggle */}
      <div className="flex items-center rounded-lg p-0.5" style={{ background: "hsl(260, 22%, 11%)", border: "1px solid hsl(260, 15%, 18%)" }}>
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === m.value
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Period Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-display text-sm font-semibold text-foreground min-w-[200px] text-center">{label}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onForward}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DateFilterBar;
