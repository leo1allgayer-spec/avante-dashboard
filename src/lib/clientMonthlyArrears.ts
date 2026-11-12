import { Client } from "@/types/clients/client";

export function rollMonthlyArrears(client: Pick<Client, "billingMonth" | "overduePayments" | "monthlyContractValue" | "paidMonth" | "receivedMonth" | "monthlyReceived" | "paymentStatus" | "status" | "contractSettled">, currentMonth: string) {
  const overdue = [...(client.overduePayments || [])];
  let month = client.billingMonth || currentMonth;
  while (month < currentMonth) {
    const received = client.receivedMonth === month ? Number(client.monthlyReceived || 0) : 0;
    const paid = client.paidMonth === month || (!client.paidMonth && client.paymentStatus === "pago");
    const amount = Math.max(client.monthlyContractValue - received, 0);
    if (client.status === "Ativo" && !client.contractSettled && client.paymentStatus !== "permuta" && !paid && amount > 0 && !overdue.some(item => item.month === month)) overdue.push({month, amount});
    const [year, number] = month.split("-").map(Number);
    month = `${number === 12 ? year + 1 : year}-${String(number === 12 ? 1 : number + 1).padStart(2,"0")}`;
  }
  return { billingMonth: currentMonth, overduePayments: overdue };
}
