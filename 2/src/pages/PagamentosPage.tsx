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
import { usePagamentosVariaveis } from "@/hooks/usePagamentosVariaveis";
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
  { label: "Andrei Hoppe", match: ["andrei"] },
  { label: "Leonardo Allgayer", match: ["leo", "léo"] },
];

const PESSOAS_COM_TABELA_CURSOS = ["Lucas Pilger", "Nicolas Patizlaff", "Leonardo Allgayer"];
const PESSOAS_COM_TABELA_META = ["Lucas Pilger", "Nicolas Patizlaff"];

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

const COMISSAO_META_ADS = 50;

const filterByDateRange = (dataStr: string, dateFrom?: Date, dateTo?: Date) => {
  if (dateFrom && dataStr < format(dateFrom, "yyyy-MM-dd")) return false;
  if (dateTo && dataStr > format(dateTo, "yyyy-MM-dd")) return false;
  return true;
};

const PagamentosPage = () => {
  const { data: vendas = [], isLoading } = useVendas();
  const { data: cursosDados = [] } = useCursosDados();
  const { data: pagVariaveis = [] } = usePagamentosVariaveis();
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
  const showMetaTable = PESSOAS_COM_TABELA_META.includes(pessoaFilter);

  // --- Cursos Vendidos ---
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

  const vendasCursos = useMemo<LinhaCurso[]>(() => {
    if (!showCursosTable) return [];
    const instrutoresValidos = ["lucas", "nicolas", "leonardo", "leo", "léo"];

    const cursosFiltrados = cursosDados.filter((c) => {
      const inst = normalizeName(c.instrutor || "");
      return instrutoresValidos.some((i) => inst.startsWith(normalizeName(i)));
    });

    // 1) TODAS as vendas (qualquer vendedor/produto/serviço), exceto Indicação Direta
    const linhasVendas: LinhaCurso[] = vendas
      .filter((v) => {
        if (getMonthKey(v.data) !== mesFilter) return false;
        if (!filterByDateRange(v.data, dateFrom, dateTo)) return false;
        if (normalizeName(v.origem || "") === "indicacao direta") return false;
        return true;
      })
      .map((v) => {
        const liquido = v.valor_com_juros ?? v.valor;
        return {
          id: v.id,
          data: v.data,
          cliente: v.cliente,
          produto: [v.produto, v.servico].filter(Boolean).join(" / ") || "—",
          valor_liquido: liquido,
          comissao: +(liquido * 0.05).toFixed(2),
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
  }, [vendas, cursosDados, showCursosTable, mesFilter, dateFrom, dateTo]);

  const totalComissaoCursos = useMemo(
    () => vendasCursos.reduce((s, v) => s + v.comissao, 0),
    [vendasCursos]
  );


  // --- Meta Ads ---
  const vendasMeta = useMemo(() => {
    if (!showMetaTable) return [];
    return vendas.filter(
      (v) =>
        v.produto.toLowerCase().includes("meta ads") &&
        getMonthKey(v.data) === mesFilter &&
        filterByDateRange(v.data, dateFrom, dateTo)
    );
  }, [vendas, showMetaTable, mesFilter, dateFrom, dateTo]);

  const totalComissaoMeta = useMemo(
    () => vendasMeta.length * COMISSAO_META_ADS,
    [vendasMeta]
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

  const totalComissao = totalComissaoCursos + totalComissaoMeta + totalPagVariaveis;

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

          {/* Cursos Vendidos */}
          {showCursosTable && (
            <Card className="bg-card/80 backdrop-blur border-border/40">
              <CardHeader>
                <CardTitle className="text-base">Cursos Vendidos</CardTitle>
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
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Produto / Serviço</TableHead>
                          <TableHead className="text-right">Valor Líquido</TableHead>
                          <TableHead className="text-right">Comissão (5%)</TableHead>
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

          {/* Meta Ads */}
          {showMetaTable && (
            <Card className="bg-card/80 backdrop-blur border-border/40">
              <CardHeader>
                <CardTitle className="text-base">Cursos Dados</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : vendasMeta.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma venda neste mês.</div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-muted/30 border-b border-border/30 flex items-center justify-end gap-4 text-xs">
                      <span>Comissão: <span className="text-emerald-400 font-semibold">{formatBRL(totalComissaoMeta)}</span></span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendasMeta.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="text-sm">{formatDate(v.data)}</TableCell>
                            <TableCell className="text-sm font-medium">{v.cliente}</TableCell>
                            <TableCell className="text-sm">{v.produto}</TableCell>
                            <TableCell className="text-right text-sm font-semibold text-emerald-400">
                              {formatBRL(COMISSAO_META_ADS)}
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
