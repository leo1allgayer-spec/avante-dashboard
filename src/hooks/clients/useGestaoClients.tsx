import { useState, useEffect, useCallback } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { Client, ClientNote } from "@/types/clients/client";
import { useAuth } from "./useGestaoAuth";
import { toast } from "sonner";

interface DbClient {
  id: string;
  intake_token?: string;
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

const CONTRACT_CONFIG_NOTE_ID = "__contract_config__";
const CLIENT_AREA_NOTE_ID = "__client_area__";
const CLIENT_PROFILE_NOTE_ID = "__client_profile__";
export type ClientArea = "meta_ads" | "google_ads";

function getClientArea(notes: ClientNote[] | null | undefined): ClientArea {
  const stored = (notes || []).find((note) => note.id === CLIENT_AREA_NOTE_ID);
  return stored?.text === "google_ads" ? "google_ads" : "meta_ads";
}

function getContractConfig(notes: ClientNote[] | null | undefined, contractValue: number) {
  const stored = (notes || []).find((note) => note.id === CONTRACT_CONFIG_NOTE_ID);
  if (!stored) return { type: "MRR" as const, months: 1, monthly: contractValue };
  try {
    const parsed = JSON.parse(stored.text);
    const type = parsed.type === "TCV" ? "TCV" : "MRR";
    const months = Math.max(1, Number(parsed.months || 1));
    const monthly = type === "TCV" ? contractValue / months : contractValue;
    return { type, months, monthly } as const;
  } catch {
    return { type: "MRR" as const, months: 1, monthly: contractValue };
  }
}

function getClientProfile(notes: ClientNote[] | null | undefined) {
  const stored = (notes || []).find((note) => note.id === CLIENT_PROFILE_NOTE_ID);
  try {
    return stored ? JSON.parse(stored.text) : {};
  } catch {
    return {};
  }
}

function dbToClient(row: DbClient): Client {
  const clientName = row.name || "";
  const manager = row.manager || "Leonardo";
  const contractValue = Number((row as any).contract_value || 0) || 0;
  const contractConfig = getContractConfig(row.notes, contractValue);
  const profile = getClientProfile(row.notes);
  return {
    id: row.id,
    intakeToken: row.intake_token || "",
    name: clientName,
    company: row.company || "",
    instagram: row.instagram || "",
    responsibleName: profile.responsibleName || "",
    contractCompanyData: profile.contractCompanyData || "",
    email: profile.email || "",
    phone: profile.phone || "",
    servicesDescription: profile.servicesDescription || "",
    paymentMethod: profile.paymentMethod || "",
    dueDate: profile.dueDate || "",
    manager,
    status: row.status as "Ativo" | "Pausado",
    paymentStatus: ((row as any).payment_status || "a receber") as "pago" | "atrasado" | "a receber" | "permuta",
    monthlyBudget: Number(row.monthly_budget || 0),
    paymentDate: Number(row.payment_date || 1),
    commissionValue: Number(row.commission_value || 0),
    contractValue,
    contractType: contractConfig.type,
    contractMonths: contractConfig.months,
    monthlyContractValue: contractConfig.monthly,
    lastBalanceDate: row.last_balance_date || "",
    balanceNote: row.balance_note || "",
    lastReportDate: row.last_report_date || "",
    reportDay: row.report_day || "Segunda-feira",
    lastAccountUpdate: row.last_account_update || "",
    startDate: row.start_date || "",
    nextChargeDate: (row as any).next_charge_date || "",
    notes: ((row.notes as ClientNote[]) || []).filter((note) => ![CONTRACT_CONFIG_NOTE_ID, CLIENT_AREA_NOTE_ID, CLIENT_PROFILE_NOTE_ID].includes(note.id)),
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

function clientToDb(client: Client, userId: string, area: ClientArea) {
  const contractConfigNote: ClientNote = {
    id: CONTRACT_CONFIG_NOTE_ID,
    date: "",
    text: JSON.stringify({ type: client.contractType, months: Math.max(client.contractMonths || 1, 1) }),
  };
  const clientProfileNote: ClientNote = {
    id: CLIENT_PROFILE_NOTE_ID,
    date: "",
    text: JSON.stringify({
      responsibleName: client.responsibleName || "",
      contractCompanyData: client.contractCompanyData || "",
      email: client.email || "",
      phone: client.phone || "",
      servicesDescription: client.servicesDescription || "",
      paymentMethod: client.paymentMethod || "",
      dueDate: client.dueDate || "",
    }),
  };
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
    notes: [
      ...client.notes.filter((note) => ![CONTRACT_CONFIG_NOTE_ID, CLIENT_AREA_NOTE_ID, CLIENT_PROFILE_NOTE_ID].includes(note.id)),
      contractConfigNote,
      clientProfileNote,
      { id: CLIENT_AREA_NOTE_ID, date: "", text: area },
    ] as any,
  });
}

export function useClients(area: ClientArea = "meta_ads") {
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
      setClients((data as unknown as DbClient[]).filter((row) => getClientArea(row.notes) === area).map(dbToClient));
    }
    setLoading(false);
  }, [session?.user?.id, area]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel(`gestao-clients-realtime-${area}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "gestao_clients" }, () => fetchClients())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, fetchClients, area]);

  const addClient = async (client: Client) => {
    if (!session?.user?.id) return;
    const dbData = clientToDb(client, session.user.id, area);
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
    const dbData = clientToDb(client, session.user.id, area);
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
