import { isSocialOperationUser } from "@/lib/accessControl";
import { rollMonthlyArrears } from "@/lib/clientMonthlyArrears";
import { useState, useEffect, useCallback } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { Client, ClientNote, ClientUpdateOptions } from "@/types/clients/client";
import { useAuth } from "./useGestaoAuth";
import { toast } from "sonner";
import { isClientSummaryUser, isClientProfileEditor } from "@/lib/accessControl";

interface DbClient {
  satisfaction?: Client["satisfaction"];
  contract_renewal?: Client["contractRenewal"];
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
  if (!stored) return { type: "MRR" as const, months: 1, monthly: contractValue, paidMonth: undefined as string | undefined, settled: false, received: 0, receivedMonth: undefined as string | undefined, monthlyReceived: undefined as number | undefined };
  try {
    const parsed = JSON.parse(stored.text);
    const type = parsed.type === "TCV" ? "TCV" : "MRR";
    const months = Math.max(1, Number(parsed.months || 1));
    const monthly = parsed.monthly === undefined ? (type === "TCV" ? contractValue / months : contractValue) : Number(parsed.monthly);
    return { type, months, monthly, paidMonth: parsed.paidMonth as string | undefined, settled: Boolean(parsed.settled), received: Number(parsed.received || 0), receivedMonth: parsed.receivedMonth as string | undefined, monthlyReceived: parsed.monthlyReceived as number | undefined, billingMonth: parsed.billingMonth as string | undefined, overduePayments: parsed.overduePayments as Client["overduePayments"], arrearsReceivedMonth: parsed.arrearsReceivedMonth as string | undefined, arrearsReceived: Number(parsed.arrearsReceived || 0) } as const;
  } catch {
    return { type: "MRR" as const, months: 1, monthly: contractValue, paidMonth: undefined as string | undefined, settled: false, received: 0, receivedMonth: undefined as string | undefined, monthlyReceived: undefined as number | undefined };
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
  const currentMonth = new Intl.DateTimeFormat("sv-SE", {timeZone:"America/Sao_Paulo"}).format(new Date()).slice(0,7);
  const billing = contractConfig as typeof contractConfig & Pick<Client,"billingMonth" | "overduePayments" | "arrearsReceivedMonth" | "arrearsReceived">;
  const arrears = rollMonthlyArrears({ ...billing, monthlyContractValue: contractConfig.monthly, contractSettled: contractConfig.settled, status: row.status as Client["status"], paymentStatus: (row as any).payment_status || "a receber" },currentMonth);
  return {
    id: row.id,
    intakeToken: row.intake_token || "",
    name: clientName,
    level: ({ alto: "5", medio: "3", baixo: "1" } as Record<string, Client["level"]>)[profile.level] || profile.level || "nao_definido",
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
    satisfaction: row.satisfaction || profile.satisfaction || "nao_avaliado",
    contractRenewal: row.contract_renewal || profile.contractRenewal || "nao_definido",
    contractLifecycle: profile.contractLifecycle || "nao_informado",
    contractEndDate: profile.contractEndDate || "",
    paymentStatus: contractConfig.settled ? "pago" : (row as any).payment_status === "pago" && contractConfig.paidMonth && contractConfig.paidMonth !== new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date()).slice(0,7) ? "a receber" : ((row as any).payment_status || "a receber"),
    ...arrears,
    arrearsReceivedMonth: billing.arrearsReceivedMonth,
    arrearsReceived: billing.arrearsReceived,
    paidMonth: contractConfig.paidMonth,
    contractSettled: contractConfig.settled,
    contractReceived: contractConfig.received || 0,
    receivedMonth: contractConfig.receivedMonth,
    monthlyReceived: contractConfig.monthlyReceived,
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
    text: JSON.stringify({ type: client.contractType, months: Math.max(client.contractMonths || 1, 1), monthly: client.monthlyContractValue, paidMonth: client.paymentStatus === "pago" ? new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date()).slice(0,7) : client.paidMonth, settled: Boolean(client.contractSettled), received: Number(client.contractReceived || 0), receivedMonth: client.receivedMonth, monthlyReceived: client.monthlyReceived, ...rollMonthlyArrears(client, new Intl.DateTimeFormat("sv-SE", {timeZone:"America/Sao_Paulo"}).format(new Date()).slice(0,7)), arrearsReceivedMonth: client.arrearsReceivedMonth, arrearsReceived: client.arrearsReceived }),
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
      satisfaction: client.satisfaction || "nao_avaliado",
      contractRenewal: client.contractRenewal || "nao_definido",
      contractLifecycle: client.contractLifecycle || "nao_informado",
      contractEndDate: client.contractEndDate || "",
      level: client.level || "nao_definido",
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
  const [loadError, setLoadError] = useState(false);

  const fetchClients = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    const { data, error } = isSocialOperationUser(session.user.email)
      ? await supabase.rpc("list_social_operation_clients" as never)
      : isClientProfileEditor(session.user)
      ? await supabase.rpc("list_client_editor_profiles" as never)
      : (isClientSummaryUser(session.user) && !isClientProfileEditor(session.user))
      ? await supabase.rpc("list_client_summaries" as never)
      : await supabase.from("gestao_clients" as any).select("*").order("created_at", { ascending: false });

    setLoadError(Boolean(error));
    if (error) {
      toast.error("Erro ao carregar clientes");
      console.error(error);
    } else {
      setClients((data as unknown as DbClient[]).filter((row) => getClientArea(row.notes) === area && !(row.notes || []).some(note => note.id === "__duplicate_of__")).map(dbToClient));
    }
    setLoading(false);
  }, [session?.user?.id, area]);

  useEffect(() => {
    void fetchClients();
    const refresh = () => { if (document.visibilityState === "visible") void fetchClients(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
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
    if (isClientSummaryUser(session.user) && !isClientProfileEditor(session.user)) {
      const { error } = await (supabase as any).rpc("create_client_summary", {
        p_settings: {
          name: client.name,
          company: client.company || "",
          instagram: client.instagram || "",
          manager: client.manager,
          reportDay: client.reportDay,
        },
      });
      if (error) {
        toast.error(`Erro ao adicionar cliente: ${error.message}`);
        throw error;
      }
      await fetchClients();
      toast.success("Cliente adicionado!");
      return;
    }
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

  const updateClient = async (client: Client, options: ClientUpdateOptions = {}) => {
    if (!session?.user?.id) return;
    if (options.changeStatus && client.status === "Pausado" && !options.statusConfirmed && !window.confirm(`Pausar o cliente “${client.name}”? Ele será movido para a lista de clientes pausados.`)) return;
    if (isClientProfileEditor(session.user)) {
      const values = sanitizeClientDates(clientToDb(client, session.user.id, area));
      const allowed = ["name", "company", "instagram", "manager", "status", "monthly_budget", "last_balance_date", "balance_note", "last_report_date", "report_day", "last_account_update", "start_date", "notes"];
      const changes = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.includes(key)));
      if (!options.changeStatus) delete changes.status;
      const { error } = await (supabase as any).rpc("update_client_editor_profile", { p_id: client.id, p_changes: changes });
      if (error) { toast.error("Não foi possível salvar o perfil"); throw error; }
      await fetchClients();
      return;
    }
    if ((isClientSummaryUser(session.user) && !isClientProfileEditor(session.user))) {
      const previous = clients.find(row => row.id === client.id);
      if (!previous) return;
      const fields = { name: 'name', instagram: 'instagram', manager: 'manager', status: 'status', monthlyBudget: 'monthly_budget', lastBalanceDate: 'last_balance_date', lastReportDate: 'last_report_date', reportDay: 'report_day' } as const;
      const changes: Record<string, unknown> = {};
      for (const [field, column] of Object.entries(fields)) {
        if (field === "status" && !options.changeStatus) continue;
        if (client[field as keyof Client] !== previous[field as keyof Client]) changes[column] = client[field as keyof Client];
      }
      if (!Object.keys(changes).length) return;
      const { error } = await (supabase as any).rpc('update_client_summary', { p_id: client.id, p_changes: changes });
      if (error) { toast.error('Não foi possível salvar a alteração'); return; }
      await fetchClients();
      toast.success('Informação atualizada');
      return;
    }
    const dbData = clientToDb(client, session.user.id, area);
    const { id, user_id, ...rest } = sanitizeClientDates(dbData);
    if (!options.changeStatus) delete (rest as Partial<typeof rest>).status;
    const { error } = await supabase
      .from("gestao_clients" as any)
      .update(rest as any)
      .eq("id", client.id);

    if (error) {
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
      console.error(error);
      throw error;
    } else {
      await fetchClients();
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

  return { clients, loading, loadError, addClient, updateClient, deleteClient };
}
