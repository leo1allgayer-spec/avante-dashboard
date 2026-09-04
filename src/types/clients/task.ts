export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  dailyTaskGoal: number;
  weeklyTaskGoal: number;
  maxTaskMinutes: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  dueDate: string;
  priority: "Baixa" | "Média" | "Alta";
  status: "Pendente" | "Em andamento" | "Revisão" | "Concluída";
  isDaily: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  userId: string;
}

export interface Meeting {
  id: string;
  title: string;
  meetingType?: string;
  clientName?: string;
  date: string;
  time: string;
  durationMinutes?: number;
  responsible?: string;
  professional?: string;
  participants: string[];
  description: string;
  status: "pending" | "completed" | "cancelled";
  outcome: "positive" | "negative" | null;
  origin: string;
  service: string;
  modality: "presencial" | "online";
  hasClosed: boolean;
  closingStatus?: "pending" | "closed" | "not_closed";
  objection?: string;
  source?: "local" | "crm";
  externalId?: string;
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}min`;
  return `${minutes}min`;
}

export function getSpeedIndicator(ms: number, maxMinutes: number): "fast" | "normal" | "slow" {
  const minutes = ms / 60000;
  if (minutes <= maxMinutes * 0.5) return "fast";
  if (minutes <= maxMinutes) return "normal";
  return "slow";
}
