export interface ClientNote {
  id: string;
  date: string;
  text: string;
}

export type PaymentStatus = "pago" | "atrasado" | "a receber" | "permuta";

export interface Client {
  id: string;
  name: string;
  company: string;
  instagram: string;
  manager: string;
  status: "Ativo" | "Pausado";
  paymentStatus: PaymentStatus;
  // Financial
  monthlyBudget: number;
  paymentDate: number; // day of month
  commissionValue: number;
  contractValue: number;
  // Balance
  lastBalanceDate: string;
  balanceNote: string;
  // Reports
  lastReportDate: string;
  reportDay: string; // dia da semana para entrega do relatório
  // Account
  lastAccountUpdate: string;
  // Retention
  startDate: string;
  // Charge
  nextChargeDate?: string;
  // Notes
  notes: ClientNote[];
}

export type AlertStatus = "ok" | "warn" | "today" | "late";

export function getAlertStatus(dateStr: string): AlertStatus {
  if (!dateStr) return "late";
  const markedDate = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (today.getTime() - markedDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "ok"; // data futura
  if (diff <= 5) return "ok";
  if (diff === 6) return "warn"; // amanhã
  if (diff === 7) return "today"; // hoje
  return "late"; // 8+ dias
}

export function getAlertLabel(dateStr: string): string {
  if (!dateStr) return "—";
  const markedDate = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (today.getTime() - markedDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "em dia";
  if (diff <= 5) return "em dia";
  if (diff === 6) return "amanhã";
  if (diff === 7) return "hoje";
  return "atrasado";
}

export function getRetentionMonths(startDate: string): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  return Math.max(0, months);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export const MANAGERS = ["Leonardo", "Lucas", "Nicolas"];

export const WEEKDAYS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];
