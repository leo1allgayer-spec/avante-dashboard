import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SaleMethodSelect({ value, onChange, disabled }: { value?: string | null; onChange: (value: string) => void; disabled?: boolean }) {
  return <Select value={value || "nao_informado"} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger aria-label="Forma de venda" className="h-9 w-full min-w-[170px] text-xs"><SelectValue placeholder="Forma de venda" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="nao_informado">Não informado</SelectItem>
      <SelectItem value="conversa">Conversa</SelectItem>
      <SelectItem value="ligacao">Ligação</SelectItem>
      <SelectItem value="reuniao">Reunião — a definir</SelectItem>
      <SelectItem value="reuniao_na_hora">Reunião — fechou na reunião</SelectItem>
      <SelectItem value="reuniao_depois">Reunião — fechou depois</SelectItem>
    </SelectContent>
  </Select>;
}
