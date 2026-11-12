import {saleCourseDisplayName} from '@/constants/courseCatalog';
import {registeredPaidCommission,commissionPaymentDate,commissionPaymentShare} from "@/lib/salesCommissionPayments";
import {groupSalesCommissionBalances,salesInCommissionPeriod} from '@/lib/salesCommissionBalance';
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { useVendas } from "@/hooks/useVendas";
import { useFechamentosDiarios } from "@/hooks/useFechamentosDiarios";
import { usePagamentosVariaveis } from "@/hooks/usePagamentosVariaveis";
import { useClients } from "@/hooks/clients/useGestaoClients";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import PagamentosVariaveis from "@/components/PagamentosVariaveis";

const PESSOAS = [
  { label: "Lucas Pilger", match: ["lucas"] },
  { label: "Nicolas Patizlaff", match: ["nicolas"] },
  { label: "Emanoel Bull", match: ["emanoel"] },
  { label: "Leonardo Webster", match: ["webster", "leonardo webster"] },
  { label: "Leonardo Allgayer", match: ["leo", "léo"] },
  { label: "Ana", match: [] },
];

const PESSOAS_COM_TABELA_CURSOS = ["Lucas Pilger", "Leonardo Allgayer", "Leonardo Webster"];
const PERCENTUAL_COMISSAO_CURSOS_VENDIDOS = 0.15;
const DIVISOR_COMISSAO_CURSOS_VENDIDOS = PESSOAS_COM_TABELA_CURSOS.length;
const PESSOAS_COM_COMISSAO_CLIENTES = ["Nicolas Patizlaff", "Emanoel Bull"];
const DIVISOR_COMISSAO_CLIENTES = PESSOAS_COM_COMISSAO_CLIENTES.length;
const MESES_PT: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const getMonthKey = (d: string) => d.substring(0, 7);
const getMonthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return `${MESES_PT[m] || m} ${y}`;
};

const matchPessoa = (vendedor: string, matchTerms: string[]) => {
  const v = vendedor.trim().toLowerCase();
  return matchTerms.some((term) => v.startsWith(term));
};


const filterByDateRange = (dataStr: string, dateFrom?: Date, dateTo?: Date) => {
  if (dateFrom && dataStr < format(dateFrom, "yyyy-MM-dd")) return false;
  if (dateTo && dataStr > format(dateTo, "yyyy-MM-dd")) return false;
  return true;
};

const filterByPaymentPeriod = (day: number, period: string) => {
  if (period === "todos") return true;
  if (!Number.isFinite(day) || day < 1) return false;
  if (period === "dia-15") return day === 15;
  if (period === "dia-30") return day === 30;
  return period === "ate-15" ? day <= 15 : day > 15;
};

const getDayFromDate = (dataStr: string) => Number(dataStr.split("-")[2] || 0);

const PagamentosPage = () => {
  const { data: vendas = [], isLoading } = useVendas();
  const { data: fechamentos = [] } = useFechamentosDiarios();
  const { data: pagVariaveis = [] } = usePagamentosVariaveis();
  const { clients, loading: clientsLoading } = useClients("meta_ads");
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("pagamentos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cursos_dados" }, () => {
        queryClient.invalidateQueries({ queryKey: ["cursos_dados"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "vendas" }, () => {
        queryClient.invalidateQueries({ queryKey: ["vendas"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "fechamentos_diarios" }, () => {
        queryClient.invalidateQueries({ queryKey: ["fechamentos_diarios"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  const [pessoaFilter, setPessoaFilter] = useState(PESSOAS[0].label);
  const defaultMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [mesFilter, setMesFilter] = useState(defaultMonth);

  // Global filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [pagoDia15, setPagoDia15] = useState(false);
  const [pagoDia30, setPagoDia30] = useState(false);
  const [filterDiaPagamento, setFilterDiaPagamento] = useState("todos");

  useEffect(() => {
    const storageKey = `avante-payment-status:${pessoaFilter}:${mesFilter}`;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      setPagoDia15(saved.day15 === true);
      setPagoDia30(saved.day30 === true);
    } catch {
      setPagoDia15(false);
      setPagoDia30(false);
    }
  }, [pessoaFilter, mesFilter]);

  const updateLocalPaymentStatus = (day: 15 | 30, paid: boolean) => {
    const nextDay15 = day === 15 ? paid : pagoDia15;
    const nextDay30 = day === 30 ? paid : pagoDia30;
    setPagoDia15(nextDay15);
    setPagoDia30(nextDay30);
    localStorage.setItem(
      `avante-payment-status:${pessoaFilter}:${mesFilter}`,
      JSON.stringify({ day15: nextDay15, day30: nextDay30 }),
    );
  };
  const showCursosTable = PESSOAS_COM_TABELA_CURSOS.includes(pessoaFilter);
  const commissionBalances=useMemo(()=>groupSalesCommissionBalances(vendas,fechamentos),[vendas,fechamentos]);
  const pendingCommissions=useMemo(()=>{
    if(!showCursosTable)return [];
    const monthStart=`${mesFilter}-01`;
    const start=dateFrom&&format(dateFrom,'yyyy-MM-dd')>monthStart?format(dateFrom,'yyyy-MM-dd'):monthStart;
    const lastDay=format(new Date(Number(mesFilter.slice(0,4)),Number(mesFilter.slice(5,7)),0),'yyyy-MM-dd');
    const end=dateTo&&format(dateTo,'yyyy-MM-dd')<lastDay?format(dateTo,'yyyy-MM-dd'):lastDay;
    const recipientIndex=PESSOAS_COM_TABELA_CURSOS.indexOf(pessoaFilter);
    if(start>end)return [];
    const eligible=salesInCommissionPeriod(vendas,fechamentos,start,end,!dateFrom&&!dateTo)
      .filter(sale=>!['cancelada','cancelado'].includes((sale.status||'').toLowerCase())&&filterByPaymentPeriod(getDayFromDate(sale.data),filterDiaPagamento));
    return groupSalesCommissionBalances(eligible,fechamentos).filter(balance=>balance.pending>0)
      .map(balance=>({...balance,individual:commissionPaymentShare(balance.pending,recipientIndex,DIVISOR_COMISSAO_CURSOS_VENDIDOS)})).sort((a,b)=>a.items[0].cliente.localeCompare(b.items[0].cliente,'pt-BR'));
  },[vendas,fechamentos,showCursosTable,mesFilter,dateFrom,dateTo,filterDiaPagamento,pessoaFilter]);
  const pendingTotal=pendingCommissions.reduce((sum,balance)=>sum+balance.pending,0);
  const pendingIndividual=pendingCommissions.reduce((sum,balance)=>sum+balance.individual,0);

  // Paid sales commissions share the actual payment dates with Vendas.
  type LinhaCurso = {
    id: string;
    data: string;
    cliente: string;
    produto: string;
    valor_liquido: number;
    comissao: number;
    sem_venda?: boolean;
  };

  const normalizeName = (s: string) =>
    s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  const nameKey = (s: string) => normalizeName(s).split(" ").slice(0, 2).join(" ");

  const collectedBySaleId = useMemo(() => {
    const result = new Map<string,number>();
    commissionBalances.forEach(balance=>balance.items.forEach(sale=>{
      const share=balance.totalSold>0?Math.max(0,Number(sale.valor||0))/balance.totalSold:0;
      result.set(sale.id,balance.net*share);
    }));
    return result;
  },[commissionBalances]);
  const paidSalesInPeriod = useMemo(()=>vendas.filter(sale=>{
    const date=commissionPaymentDate(sale);
    return registeredPaidCommission(sale)>0 && !!date && getMonthKey(date)===mesFilter && filterByDateRange(date,dateFrom,dateTo) && filterByPaymentPeriod(getDayFromDate(date),filterDiaPagamento);
  }),[vendas,mesFilter,dateFrom,dateTo,filterDiaPagamento]);
  const totalPaidSalesInPeriod=paidSalesInPeriod.reduce((sum,sale)=>sum+registeredPaidCommission(sale),0);
  const undatedCommissionPayments=vendas.filter(sale=>registeredPaidCommission(sale)>0&&!commissionPaymentDate(sale));
  const vendasCursos = useMemo<LinhaCurso[]>(() => {
    if(!showCursosTable)return [];
    const recipientIndex=PESSOAS_COM_TABELA_CURSOS.indexOf(pessoaFilter);
    return paidSalesInPeriod.map(sale=>({id:sale.id,data:commissionPaymentDate(sale),cliente:sale.cliente,produto:[sale.produto,sale.servico].filter(Boolean).map(saleCourseDisplayName).join(' / ')||'—',valor_liquido:collectedBySaleId.get(sale.id)||0,comissao:commissionPaymentShare(registeredPaidCommission(sale),recipientIndex,DIVISOR_COMISSAO_CURSOS_VENDIDOS)})).sort((a,b)=>a.data.localeCompare(b.data));
  },[paidSalesInPeriod,showCursosTable,pessoaFilter,collectedBySaleId]);

  const totalComissaoCursos = useMemo(
    () => vendasCursos.reduce((s, v) => s + v.comissao, 0),
    [vendasCursos]
  );

  // --- Available months ---
  const availableMonths = useMemo(() => {
    const months = new Set([defaultMonth,...vendas.map((v) => getMonthKey(v.data)),...vendas.map(commissionPaymentDate).filter(Boolean).map(getMonthKey)]);
    return [...months].sort((a, b) => b.localeCompare(a));
  }, [vendas]);

  // --- Pagamentos Variáveis total ---
  const filteredVariablePayments = useMemo(
    () => pagVariaveis
      .filter((payment) => payment.pessoa === pessoaFilter && payment.mes_ano === mesFilter)
      .filter((payment) => filterByPaymentPeriod(Number(payment.dia_pagamento), filterDiaPagamento)),
    [pagVariaveis, pessoaFilter, mesFilter, filterDiaPagamento],
  );
  const totalPagVariaveis = useMemo(
    () => filteredVariablePayments.reduce((sum, payment) => sum + payment.valor, 0),
    [filteredVariablePayments],
  );

  const clientCommissions = useMemo(() => clients
    .filter((client) => client.status === "Ativo" && Number(client.commissionValue || 0) > 0)
    .filter((client) => filterByPaymentPeriod(Number(client.paymentDate), filterDiaPagamento))
    .map((client) => ({
      id: client.id,
      cliente: client.name,
      gestor: client.manager,
      diaPagamento: client.paymentDate,
      statusPagamento: client.paymentStatus,
      comissaoTotal: Number(client.commissionValue || 0),
      comissaoIndividual: Number((Number(client.commissionValue || 0) / DIVISOR_COMISSAO_CLIENTES).toFixed(2)),
    }))
    .sort((a, b) => a.cliente.localeCompare(b.cliente, "pt-BR")), [clients, filterDiaPagamento]);

  const showClientCommissions = PESSOAS_COM_COMISSAO_CLIENTES.includes(pessoaFilter);
  const totalClientCommission = showClientCommissions
    ? clientCommissions.reduce((sum, client) => sum + client.comissaoIndividual, 0)
    : 0;
  const totalComissao = totalComissaoCursos + totalPagVariaveis + totalClientCommission;

  const exportPayments = () => {
    type ExportRow = { categoria: string; data: string; nome: string; detalhe: string; valorBase: number; valorPagamento: number };
    const rows: ExportRow[] = [
      ...vendasCursos.map((sale) => ({ categoria: "Comissão de Vendas", data: formatDate(sale.data), nome: sale.cliente, detalhe: sale.produto, valorBase: sale.valor_liquido, valorPagamento: sale.comissao })),
      ...pendingCommissions.map(balance=>({categoria:'Comissão de Vendas a Pagar',data:formatDate(balance.items[0].data),nome:balance.items[0].cliente,detalhe:balance.items.map(sale=>saleCourseDisplayName(sale.servico||sale.produto)).join(' / '),valorBase:balance.net,valorPagamento:balance.individual})),
      ...(showClientCommissions ? clientCommissions.map((client) => ({ categoria: "Comissão dos Clientes", data: "Dia " + (client.diaPagamento || "—"), nome: client.cliente, detalhe: "Gestor: " + (client.gestor || "—") + " · Status: " + client.statusPagamento, valorBase: client.comissaoTotal, valorPagamento: client.comissaoIndividual })) : []),
      ...filteredVariablePayments.map((payment) => ({ categoria: "Pagamentos Variáveis", data: "Dia " + payment.dia_pagamento, nome: payment.cliente, detalhe: payment.tipo === "servico" ? "Serviço" : "Cliente", valorBase: payment.valor, valorPagamento: payment.valor })),
    ];
    if (rows.length === 0) return;

    const csvValue = (value: string | number) => '"' + String(value).replace(/"/g, '""') + '"';
    const moneyValue = (value: number) => Number(value || 0).toFixed(2).replace(".", ",");
    const lines: string[] = [["Categoria", "Data / Dia", "Nome", "Detalhe", "Valor base", "Valor para " + pessoaFilter].map(csvValue).join(";")];
    ["Comissão de Vendas", "Comissão de Vendas a Pagar", "Comissão dos Clientes", "Pagamentos Variáveis"].forEach((category) => {
      const categoryRows = rows.filter((row) => row.categoria === category);
      if (categoryRows.length === 0) return;
      categoryRows.forEach((row) => lines.push([row.categoria, row.data, row.nome, row.detalhe, moneyValue(row.valorBase), moneyValue(row.valorPagamento)].map(csvValue).join(";")));
      lines.push(["Subtotal", "", category, "", "", moneyValue(categoryRows.reduce((sum, row) => sum + row.valorPagamento, 0))].map(csvValue).join(";"), "");
    });
    lines.push(["TOTAL REGISTRADO (SEM PENDÊNCIAS DE VENDAS)", "", pessoaFilter, getMonthLabel(mesFilter), "", moneyValue(totalComissao)].map(csvValue).join(";"));
    if(showCursosTable)lines.push(["TOTAL DE VENDAS A PAGAR", "", pessoaFilter, getMonthLabel(mesFilter), "", moneyValue(pendingIndividual)].map(csvValue).join(";"));

    const csv = ["sep=;", ...lines].join("\r\n");
    const bytes = new Uint8Array(2 + csv.length * 2);
    bytes[0] = 0xff;
    bytes[1] = 0xfe;
    for (let index = 0; index < csv.length; index += 1) {
      const code = csv.charCodeAt(index);
      bytes[2 + index * 2] = code & 0xff;
      bytes[3 + index * 2] = code >> 8;
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: "text/csv;charset=utf-16le;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pagamentos_" + pessoaFilter.toLowerCase().replace(/\s+/g, "_") + "_" + mesFilter + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="Pagamentos">
      <PageTransition>
        <div className="space-y-6">
          {/* Header + Global Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Pagamentos</h1>
                <p className="text-muted-foreground text-sm">Comissões e valores por vendedor</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={exportPayments} disabled={totalComissao <= 0&&pendingIndividual<=0}>
                  <Download className="h-4 w-4" /> Exportar lista
                </Button>
                <div className="w-48">
                  <Select value={mesFilter} onValueChange={setMesFilter}>
                    <SelectTrigger><SelectValue placeholder="Filtrar por mês" /></SelectTrigger>
                    <SelectContent>
                      {availableMonths.map((m) => (
                        <SelectItem key={m} value={m}>{getMonthLabel(m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-56">
                  <Select value={pessoaFilter} onValueChange={setPessoaFilter}>
                    <SelectTrigger><SelectValue placeholder="Filtrar por pessoa" /></SelectTrigger>
                    <SelectContent>
                      {PESSOAS.map((p) => (
                        <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Date range + Dia pagamento filter + Pago checkboxes */}
            <div className="flex flex-wrap items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal text-xs", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} locale={ptBR} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal text-xs", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} locale={ptBR} />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                  Limpar datas
                </Button>
              )}

              <div className="h-5 w-px bg-border/50 mx-1" />

              <div className="w-36">
                <Select value={filterDiaPagamento} onValueChange={setFilterDiaPagamento}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Dia pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os dias</SelectItem>
                    <SelectItem value="dia-15">Dia 15</SelectItem>
                    <SelectItem value="dia-30">Dia 30</SelectItem>
                    <SelectItem value="ate-15">Até dia 15</SelectItem>
                    <SelectItem value="apos-15">Depois do dia 15</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-5 w-px bg-border/50 mx-1" />

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={pagoDia15} onCheckedChange={(value) => updateLocalPaymentStatus(15, value === true)} />
                Pago Dia 15
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={pagoDia30} onCheckedChange={(value) => updateLocalPaymentStatus(30, value === true)} />
                Pago Dia 30
              </label>
            </div>
          </div>

          {showCursosTable&&<div className="space-y-3">
            <h2 className="text-base font-semibold">Comissões de vendas de {pessoaFilter}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-card/80 border-emerald-500/25">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Já recebido por {pessoaFilter}</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-emerald-400">{formatBRL(totalComissaoCursos)}</p><p className="mt-2 text-xs text-muted-foreground">Comissão de vendas já paga a {pessoaFilter} no período selecionado. É a parte individual, já dividida entre os três vendedores.</p></CardContent>
              </Card>
              <Card className="bg-card/80 border-amber-500/25">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ainda a receber por {pessoaFilter}</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-amber-500">{formatBRL(pendingIndividual)}</p><p className="mt-2 text-xs text-muted-foreground">Comissão de vendas que falta pagar a {pessoaFilter}, sobre dinheiro já recebido dos clientes. É a parte individual, já dividida entre os três vendedores.</p></CardContent>
              </Card>
            </div>
          </div>}
          {(!showCursosTable||totalPagVariaveis+totalClientCommission>0)&&<Card className="bg-card/80 backdrop-blur border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{showCursosTable?'Outros valores cadastrados':'Comissões de clientes e outros valores'} — {pessoaFilter}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatBRL(totalPagVariaveis+totalClientCommission)}</p><p className="mt-2 text-xs text-muted-foreground">Comissões de clientes e pagamentos variáveis cadastrados. Este valor não indica confirmação de pagamento.</p></CardContent>
          </Card>}

          {showCursosTable&&<Card className="bg-card/80 backdrop-blur border-border/40">
            <CardHeader><CardTitle className="text-base">Comissões de vendas a pagar</CardTitle>
              <p className="text-xs text-muted-foreground">Cursos e serviços: comissão sobre o que os clientes já pagaram, menos a comissão já paga aos vendedores. Não inclui comissão futura sobre o saldo dos clientes.</p>
              <p className="text-xs text-muted-foreground">Mesmo período da lista de Vendas, incluindo recebimentos e pendências de meses anteriores. O filtro de quinzena usa a data da venda para as comissões a pagar.</p>
            </CardHeader>
            <CardContent className="p-0"><div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border/30 bg-muted/30 px-4 py-3 text-xs"><span className="text-sm">Parte de {pessoaFilter} ainda a receber: <strong className="text-amber-500">{formatBRL(pendingIndividual)}</strong></span><span className="text-muted-foreground">Total dos três vendedores a receber: <strong>{formatBRL(pendingTotal)}</strong></span><span className="text-muted-foreground">Sua parte já está incluída nesse total.</span></div>
              <Table><TableHeader><TableRow><TableHead>Data da venda</TableHead><TableHead>Cliente</TableHead><TableHead>Produto / Serviço</TableHead><TableHead className="text-right">Recebido líquido do cliente</TableHead><TableHead className="text-right">Comissão a receber — total dos três</TableHead><TableHead className="text-right">Parte de {pessoaFilter} a receber</TableHead></TableRow></TableHeader>
              <TableBody>{pendingCommissions.map(balance=><TableRow key={balance.id}><TableCell>{formatDate(balance.items[0].data)}</TableCell><TableCell className="font-medium">{balance.items[0].cliente}</TableCell><TableCell>{balance.items.map(sale=>saleCourseDisplayName(sale.servico||sale.produto)).join(' / ')}</TableCell><TableCell className="text-right">{formatBRL(balance.net)}</TableCell><TableCell className="text-right">{formatBRL(balance.pending)}</TableCell><TableCell className="text-right font-semibold text-amber-500">{formatBRL(balance.individual)}</TableCell></TableRow>)}{!pendingCommissions.length&&<TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{isLoading?'Carregando comissões…':'Nenhuma comissão a pagar nessa seleção.'}</TableCell></TableRow>}</TableBody></Table>
            </CardContent></Card>}
          {/* Comissão de Vendas */}
          {showCursosTable && (
            <Card className="bg-card/80 backdrop-blur border-border/40">
              <CardHeader>
                <CardTitle className="text-base">Comissões de vendas já pagas</CardTitle>
                <p className="text-xs text-muted-foreground">Mesma base de “Comissão paga no período” em Vendas: valores pagos pela data do pagamento, incluindo vendas antigas. Abaixo aparece somente a cota de {pessoaFilter}.</p>
                {undatedCommissionPayments.length>0&&<p className="text-xs text-amber-500">{undatedCommissionPayments.length} pagamentos antigos de comissão ({formatBRL(undatedCommissionPayments.reduce((sum,sale)=>sum+registeredPaidCommission(sale),0))}) estão sem data de pagamento e ficam fora dos totais por período. A data real desses pagamentos precisa ser conferida para conciliá-los.</p>}
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : vendasCursos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma comissão paga no período selecionado.</div>
                ) : (
                  <>
                    <div className="px-4 py-3 bg-muted/30 border-b border-border/30 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                      <span className="text-sm">Parte de {pessoaFilter} já recebida: <strong className="text-emerald-400">{formatBRL(totalComissaoCursos)}</strong></span><span className="text-muted-foreground">Total dos três vendedores já recebido: <strong>{formatBRL(totalPaidSalesInPeriod)}</strong></span>
                      <span className="text-muted-foreground">Sua parte já está incluída nesse total.</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data do pagamento</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Produto / Serviço</TableHead>
                          <TableHead className="text-right">Recebido líquido do cliente</TableHead>
                          <TableHead className="text-right">Parte de {pessoaFilter} já recebida</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendasCursos.map((v) => (
                          <TableRow key={v.id} className={v.sem_venda ? "opacity-60" : ""}>
                            <TableCell className="text-sm">{formatDate(v.data)}</TableCell>
                            <TableCell className="text-sm font-medium">{v.cliente}</TableCell>
                            <TableCell className="text-sm">{v.produto}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">
                              {formatBRL(v.valor_liquido)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-emerald-400">
                              {formatBRL(v.comissao)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comissão recorrente dos clientes ativos */}
          {showClientCommissions && (
            <Card className="bg-card/80 backdrop-blur border-border/40">
              <CardHeader>
                <CardTitle className="text-base">Comissão dos Clientes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {clientsLoading ? (
                  <div className="flex items-center justify-center py-12"><div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
                ) : clientCommissions.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente ativo com comissão cadastrada.</div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-end gap-4 border-b border-border/30 bg-muted/30 px-4 py-2 text-xs">
                      <span>Comissão individual: <span className="font-semibold text-emerald-400">{formatBRL(totalClientCommission)}</span></span>
                      <span>Divisão: <span className="font-semibold">comissão cadastrada / {DIVISOR_COMISSAO_CLIENTES}</span></span>
                    </div>
                    <Table>
                      <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Gestor</TableHead><TableHead>Dia do pagamento</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Comissão cadastrada</TableHead><TableHead className="text-right">Comissão individual (÷ 2)</TableHead></TableRow></TableHeader>
                      <TableBody>{clientCommissions.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="text-sm font-medium">{client.cliente}</TableCell>
                          <TableCell className="text-sm">{client.gestor || "—"}</TableCell>
                          <TableCell className="text-sm">Dia {client.diaPagamento || "—"}</TableCell>
                          <TableCell className="text-sm capitalize">{client.statusPagamento}</TableCell>
                          <TableCell className="text-right text-sm font-semibold">{formatBRL(client.comissaoTotal)}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-emerald-400">{formatBRL(client.comissaoIndividual)}</TableCell>
                        </TableRow>
                      ))}</TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          )}
          {/* Pagamentos Variáveis */}
          <PagamentosVariaveis
            pessoa={pessoaFilter}
            mesFilter={mesFilter}
            filterDiaPagamento={filterDiaPagamento}
          />
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default PagamentosPage;



