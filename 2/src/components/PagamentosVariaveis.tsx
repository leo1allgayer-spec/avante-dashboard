import { useState, useMemo } from "react";
import {
  usePagamentosVariaveis,
  useCreatePagamentosVariaveisRecorrente,
  useDeletePagamentoVariavel,
  useDeletePagamentoVariavelRecorrente,
} from "@/hooks/usePagamentosVariaveis";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  pessoa: string;
  mesFilter: string;
  filterDiaPagamento: string;
}

const RECURRENCE_MONTHS = 24;

const addMonths = (mesAno: string, n: number) => {
  const [y, m] = mesAno.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const PagamentosVariaveis = ({ pessoa, mesFilter, filterDiaPagamento }: Props) => {
  const { session } = useAuth();
  const user = session?.user;
  const { data: todos = [], isLoading } = usePagamentosVariaveis();
  const createRecMut = useCreatePagamentosVariaveisRecorrente();
  const deleteMut = useDeletePagamentoVariavel();
  const deleteRecMut = useDeletePagamentoVariavelRecorrente();

  const [tipo, setTipo] = useState<string>("cliente");
  const [diaPag, setDiaPag] = useState<string>("15");
  const [cliente, setCliente] = useState("");
  const [valor, setValor] = useState("");
  const [recorrente, setRecorrente] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<null | {
    id: string;
    pessoa: string;
    cliente: string;
    tipo: string;
    dia_pagamento: number;
    valor: number;
    mes_ano: string;
  }>(null);

  const filtered = useMemo(() => {
    let items = todos.filter((p) => p.pessoa === pessoa && p.mes_ano === mesFilter);
    if (filterDiaPagamento !== "todos") {
      items = items.filter((p) => p.dia_pagamento === Number(filterDiaPagamento));
    }
    return items;
  }, [todos, pessoa, mesFilter, filterDiaPagamento]);

  const total = useMemo(() => filtered.reduce((s, p) => s + p.valor, 0), [filtered]);

  const handleAdd = () => {
    if (!cliente.trim() || !valor.trim() || !user) return;
    const numVal = parseFloat(valor.replace(",", "."));
    if (isNaN(numVal) || numVal <= 0) {
      toast.error("Valor inválido");
      return;
    }
    const meses = recorrente
      ? Array.from({ length: RECURRENCE_MONTHS }, (_, i) => addMonths(mesFilter, i))
      : [mesFilter];

    createRecMut.mutate(
      {
        base: {
          user_id: user.id,
          pessoa,
          tipo,
          cliente: cliente.trim(),
          valor: numVal,
          dia_pagamento: Number(diaPag),
        },
        meses,
      },
      {
        onSuccess: () => {
          setCliente("");
          setValor("");
          toast.success(
            recorrente
              ? `Adicionado para ${RECURRENCE_MONTHS} meses`
              : "Pagamento variável adicionado"
          );
        },
        onError: () => toast.error("Erro ao adicionar"),
      }
    );
  };

  const handleConfirmDelete = (scope: "single" | "future") => {
    if (!deleteTarget) return;
    if (scope === "single") {
      deleteMut.mutate(deleteTarget.id, {
        onSuccess: () => toast.success("Removido"),
        onError: () => toast.error("Erro ao remover"),
      });
    } else {
      deleteRecMut.mutate(
        {
          pessoa: deleteTarget.pessoa,
          cliente: deleteTarget.cliente,
          tipo: deleteTarget.tipo,
          dia_pagamento: deleteTarget.dia_pagamento,
          valor: deleteTarget.valor,
          from_mes_ano: deleteTarget.mes_ano,
        },
        {
          onSuccess: () => toast.success("Removido deste mês em diante"),
          onError: () => toast.error("Erro ao remover"),
        }
      );
    }
    setDeleteTarget(null);
  };

  return (
    <Card className="bg-card/80 backdrop-blur border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Pagamentos Variáveis</CardTitle>
          <span className="text-sm text-emerald-400 font-semibold">{formatBRL(total)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-32">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <Select value={diaPag} onValueChange={setDiaPag}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Dia 15</SelectItem>
                <SelectItem value="30">Dia 30</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder={tipo === "cliente" ? "Nome do cliente" : "Nome do serviço"}
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Valor (R$)"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-32"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="icon" onClick={handleAdd} disabled={createRecMut.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox checked={recorrente} onCheckedChange={(v) => setRecorrente(!!v)} />
          Repetir nos próximos meses (gera {RECURRENCE_MONTHS} meses a partir do mês selecionado)
        </label>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">Nenhum pagamento variável.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Dia Pagamento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.tipo === "servico" ? "Serviço" : "Cliente"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{p.cliente}</TableCell>
                  <TableCell className="text-center text-sm">Dia {p.dia_pagamento}</TableCell>
                  <TableCell className="text-right text-sm font-semibold text-emerald-400">
                    {formatBRL(p.valor)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setDeleteTarget({
                          id: p.id,
                          pessoa: p.pessoa,
                          cliente: p.cliente,
                          tipo: p.tipo,
                          dia_pagamento: p.dia_pagamento,
                          valor: p.valor,
                          mes_ano: p.mes_ano,
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover apenas este mês ou também todos os meses seguintes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleConfirmDelete("single")}>
              Apenas este mês
            </Button>
            <AlertDialogAction onClick={() => handleConfirmDelete("future")}>
              Este e os próximos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PagamentosVariaveis;
