import { useState, useEffect, useCallback } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { Client, ClientNote } from "@/types/clients/client";
import { useAuth } from "./useGestaoAuth";
import { toast } from "sonner";

interface DbClient {
  id: string;
  user_id: string;
  name?: string;
  company?: string;
  instagram: string | null;
  manager?: string;
  status: string;
  monthly_budget?: number;
  payment_date?: number;
  commission_value?: number;
  last_balance_date?: string;
  balance_note?: string;
  last_report_date?: string;
  report_day?: string;
  last_account_update?: string;
  start_date?: string;
  notes: ClientNote[];
  created_at: string;
}

function dbToClient(row: DbClient): Client {
  const clientName = row.name || "";
  const manager = row.manager || "Leonardo";
  return {
    id: row.id,
    name: clientName,
    company: row.company || "",
    instagram: row.instagram || "",
    manager,
    status: row.status as "Ativo" | "Pausado",
    paymentStatus: ((row as any).payment_status || "a receber") as "pago" | "atrasado" | "a receber" | "permuta",
    monthlyBudget: Number(row.monthly_budget || 0),
    paymentDate: Number(row.payment_date || 1),
    commissionValue: Number(row.commission_value || 0),
    contractValue: Number((row as any).contract_value || 0) || 0,
    lastBalanceDate: row.last_balance_date || "",
    balanceNote: row.balance_note || "",
    lastReportDate: row.last_report_date || "",
    reportDay: row.report_day || "Segunda-feira",
    lastAccountUpdate: row.last_account_update || "",
    startDate: row.start_date || "",
    nextChargeDate: (row as any).next_charge_date || "",
    notes: (row.notes as ClientNote[]) || [],
  };
}

const nullableDate = (value?: string | null) => value && value.trim() ? value : null;
const CLIENT_DATE_FIELDS = [
  "last_balance_date",
  "last_report_date",
  "last_account_update",
  "start_date",
  "next_charge_date",
];

function sanitizeClientDates<T extends Record<string, any>>(data: T): T {
  CLIENT_DATE_FIELDS.forEach((field) => {
    if (data[field] === "") data[field] = null;
  });
  return data;
}

function clientToDb(client: Client, userId: string) {
  return sanitizeClientDates({
    id: client.id,
    user_id: userId,
    name: client.name,
    company: client.company,
    instagram: client.instagram,
    manager: client.manager,
    status: client.status,
    payment_status: client.paymentStatus,
    monthly_budget: client.monthlyBudget,
    payment_date: client.paymentDate,
    commission_value: client.commissionValue,
    contract_value: client.contractValue,
    last_balance_date: nullableDate(client.lastBalanceDate),
    balance_note: client.balanceNote,
    last_report_date: nullableDate(client.lastReportDate),
    report_day: client.reportDay,
    last_account_update: nullableDate(client.lastAccountUpdate),
    start_date: nullableDate(client.startDate),
    next_charge_date: nullableDate(client.nextChargeDate),
    notes: client.notes as any,
  });
}

export function useClients() {
  const { session } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("gestao_clients" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar clientes");
      console.error(error);
    } else {
      setClients((data as unknown as DbClient[]).map(dbToClient));
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel("gestao-clients-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "gestao_clients" }, () => fetchClients())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, fetchClients]);

  const addClient = async (client: Client) => {
    if (!session?.user?.id) return;
    const dbData = clientToDb(client, session.user.id);
    // Remove the client-generated id, let DB generate UUID
    const { id, ...rest } = sanitizeClientDates(dbData);
    const { data, error } = await supabase
      .from("gestao_clients" as any)
      .insert(rest as any)
      .select()
      .single();

    if (error) {
      toast.error(`Erro ao adicionar cliente: ${error.message}`);
      console.error(error);
      throw error;
    } else {
      setClients((prev) => [dbToClient(data as unknown as DbClient), ...prev]);
      toast.success("Cliente adicionado!");
    }
  };

  const updateClient = async (client: Client) => {
    if (!session?.user?.id) return;
    const dbData = clientToDb(client, session.user.id);
    const { id, user_id, ...rest } = sanitizeClientDates(dbData);
    const { error } = await supabase
      .from("gestao_clients" as any)
      .update(rest as any)
      .eq("id", client.id);

    if (error) {
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
      console.error(error);
      throw error;
    } else {
      setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
    }
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase
      .from("gestao_clients" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir cliente");
      console.error(error);
    } else {
      setClients((prev) => prev.filter((c) => c.id !== id));
      toast.success("Cliente excluído!");
    }
  };

  return { clients, loading, addClient, updateClient, deleteClient };
}
