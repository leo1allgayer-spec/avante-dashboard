import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import { useVendas } from "@/hooks/useVendas";
import { useCursosDados } from "@/hooks/useCursosDados";
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
  { label: "Leonardo Webster", match: ["webster", "leonardo webster"] },
  { label: "Leonardo Allgayer", match: ["leo", "léo"] },
  { label: "Ana", match: [] },
];

const PESSOAS_COM_TABELA_CURSOS = ["Lucas Pilger", "Nicolas Patizlaff", "Leonardo Allgayer", "Leonardo Webster"];
const PESSOAS_COM_TABELA_CURSOS_DADOS = ["Leonardo Allgayer", "Lucas Pilger", "Nicolas Patizlaff"];
const PERCENTUAL_COMISSAO_CURSOS_VENDIDOS = 0.15;
const DIVISOR_COMISSAO_CURSOS_VENDIDOS = 4;
const PESSOAS_COM_COMISSAO_CLIENTES = ["Leonardo Allgayer", "Nicolas Patizlaff", "Lucas Pilger"];
const DIVISOR_COMISSAO_CLIENTES = 3;
const DIVISOR_COMISSAO_CURSOS_DADOS: Record<string, number> = {
  "Leonardo Allgayer": 3,
  "Lucas Pilger": 3,
  "Nicolas Patizlaff": 3,
};

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

const VALOR_CURSO_META_ADS_DADO = 100;

const filterByDateRange = (dataStr: string, dateFrom?: Date, dateTo?: Date) => {
  if (dateFrom && dataStr < format(dateFrom, "yyyy-MM-dd")) return false;
  if (dateTo && dataStr > format(dateTo, "yyyy-MM-dd")) return false;
  return true;
};

const PagamentosPage = () => {
  const { data: vendas = [], isLoading } = useVendas();
  const { data: cursosDados = [] } = useCursosDados();
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

  const showCursosTable = PESSOAS_COM_TABELA_CURSOS.includes(pessoaFilter);
  const showCursosDadosTable = PESSOAS_COM_TABELA_CURSOS_DADOS.includes(pessoaFilter);

  // --- Comissão de Vendas ---
  // Inclui:
  // 1) vendas cujo vendedor bate com pessoa com tabela de cursos, OU
  //    cujo cliente foi cadastrado em cursos_dados por instrutor dessas pessoas;
  // 2) cursos_dados de instrutores válidos que NÃO têm venda lançada (R$ 0).
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
    const result = new Map<string, number>();
    const groups = new Map<string, typeof vendas>();

    vendas.forEach((sale) => {
      const key = [sale.data, normalizeName(sale.cliente), normalizeName(sale.vendedor)].join("|");
      groups.set(key, [...(groups.get(key) || []), sale]);
    });

    groups.forEach((sales) => {
      const reference = sales[0];
      const totalSold = sales.reduce((sum, sale) => sum + Math.max(Number(sale.valor || 0), 0), 0);
      const totalCollected = Math.min(
        totalSold,
        fechamentos
          .filter((item) =>
            normalizeName(item.status || "") !== "cancelado" &&
            normalizeName(item.cliente) === normalizeName(reference.cliente) &&
            normalizeName(item.vendedor) === normalizeName(reference.vendedor)
          )
          .reduce((sum, item) => sum + Math.max(Number(item.valor_sinal || 0), 0), 0)
      );

      sales.forEach((sale) => {
        const share = totalSold > 0 ? Math.max(Number(sale.valor || 0), 0) / totalSold : 0;
        result.set(sale.id, Math.min(Number(sale.valor || 0), totalCollected * share));
      });
    });

    return result;
  }, [vendas, fechamentos]);

  const vendasCursos = useMemo<LinhaCurso[]>(() => {
    if (!showCursosTable) return [];
    const instrutoresValidos = ["lucas", "nicolas", "leonardo", "leo", "léo"];

    const cursosFiltrados = cursosDados.filter((c) => {
      const inst = normalizeName(c.instrutor || "");
      return instrutoresValidos.some((i) => inst.startsWith(normalizeName(i)));
    });

    // 1) Todas as vendas lançadas no período, independentemente da origem.
    const linhasVendas: LinhaCurso[] = vendas
      .filter((v) => {
        if (getMonthKey(v.data) !== mesFilter) return false;
        if (!filterByDateRange(v.data, dateFrom, dateTo)) return false;
        return true;
      })
      .map((v) => {
        const coletado = collectedBySaleId.get(v.id) || 0;
        return {
          id: v.id,
          data: v.data,
          cliente: v.cliente,
          produto: [v.produto, v.servico].filter(Boolean).join(" / ") || "—",
          valor_liquido: coletado,
          comissao: +((coletado * PERCENTUAL_COMISSAO_CURSOS_VENDIDOS) / DIVISOR_COMISSAO_CURSOS_VENDIDOS).toFixed(2),
        };
      });

    // 2) cursos_dados sem venda correspondente
    const clientesComVenda = new Set(linhasVendas.map((l) => nameKey(l.cliente)));
    const linhasSemVenda: LinhaCurso[] = cursosFiltrados
      .filter((c) => {
        if (getMonthKey(c.data) !== mesFilter) return false;
        if (!filterByDateRange(c.data, dateFrom, dateTo)) return false;
        return !clientesComVenda.has(nameKey(c.nome_aluno));
      })
      .map((c) => ({
        id: `cd-${c.id}`,
        data: c.data,
        cliente: c.nome_aluno,
        produto: `${c.tipo_curso || "Curso"} (sem venda lançada)`,
        valor_liquido: 0,
        comissao: 0,
        sem_venda: true,
      }));

    return [...linhasVendas, ...linhasSemVenda].sort((a, b) => a.data.localeCompare(b.data));
  }, [vendas, cursosDados, showCursosTable, mesFilter, dateFrom, dateTo, collectedBySaleId]);

  const totalComissaoCursos = useMemo(
    () => vendasCursos.reduce((s, v) => s + v.comissao, 0),
    [vendasCursos]
  );

  // --- Cursos Dados ---
  type LinhaCursoDado = {
    id: string;
    data: string;
    aluno: string;
    tipo: string;
    instrutor: string;
    valor: number;
    comissao: number;
  };

  const cursosDadosPessoa = useMemo<LinhaCursoDado[]>(() => {
    if (!showCursosDadosTable) return [];
    const divisor = DIVISOR_COMISSAO_CURSOS_DADOS[pessoaFilter] || 1;

    return cursosDados
      .filter((c) => {
        if (getMonthKey(c.data) !== mesFilter) return false;
        if (!filterByDateRange(c.data, dateFrom, dateTo)) return false;
        return normalizeName(c.tipo_curso || "").includes("meta ads");
      })
      .map((c) => ({
        id: c.id,
        data: c.data,
        aluno: c.nome_aluno,
        tipo: c.tipo_curso || "Curso",
        instrutor: c.instrutor,
        valor: VALOR_CURSO_META_ADS_DADO,
        comissao: +(VALOR_CURSO_META_ADS_DADO / divisor).toFixed(2),
      }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [cursosDados, showCursosDadosTable, pessoaFilter, mesFilter, dateFrom, dateTo]);

  const totalComissaoCursosDados = useMemo(
    () => cursosDadosPessoa.reduce((s, c) => s + c.comissao, 0),
    [cursosDadosPessoa]
  );

  // --- Available months ---
  const availableMonths = useMemo(() => {
    const months = new Set(vendas.map((v) => getMonthKey(v.data)));
    return [...months].sort((a, b) => b.localeCompare(a));
  }, [vendas]);

  // --- Pagamentos Variáveis total ---
  const totalPagVariaveis = useMemo(() => {
    let items = pagVariaveis.filter((p) => p.pessoa === pessoaFilter && p.mes_ano === mesFilter);
    if (filterDiaPagamento !== "todos") {
      items = items.filter((p) => p.dia_pagamento === Number(filterDiaPagamento));
    }
    return items.reduce((s, p) => s + p.valor, 0);
  }, [pagVariaveis, pessoaFilter, mesFilter, filterDiaPagamento]);

  const clientCommissions = useMemo(() => clients
    .filter((client) => client.status === "Ativo" && Number(client.commissionValue || 0) > 0)
    .filter((client) => filterDiaPagamento === "todos" || Number(client.paymentDate) === Number(filterDiaPagamento))
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
  const totalComissao = totalComissaoCursos + totalComissaoCursosDados + totalPagVariaveis + totalClientCommission;

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
                    <SelectItem value="15">Dia 15</SelectItem>
                    <SelectItem value="30">Dia 30</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-5 w-px bg-border/50 mx-1" />

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={pagoDia15} onCheckedChange={(v) => setPagoDia15(!!v)} />
                Pago Dia 15
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={pagoDia30} onCheckedChange={(v) => setPagoDia30(!!v)} />
                Pago Dia 30
              </label>
            </div>
          </div>

          <Card className="bg-card/80 backdrop-blur border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Comissão</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-400">{formatBRL(totalComissao)}</p>
            </CardContent>
          </Card>

          {/* Comissão de Vendas */}
          {showCursosTable && (
            <Card className="bg-card/80 backdrop-blur border-border/40">
              <CardHeader>
                <CardTitle className="text-base">Comissão de Vendas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : vendasCursos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Nenhum curso vendido neste mês.</div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-muted/30 border-b border-border/30 flex items-center justify-end gap-4 text-xs">
                      <span>Comissão: <span className="text-emerald-400 font-semibold">{formatBRL(totalComissaoCursos)}</span></span>
                      <span>Divisão: <span className="font-semibold">15% / {DIVISOR_COMISSAO_CURSOS_VENDIDOS}</span></span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Produto / Serviço</TableHead>
                          <TableHead className="text-right">Valor Líquido</TableHead>
                          <TableHead className="text-right">Comissão (15% / {DIVISOR_COMISSAO_CURSOS_VENDIDOS})</TableHead>
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

          {/* Cursos Dados */}
          {showCursosDadosTable && (
            <Card className="bg-card/80 backdrop-blur border-border/40">
              <CardHeader>
                <CardTitle className="text-base">Cursos Dados</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : cursosDadosPessoa.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Nenhum curso dado neste mês.</div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-muted/30 border-b border-border/30 flex items-center justify-end gap-4 text-xs">
                      <span>Comissão: <span className="text-emerald-400 font-semibold">{formatBRL(totalComissaoCursosDados)}</span></span>
                      <span>Divisão: <span className="font-semibold">valor / {DIVISOR_COMISSAO_CURSOS_DADOS[pessoaFilter]}</span></span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Aluno</TableHead>
                          <TableHead>Tipo de Curso</TableHead>
                          <TableHead>Instrutor</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cursosDadosPessoa.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-sm">{formatDate(c.data)}</TableCell>
                            <TableCell className="text-sm font-medium">{c.aluno}</TableCell>
                            <TableCell className="text-sm">{c.tipo}</TableCell>
                            <TableCell className="text-sm">{c.instrutor}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{formatBRL(c.valor)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold text-emerald-400">{formatBRL(c.comissao)}</TableCell>
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
                      <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Gestor</TableHead><TableHead>Dia do pagamento</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Comissão cadastrada</TableHead><TableHead className="text-right">Comissão individual (÷ 3)</TableHead></TableRow></TableHeader>
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
