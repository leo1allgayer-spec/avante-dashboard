import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Venda } from "@/hooks/useVendas";
import { toast } from "sonner";
import SaleMethodSelect from "./SaleMethodSelect";

export default function SaleGroupMethod({ sales }: { sales: Venda[] }) {
  const qc = useQueryClient();
  const values = new Set(sales.map((sale) => sale.forma_venda || "nao_informado"));
  const mutation = useMutation({
    mutationFn: async (value: string) => {
      const updates = { forma_venda: value };
      const { data, error } = await supabase.from("vendas").update(updates as never).in("id", sales.map((sale) => sale.id)).select("id");
      if (error) throw error;
      if (data.length !== sales.length) throw new Error("Alguns itens não puderam ser atualizados. Confira suas permissões.");
    },
    onSuccess: () => toast.success("Forma de venda atualizada"),
    onError: (error) => toast.error("Erro ao salvar forma de venda", { description: error.message }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["vendas"] }),
  });
  return <div className="space-y-1"><SaleMethodSelect value={values.size === 1 ? [...values][0] : null} onChange={(value) => mutation.mutate(value)} disabled={mutation.isPending} />{values.size > 1 && <p className="text-[10px] text-muted-foreground">Formas diferentes; selecionar altera todos os itens.</p>}</div>;
}
