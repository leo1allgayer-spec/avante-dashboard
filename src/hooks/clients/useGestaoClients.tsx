import { useState, useEffect, useCallback } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { Client, ClientNote } from "@/types/clients/client";
import { useAuth } from "./useGestaoAuth";
import { toast } from "sonner";

interface DbClient {
  id: string;
  user_id: string;
  name: string;
  company: string;
  instagram: string;
  manager: string;
  status: string;
  monthly_budget: number;
  payment_date: number;
  commission_value: number;
  last_balance_date: string;
  balance_note: string;
  last_report_date: string;
  report_day: string;
  last_account_update: string;
  start_date: string;
  notes: ClientNote[];
  created_at: string;
}

function dbToClient(row: DbClient): Client {
  return {
    id: row.id,
    name: row.name,
    company: row.company || "",
    instagram: row.instagram || "",
    manager: row.manager,
    status: row.status as "Ativo" | "Pausado",
    paymentStatus: ((row as any).payment_status || "a receber") as "pago" | "atrasado" | "a receber" | "permuta",
    monthlyBudget: Number(row.monthly_budget),
    paymentDate: row.payment_date,
    commissionValue: Number(row.commission_value),
    contractValue: Number((row as any).contract_value) || 0,
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

function clientToDb(client: Client, userId: string) {
  return {
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
    last_balance_date: client.lastBalanceDate,
    balance_note: client.balanceNote,
    last_report_date: client.lastReportDate,
    report_day: client.reportDay,
    last_account_update: client.lastAccountUpdate,
    start_date: client.startDate,
    next_charge_date: client.nextChargeDate || "",
    notes: client.notes as any,
  };
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
      .from("clients")
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
      .channel("clients-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => fetchClients())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, fetchClients]);

  const addClient = async (client: Client) => {
    if (!session?.user?.id) return;
    const dbData = clientToDb(client, session.user.id);
    // Remove the client-generated id, let DB generate UUID
    const { id, ...rest } = dbData;
    const { data, error } = await supabase
      .from("clients")
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
    const { id, user_id, ...rest } = dbData;
    const { error } = await supabase
      .from("clients")
      .update(rest as any)
      .eq("id", client.id);

    if (error) {
      toast.error("Erro ao atualizar cliente");
      console.error(error);
    } else {
      setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
    }
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase
      .from("clients")
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
