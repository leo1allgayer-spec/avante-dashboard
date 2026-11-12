import type { Venda } from "@/hooks/useVendas";

export const saleMethods = [
  ["conversa", "Conversa"], ["ligacao", "Ligação"],
  ["reuniao_na_hora", "Fechou na reunião"], ["reuniao_depois", "Fechou depois da reunião"],
  ["reuniao", "Reunião — a definir"], ["nao_informado", "Não informado"],
] as const;

export function saleMethodAnalytics(sales: Venda[], since: string, until: string) {
  const groups = new Map<string, Venda[]>();
  for (const sale of sales) {
    if (sale.data < since || sale.data > until || ["cancelada", "cancelado", "recusada", "recusado"].includes(sale.status.toLowerCase().trim())) continue;
    const key = [sale.data, sale.cliente.trim().toLowerCase(), sale.vendedor.trim().toLowerCase()].join("|");
    groups.set(key, [...(groups.get(key) || []), sale]);
  }
  const buckets = saleMethods.map(([key, label]) => ({key, label, count:0, revenue:0}));
  for (const rows of groups.values()) {
    const latest = [...rows].sort((a,b) => b.updated_at.localeCompare(a.updated_at)).find(row => row.forma_venda && row.forma_venda !== "nao_informado");
    const bucket = buckets.find(item => item.key === latest?.forma_venda) || buckets[buckets.length - 1];
    bucket.count++;
    bucket.revenue += rows.reduce((sum,row) => sum + Number(row.valor || 0),0);
  }
  const atMeeting = buckets.find(b => b.key === "reuniao_na_hora")!;
  const afterMeeting = buckets.find(b => b.key === "reuniao_depois")!;
  return {total:groups.size,buckets,atMeeting:atMeeting.count,afterMeeting:afterMeeting.count,closedMeetings:atMeeting.count+afterMeeting.count,meetingRevenue:atMeeting.revenue+afterMeeting.revenue};
}
