import { useState, useMemo } from "react";
import {
  usePagamentosVariaveis,
  useDeletePagamentoVariavel,
  useDeletePagamentoVariavelRecorrente,
} from "@/hooks/usePagamentosVariaveis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  pessoa: string;
  mesFilter: string;
  filterDiaPagamento: string;
}

const PagamentosVariaveis = ({ pessoa, mesFilter, filterDiaPagamento }: Props) => {
  const { data: todos = [], isLoading } = usePagamentosVariaveis();
  const deleteMut = useDeletePagamentoVariavel();
  const deleteRecMut = useDeletePagamentoVariavelRecorrente();

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
    if (filterDiaPagamento === "ate-15") {
      items = items.filter((p) => Number(p.dia_pagamento) <= 15);
    } else if (filterDiaPagamento === "apos-15") {
      items = items.filter((p) => Number(p.dia_pagamento) > 15);
    }
    return items;
  }, [todos, pessoa, mesFilter, filterDiaPagamento]);

  const total = useMemo(() => filtered.reduce((s, p) => s + p.valor, 0), [filtered]);


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
