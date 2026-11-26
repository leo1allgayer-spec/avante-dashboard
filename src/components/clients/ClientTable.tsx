import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Client, PaymentStatus, AlertStatus, getAlertStatus, getAlertLabel, getRetentionMonths, getMonthlyContractValue, getTotalContractValue, formatCurrency, MANAGERS, WEEKDAYS } from "@/types/clients/client";
import { StatusIndicator } from "@/components/clients/StatusIndicator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, ArrowUpDown, CalendarIcon, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EditableCell } from "@/components/clients/EditableCell";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const META_BALANCE_MANAGERS = new Set(["digitalavante3@gmail.com", "nicolaspatzlaff02@gmail.com", "lucadsilva666@gmail.com", "leonardowebster.ja@gmail.com"]);
const META_BALANCE_SUMMARY_VIEWERS = new Set(["emanoelbull@gmail.com", "zanchikaua7@gmail.com", "hiagooleques1505@gmail.com"]);
type MetaBalance = { accountId?: string; available: number | null; currency: string; status: string };

interface ClientTableProps {
  clients: Client[];
  onClientClick: (id: string) => void;
  onUpdateClient: (client: Client, options?: { changeStatus?: boolean; statusConfirmed?: boolean }) => void;
  onDeleteClient: (id: string) => void;
  onAddClient: () => void;
  onlyStatus?: "Ativo" | "Pausado";
  title?: string;
  hideContractValues?: boolean;
  hideContractAmounts?: boolean;
  summaryOnly?: boolean;
  allowAddClient?: boolean;
  managerOptions?: readonly string[];
}

type SortKey = "name" | "retention" | "paymentDate" | "lastAccountUpdate" | "lastBalanceDate";

export function ClientTable({ clients, onClientClick, onUpdateClient, onDeleteClient, onAddClient, onlyStatus, title, hideContractValues = false, hideContractAmounts = false, summaryOnly = false, allowAddClient = false, managerOptions = MANAGERS }: ClientTableProps) {
  const { session } = useAuth();
  const userEmail = (session?.user.email || "").trim().toLowerCase();
  const hideInternalFinancial = userEmail === "emanoelbull@gmail.com";
  const canViewMetaBalance = META_BALANCE_SUMMARY_VIEWERS.has(userEmail) || (!summaryOnly && META_BALANCE_MANAGERS.has(userEmail));
  const metaBalances = useQuery({
    queryKey: ["client-meta-balances", session?.user.id],
    enabled: canViewMetaBalance,
    staleTime: 300000,
    refetchInterval: 300000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("client-meta-ads", { body: { action: "balances" } });
      if (error) throw error;
      return data as { balances: Record<string, MetaBalance>; checkedAt: string };
    },
  });
  const [search, setSearch] = useState("");
  const [filterManager, setFilterManager] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAlert, setFilterAlert] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastBalanceDate");
  const [sortAsc, setSortAsc] = useState(true);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  const filtered = useMemo(() => {
    let result = clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.instagram.toLowerCase().includes(search.toLowerCase());
      const matchesManager = filterManager === "all" || c.manager === filterManager;
      const matchesStatus = onlyStatus ? c.status === onlyStatus : (filterStatus === "all" || c.status === filterStatus);
      const matchesPayment = filterPayment === "all" || c.paymentDate === Number(filterPayment);
      if (!matchesSearch || !matchesManager || !matchesStatus || !matchesPayment) return false;
      if (filterAlert === "late") {
        const isLate =
          getAlertStatus(c.lastBalanceDate) === "late" ||
          getAlertStatus(c.lastReportDate) === "late" ||
          getAlertStatus(c.lastAccountUpdate) === "late";
        if (!isLate) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      // Ativos sempre primeiro
      if (a.status !== b.status) {
        return a.status === "Ativo" ? -1 : 1;
      }
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "retention":
          cmp = getRetentionMonths(a.startDate) - getRetentionMonths(b.startDate);
          break;
        case "paymentDate":
          cmp = a.paymentDate - b.paymentDate;
          break;
        case "lastAccountUpdate":
          cmp = new Date(a.lastAccountUpdate).getTime() - new Date(b.lastAccountUpdate).getTime();
          break;
        case "lastBalanceDate": {
          // Sem data = mais urgente (valor muito antigo)
          const dateA = a.lastBalanceDate ? new Date(a.lastBalanceDate + "T00:00:00").getTime() : 0;
          const dateB = b.lastBalanceDate ? new Date(b.lastBalanceDate + "T00:00:00").getTime() : 0;
          // Menor data (mais antiga) = mais urgente = primeiro
          cmp = dateA - dateB;
          break;
        }
      }
      // O resumo e a consulta completa chegam em ordens diferentes do banco.
      // Desempate estável para que ambas as contas mostrem a mesma sequência.
      const stableCmp = (Number.isFinite(cmp) ? cmp : 0) || a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id);
      return sortAsc ? stableCmp : -stableCmp;
    });

    return result;
  }, [clients, search, filterManager, filterStatus, filterAlert, filterPayment, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleInlineEdit = (client: Client, field: keyof Client, value: string) => {
    const numericFields: (keyof Client)[] = ["monthlyBudget", "commissionValue", "paymentDate", "contractValue", "contractMonths"];
    const updated = { ...client, [field]: numericFields.includes(field) ? Number(value) : value };
    onUpdateClient(updated);
    setEditingCell(null);
  };

  const PAYMENT_STATUSES: PaymentStatus[] = ["pago", "atrasado", "a receber", "permuta"];
  const paymentStatusColors: Record<PaymentStatus, string> = {
    "pago": "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
    "atrasado": "border-red-500/45 bg-red-500/20 text-red-300",
    "a receber": "border-amber-500/45 bg-amber-500/20 text-amber-200",
    "permuta": "border-blue-500/45 bg-blue-500/20 text-blue-300",
  };

  const alertBadgeClasses: Record<AlertStatus, string> = {
    ok: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
    warn: "border-yellow-500/45 bg-yellow-500/15 text-yellow-200",
    today: "border-orange-500/45 bg-orange-500/15 text-orange-200",
    late: "border-red-500/45 bg-red-500/15 text-red-300",
  };

  const moneyTone = (value: number) =>
    Number(value) > 0 ? "text-foreground font-semibold" : "text-muted-foreground";

  const renderEditable = (client: Client, field: keyof Client, display: string, type = "text") => {
    const isEditing = editingCell?.id === client.id && editingCell?.field === field;
    if (isEditing) {
      return (
        <input
          autoFocus
          type={type}
          defaultValue={String(client[field])}
          className="bg-input border border-border rounded px-2 py-1 text-sm text-foreground w-full outline-none focus:ring-1 focus:ring-ring"
          onBlur={(e) => handleInlineEdit(client, field, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleInlineEdit(client, field, (e.target as HTMLInputElement).value);
            if (e.key === "Escape") setEditingCell(null);
          }}
        />
      );
    }
    return (
      <span
        className="cursor-pointer hover:bg-accent rounded px-1 py-0.5 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setEditingCell({ id: client.id, field });
        }}
      >
        {display}
      </span>
    );
  };

  const SortHeader = ({ label, sortField, className }: { label: string; sortField: SortKey; className?: string }) => (
    <th
      className={cn("px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap", className)}
      onClick={() => toggleSort(sortField)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </span>
    </th>
  );

  const StaticHeader = ({ label, className }: { label: string; className?: string }) => (
    <th className={cn("px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap", className)}>
      {label}
    </th>
  );

  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      )}
      {/* Filters */}
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_160px_140px_140px_auto] xl:grid-cols-[minmax(320px,1fr)_160px_140px_140px_auto]">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou Instagram..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={filterManager} onValueChange={setFilterManager}>
          <SelectTrigger className="w-full bg-card border-border">
            <SelectValue placeholder="Gestor" />
          </SelectTrigger>
          <SelectContent>
            {managerOptions.length > 1 && <SelectItem value="all">Todos gestores</SelectItem>}
            {managerOptions.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!onlyStatus && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Pausado">Pausado</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={filterAlert} onValueChange={setFilterAlert}>
          <SelectTrigger className="w-full bg-card border-border">
            <SelectValue placeholder="Alertas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="late">Atrasados</SelectItem>
          </SelectContent>
        </Select>
        {!summaryOnly && !hideInternalFinancial && <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="w-full bg-card border-border">
            <SelectValue placeholder="Pgto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos dias</SelectItem>
            <SelectItem value="15">Dia 15</SelectItem>
            <SelectItem value="30">Dia 30</SelectItem>
          </SelectContent>
        </Select>
        }
        {(!summaryOnly || allowAddClient) && <Button onClick={onAddClient} className="gap-2 whitespace-nowrap">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card/30">
        <div className="overflow-x-auto overscroll-contain rounded-lg">
        <table className={cn(summaryOnly ? (canViewMetaBalance ? "min-w-[1465px]" : "min-w-[1335px]") : hideInternalFinancial ? "min-w-[1450px]" : hideContractValues ? "min-w-[1680px]" : hideContractAmounts ? "min-w-[1820px]" : "min-w-[2030px]", "w-full table-fixed text-xs")}>
          <thead className="sticky top-0 z-20 bg-secondary shadow-sm shadow-background/40">
            <tr>
              <SortHeader label="Cliente" sortField="name" className="w-[185px]" />
              <StaticHeader label="Instagram" className="w-[130px]" />
              <StaticHeader label="Gestor" className="w-[70px]" />
              <StaticHeader label="Status" className="w-[70px]" />
              <StaticHeader label="Satisfação" className="w-[160px]" /><StaticHeader label="Renovar contrato" className="w-[160px]" />
              <StaticHeader label="Orcamento" className="w-[90px]" />
              {canViewMetaBalance && <StaticHeader label="Saldo Meta" className="w-[130px]" />}
              <StaticHeader label="Controle de saldo" className="w-[150px]" />
              <StaticHeader label="Otimizacao" className="w-[150px]" />
              <StaticHeader label="Dia relatorio" className="w-[105px]" />
              {!summaryOnly && <><SortHeader label="Retencao" sortField="retention" className="w-[85px]" />
              {!hideInternalFinancial && <><StaticHeader label="Cobranca" className="w-[95px]" />
              {!hideContractValues && <StaticHeader label="Tipo" className="w-[75px]" />}
              {!hideContractValues && <StaticHeader label="Meses" className="w-[60px]" />}
              {!hideContractValues && !hideContractAmounts && <StaticHeader label="Contrato" className="w-[105px]" />}
              {!hideContractValues && !hideContractAmounts && <StaticHeader label="Mensal" className="w-[105px]" />}
              <StaticHeader label="Status pgto" className="w-[120px]" />
              <SortHeader label="Pgto" sortField="paymentDate" className="w-[75px]" />
              <StaticHeader label="Comissao" className="w-[90px]" />
              <StaticHeader label="" className="w-[40px]" /></>}</>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((client) => (
              <tr
                key={client.id}
                className={cn(
                  "hover:bg-accent/50 transition-colors cursor-pointer",
                  filtered.indexOf(client) % 2 === 1 && "bg-muted/50"
                )}
                onClick={() => { if (!summaryOnly) onClientClick(client.id); }}
              >
                <td className="px-2 py-2 font-medium whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="max-w-[140px] truncate" title={client.name}>
                    <div>{renderEditable(client, "name", client.name)}</div>
                    <Select value={client.level || "nao_definido"} onValueChange={value => onUpdateClient({ ...client, level: value as Client["level"] })}>
                      <SelectTrigger aria-label={`Nível de ${client.name}`} className="mt-1 h-7 w-[128px] border-0 bg-transparent px-1 text-[13px] font-semibold"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="nao_definido">Nível não definido</SelectItem>{[1, 2, 3, 4, 5].map(level => <SelectItem key={level} value={String(level)}><span className="text-yellow-400">{"★".repeat(level)}</span><span className="text-slate-500">{"★".repeat(5 - level)}</span><span className="ml-1 text-xs text-muted-foreground">{level}/5</span></SelectItem>)}</SelectContent>
                    </Select>
                    {!summaryOnly && <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 h-7 px-2 text-xs text-primary border-primary/40"
                      aria-label={`Abrir perfil de ${client.name}`}
                      onClick={(event) => { event.stopPropagation(); onClientClick(client.id); }}
                    >Abrir perfil</Button>}
                  </div>
                </td>
                <td className="px-2 py-2 max-w-[140px]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {client.instagram && (
                      <a
                        href={`https://instagram.com/${client.instagram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline shrink-0"
                        title={`Abrir ${client.instagram}`}
                      >
                        @
                      </a>
                    )}
                    <EditableCell
                      value={client.instagram}
                      placeholder="instagram"
                      onSave={(v) => onUpdateClient({ ...client, instagram: v.replace(/^@/, "") })}
                      displayClassName="truncate max-w-[100px]"
                    />
                  </div>
                </td>
                <td className="px-2 py-2">
                  {renderEditable(client, "manager", client.manager)}
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    aria-label={`Alterar status de ${client.name}`}
                    className={`inline-flex border px-2 py-0.5 rounded-full text-xs font-semibold ${
                      client.status === "Ativo"
                        ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-300"
                        : "border-slate-500/40 bg-slate-500/15 text-slate-300"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateClient({
                        ...client,
                        status: client.status === "Ativo" ? "Pausado" : "Ativo",
                      }, { changeStatus: true });
                    }}
                  >
                    {client.status}
                  </button>
                </td>
                <><td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                    <Select disabled={summaryOnly} value={client.satisfaction || "nao_avaliado"} onValueChange={value => onUpdateClient({ ...client, satisfaction: value as Client["satisfaction"] })}>
                      <SelectTrigger aria-label={`Satisfação de ${client.name}`} className="h-7 w-[148px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{[["nao_avaliado", "Não avaliado"], ["muito_satisfeito", "Muito satisfeito"], ["satisfeito", "Satisfeito"], ["neutro", "Neutro"], ["insatisfeito", "Insatisfeito"], ["muito_insatisfeito", "Muito insatisfeito"]].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                    <Select disabled={summaryOnly} value={client.contractRenewal || "nao_definido"} onValueChange={value => onUpdateClient({ ...client, contractRenewal: value as Client["contractRenewal"] })}>
                      <SelectTrigger aria-label={`Renovação de ${client.name}`} className="h-7 w-[148px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{[["nao_definido", "Não definido"], ["sim", "Vai renovar"], ["nao", "Não vai renovar"], ["em_negociacao", "Em negociação"]].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                </>
                <td className={cn("px-2 py-2", moneyTone(client.monthlyBudget))}>{renderEditable(client, "monthlyBudget", formatCurrency(client.monthlyBudget), "number")}</td>
                {canViewMetaBalance && <td className="px-2 py-2 whitespace-nowrap" title={metaBalances.data?.checkedAt ? `Consultado em ${new Date(metaBalances.data.checkedAt).toLocaleString("pt-BR")}` : "Fundos disponíveis da conta vinculada na Meta"}>
                  {(() => {
                    const balance = metaBalances.data?.balances[client.id];
                    if (metaBalances.isPending) return <span className="text-muted-foreground text-xs">Carregando…</span>;
                    if (metaBalances.isError) return <span className="text-muted-foreground text-xs">Indisponível</span>;
                    if (!balance) return <span className="text-muted-foreground text-xs">Sem conta vinculada</span>;
                    if (balance.status === "permission_denied") return <span title="A Meta negou a consulta dos dados financeiros desta conta. O acesso aos relatórios de anúncios não garante acesso ao saldo." className="text-amber-400 text-xs">Sem acesso financeiro</span>;
                    if (balance.status === "credit_card") return <span title="A Meta identifica esta conta como não pré-paga, com pagamento por cartão, e não forneceu um saldo pré-pago disponível nesta consulta." className="text-muted-foreground text-xs">Pagamento no cartão</span>;
                    if (balance.available == null) return <span className="text-muted-foreground text-xs">Indisponível na Meta</span>;
                    return <span className={cn("font-semibold", balance.available < 50 ? "text-red-400" : "text-emerald-400")}>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: balance.currency }).format(balance.available)}</span>;
                  })()}
                  {(() => {
                    const accountId = metaBalances.data?.balances[client.id]?.accountId?.replace(/^act_/, "");
                    if (!accountId || !/^\d+$/.test(accountId)) return null;
                    return <a
                      href={`https://business.facebook.com/billing_hub/payment_settings?asset_id=${accountId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Adicionar saldo na Meta — ${client.name}`}
                      title="Abrir cobrança da conta vinculada na Meta para adicionar saldo"
                      className="mt-1 block w-fit rounded-md border border-primary/40 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={(event) => event.stopPropagation()}
                    >Adicionar saldo</a>;
                  })()}
                </td>}
                {(["lastBalanceDate", "lastReportDate"] as const).map((field) => {
                  const dateStr = client[field];
                  const parsedDate = dateStr ? new Date(dateStr + "T00:00:00") : undefined;
                  const status = getAlertStatus(dateStr);
                  const label = getAlertLabel(dateStr);
                  const dateFormatted = parsedDate ? format(parsedDate, "dd/MM/yyyy") : "-";
                  return (
                    <td key={field} className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className={cn("inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 transition-colors whitespace-nowrap hover:brightness-110", alertBadgeClasses[status])}>
                            <span className="text-xs whitespace-nowrap">{dateFormatted}</span>
                            <span className="text-xs font-semibold whitespace-nowrap">{label}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                          <Calendar mode="single" selected={parsedDate} onSelect={(date) => { if (date) onUpdateClient({ ...client, [field]: format(date, "yyyy-MM-dd") }); }} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                    </td>
                  );
                })}
                <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                  <Select value={client.reportDay} onValueChange={(v) => onUpdateClient({ ...client, reportDay: v })}>
                    <SelectTrigger className="h-6 w-[95px] text-xs bg-card border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>{WEEKDAYS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                  </Select>
                </td>
                {!summaryOnly && <><td className="px-2 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 hover:bg-accent rounded px-1 py-0.5 transition-colors">
                        <span className="text-primary font-medium">{getRetentionMonths(client.startDate)}m</span>
                        <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                      <Calendar mode="single" selected={client.startDate ? new Date(client.startDate + "T00:00:00") : undefined} onSelect={(date) => { if (date) onUpdateClient({ ...client, startDate: format(date, "yyyy-MM-dd") }); }} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </td>
                {!hideInternalFinancial && <>{(() => {
                  const dateStr = client.nextChargeDate || "";
                  const parsedDate = dateStr ? new Date(dateStr + "T00:00:00") : undefined;
                  const dateFormatted = parsedDate ? format(parsedDate, "dd/MM/yyyy") : "-";
                  return (
                    <td className="px-2 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-1 hover:bg-accent rounded px-1 py-0.5 transition-colors">
                            <span className="text-xs text-muted-foreground">{dateFormatted}</span>
                            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                          <Calendar mode="single" selected={parsedDate} onSelect={(date) => { if (date) onUpdateClient({ ...client, nextChargeDate: format(date, "yyyy-MM-dd") }); }} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                    </td>
                  );
                })()}
                {!hideContractValues && <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                  <Select value={client.contractType} onValueChange={(v: "MRR" | "TCV") => onUpdateClient({ ...client, contractType: v })}>
                    <SelectTrigger className="h-7 w-[66px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="MRR">MRR</SelectItem><SelectItem value="TCV">TCV</SelectItem></SelectContent>
                  </Select>
                </td>}
                {!hideContractValues && <td className="px-2 py-2">{renderEditable(client, "contractMonths", String(client.contractMonths), "number")}</td>}
                {!hideContractValues && !hideContractAmounts && <td className={cn("px-2 py-2", moneyTone(client.contractValue))}>{renderEditable(client, "contractValue", formatCurrency(client.contractValue), "number")}</td>}
                {!hideContractValues && !hideContractAmounts && <td className={cn("px-2 py-2", moneyTone(getMonthlyContractValue(client)))} title={`Total do período: ${formatCurrency(getTotalContractValue(client))}`}>{formatCurrency(getMonthlyContractValue(client))}</td>}
                <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                  <Select value={client.paymentStatus} onValueChange={(v) => onUpdateClient({ ...client, paymentStatus: v as PaymentStatus })}>
                    <SelectTrigger className={cn("h-6 w-[112px] text-xs border-border rounded-full", paymentStatusColors[client.paymentStatus])}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    Dia {client.paymentDate}
                  </span>
                </td>
                <td className={cn("px-2 py-2", moneyTone(client.commissionValue))}>{formatCurrency(client.commissionValue)}</td>
                <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                  {userEmail !== "emanoelbull@gmail.com" && <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir <strong>{client.name}</strong>? Esta acao nao pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteClient(client.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>}
                </td></>}</>}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={(summaryOnly ? 10 : hideInternalFinancial ? 11 : hideContractValues ? 16 : hideContractAmounts ? 18 : 20) + (canViewMetaBalance ? 1 : 0)} className="px-2 py-6 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && !summaryOnly && !hideInternalFinancial && !hideContractValues && (
            <tfoot className="bg-secondary border-t border-border">
              <tr>
                <td colSpan={6} className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">
                  Totais
                </td>
                <td className="px-2 py-2 font-semibold text-primary">
                  {formatCurrency(filtered.filter(c => c.status === "Ativo").reduce((sum, c) => sum + (Number(c.monthlyBudget) || 0), 0))}
                </td>
                <td colSpan={3 + (canViewMetaBalance ? 1 : 0)}></td>
                <td className="px-2 py-2 font-semibold text-primary whitespace-nowrap">
                  {(() => {
                    const ativos = filtered.filter(c => c.status === "Ativo" && c.startDate);
                    if (ativos.length === 0) return "-";
                    const avg = ativos.reduce((sum, c) => sum + getRetentionMonths(c.startDate), 0) / ativos.length;
                    return `${avg.toFixed(1)}m`;
                  })()}
                </td>
                <td className="px-2 py-2"></td>
                <td colSpan={3}></td>
                <td className="px-2 py-2 font-semibold text-primary">
                  {(() => {
                    const ativosNaoPermuta = filtered.filter(c => c.status === "Ativo" && c.paymentStatus !== "permuta");
                    const total = ativosNaoPermuta.reduce((sum, c) => sum + getMonthlyContractValue(c), 0);
                    const media = ativosNaoPermuta.length > 0 ? total / ativosNaoPermuta.length : 0;
                    return (
                      <div className="flex flex-col">
                        <span>{formatCurrency(total)}</span>
                        <span className="text-xs text-muted-foreground font-normal">media: {formatCurrency(media)}</span>
                      </div>
                    );
                  })()}
                </td>
                <td colSpan={2}></td>
                <td className="px-2 py-2 font-semibold text-primary">
                  {formatCurrency(filtered.filter(c => c.status === "Ativo").reduce((sum, c) => sum + (Number(c.commissionValue) || 0), 0))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} de {clients.length} clientes
      </div>
    </div>
  );
}
