import type { ReactNode } from "react";
import { change } from "@/lib/evolutionMetrics";

export const money = (value: number | null) => value == null ? "Dados insuficientes" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
export const number = (value: number | null) => value == null ? "Dados insuficientes" : value.toLocaleString("pt-BR");
export const percent = (value: number | null) => value == null ? "Dados insuficientes" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
export function Comparison({ current, previous }: { current: number | null; previous: number | null }) {
  const value = change(current, previous);
  return <span className="block text-xs text-muted-foreground">{value == null ? "Comparação indisponível: sem base anterior" : `${value > 0 ? "↑" : value < 0 ? "↓" : "→"} ${percent(Math.abs(value))} vs. período anterior`}</span>;
}
export function Metric({ title, value, detail, current, previous }: { title: string; value: string; detail?: string; current?: number | null; previous?: number | null }) {
  return <article className="min-w-0 rounded-xl border border-border/60 bg-card p-4 sm:p-5"><h3 className="text-xs text-muted-foreground">{title}</h3><p className={`my-3 break-words font-semibold tracking-tight tabular-nums ${value === "Dados insuficientes" ? "text-base text-muted-foreground" : "text-2xl"}`}>{value}</p>{current !== undefined && <Comparison current={current} previous={previous ?? null} />}{detail && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>}</article>;
}
export function Section({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold">{title}</h2>{description && <p className="mt-1 max-w-4xl text-xs leading-relaxed text-muted-foreground">{description}</p>}</div>{action}</div>{children}</section>;
}
