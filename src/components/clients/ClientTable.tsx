import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Client, PaymentStatus, AlertStatus, getAlertStatus, getAlertLabel, getRetentionMonths, formatCurrency, MANAGERS, WEEKDAYS } from "@/types/clients/client";
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

interface ClientTableProps {
  clients: Client[];
  onClientClick: (id: string) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onAddClient: () => void;
  onlyStatus?: "Ativo" | "Pausado";
  title?: string;
}

type SortKey = "name" | "retention" | "paymentDate" | "lastAccountUpdate" | "lastBalanceDate";

export function ClientTable({ clients, onClientClick, onUpdateClient, onDeleteClient, onAddClient, onlyStatus, title }: ClientTableProps) {
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
      return sortAsc ? cmp : -cmp;
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
    const numericFields: (keyof Client)[] = ["monthlyBudget", "commissionValue", "paymentDate", "contractValue"];
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
      className={cn("px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap", className)}
      onClick={() => toggleSort(sortField)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </span>
    </th>
  );

  const StaticHeader = ({ label, className }: { label: string; className?: string }) => (
    <th className={cn("px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap", className)}>
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
            <SelectItem value="all">Todos gestores</SelectItem>
            {MANAGERS.map((m) => (
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
        <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="w-full bg-card border-border">
            <SelectValue placeholder="Pgto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos dias</SelectItem>
            <SelectItem value="15">Dia 15</SelectItem>
            <SelectItem value="30">Dia 30</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onAddClient} className="gap-2 whitespace-nowrap">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card/30 overflow-hidden">
        <div className="max-h-[70vh] overflow-auto overscroll-contain">
        <table className="min-w-[1760px] w-full table-fixed text-xs">
          <thead className="sticky top-0 z-20 bg-secondary shadow-sm shadow-background/40">
            <tr>
              <SortHeader label="Cliente" sortField="name" className="sticky left-0 z-30 w-[190px] bg-secondary border-r border-border" />
              <StaticHeader label="Instagram" className="w-[150px]" />
              <StaticHeader label="Gestor" className="w-[95px]" />
              <StaticHeader label="Status" className="w-[80px]" />
              <StaticHeader label="Orçamento" className="w-[110px]" />
              <StaticHeader label="Saldo" className="w-[145px]" />
              <StaticHeader label="Otimização" className="w-[145px]" />
              <StaticHeader label="Dia relatório" className="w-[125px]" />
              <SortHeader label="Atualização" sortField="lastAccountUpdate" className="w-[145px]" />
              <SortHeader label="Retenção" sortField="retention" className="w-[90px]" />
              <StaticHeader label="Cobrança" className="w-[120px]" />
              <StaticHeader label="Contrato" className="w-[115px]" />
              <StaticHeader label="Status pgto" className="w-[125px]" />
              <SortHeader label="Pgto" sortField="paymentDate" className="w-[85px]" />
              <StaticHeader label="Comissão" className="w-[105px]" />
              <StaticHeader label="" className="w-[52px]" />
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
                onClick={() => onClientClick(client.id)}
              >
                <td className="sticky left-0 z-10 border-r border-border bg-card/95 px-3 py-2 font-medium whitespace-nowrap">
                  <div className="max-w-[165px] truncate" title={client.name}>
                    {renderEditable(client, "name", client.name)}
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
                      displayClassName="truncate max-w-[110px]"
                    />
                  </div>
                </td>
                <td className="px-2 py-2">
                  {renderEditable(client, "manager", client.manager)}
                </td>
                <td className="px-2 py-2">
                  <span
                    className={`inline-flex border px-2 py-1 rounded-full text-xs font-semibold ${
                      client.status === "Ativo"
                        ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-300"
                        : "border-slate-500/40 bg-slate-500/15 text-slate-300"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateClient({
                        ...client,
                        status: client.status === "Ativo" ? "Pausado" : "Ativo",
                      });
                    }}
                  >
                    {client.status}
                  </span>
                </td>
                <td className={cn("px-2 py-2", moneyTone(client.monthlyBudget))}>{renderEditable(client, "monthlyBudget", formatCurrency(client.monthlyBudget), "number")}</td>
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
                          <button className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 transition-colors whitespace-nowrap hover:brightness-110", alertBadgeClasses[status])}>
                            <span className="text-xs whitespace-nowrap">{dateFormatted}</span>
                            <span className="text-xs font-semibold whitespace-nowrap">{label}</span>
                            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
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
                    <SelectTrigger className="h-6 w-[110px] text-xs bg-card border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>{WEEKDAYS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                  </Select>
                </td>
                {(() => {
                  const dateStr = client.lastAccountUpdate;
                  const parsedDate = dateStr ? new Date(dateStr + "T00:00:00") : undefined;
                  const status = getAlertStatus(dateStr);
                  const label = getAlertLabel(dateStr);
                  const dateFormatted = parsedDate ? format(parsedDate, "dd/MM/yyyy") : "-";
                  return (
                    <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 transition-colors whitespace-nowrap hover:brightness-110", alertBadgeClasses[status])}>
                            <span className="text-xs whitespace-nowrap">{dateFormatted}</span>
                            <span className="text-xs font-semibold whitespace-nowrap">{label}</span>
                            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                          <Calendar mode="single" selected={parsedDate} onSelect={(date) => { if (date) onUpdateClient({ ...client, lastAccountUpdate: format(date, "yyyy-MM-dd") }); }} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                    </td>
                  );
                })()}
                <td className="px-2 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
                {(() => {
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
                <td className={cn("px-2 py-2", moneyTone(client.contractValue))}>{renderEditable(client, "contractValue", formatCurrency(client.contractValue), "number")}</td>
                <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                  <Select value={client.paymentStatus} onValueChange={(v) => onUpdateClient({ ...client, paymentStatus: v as PaymentStatus })}>
                    <SelectTrigger className={cn("h-6 w-[100px] text-xs border-border rounded-full", paymentStatusColors[client.paymentStatus])}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    Dia {client.paymentDate}
                  </span>
                </td>
                <td className={cn("px-2 py-2", moneyTone(client.commissionValue))}>{formatCurrency(client.commissionValue)}</td>
                <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                  <AlertDialog>
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
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={16} className="px-2 py-6 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-secondary border-t border-border">
              <tr>
                <td colSpan={4} className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">
                  Totais
                </td>
                <td className="px-2 py-2 font-semibold text-primary">
                  {formatCurrency(filtered.filter(c => c.status === "Ativo").reduce((sum, c) => sum + (Number(c.monthlyBudget) || 0), 0))}
                </td>
                <td colSpan={4}></td>
                <td className="px-2 py-2 font-semibold text-primary whitespace-nowrap">
                  {(() => {
                    const ativos = filtered.filter(c => c.status === "Ativo" && c.startDate);
                    if (ativos.length === 0) return "-";
                    const avg = ativos.reduce((sum, c) => sum + getRetentionMonths(c.startDate), 0) / ativos.length;
                    return `${avg.toFixed(1)}m`;
                  })()}
                </td>
                <td className="px-2 py-2"></td>
                <td className="px-2 py-2 font-semibold text-primary">
                  {(() => {
                    const ativosNaoPermuta = filtered.filter(c => c.status === "Ativo" && c.paymentStatus !== "permuta");
                    const total = ativosNaoPermuta.reduce((sum, c) => sum + (Number(c.contractValue) || 0), 0);
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
