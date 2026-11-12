import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function MonthYearSelect({ value, onChange, label = 'Período', id }: {
  value: string; onChange: (value: string) => void; label?: string; id?: string;
}) {
  const now = new Date();
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  const year = valid ? value.slice(0, 4) : String(now.getFullYear());
  const month = valid ? value.slice(5, 7) : '';
  const firstYear = Math.min(now.getFullYear() - 10, Number(year));
  const lastYear = Math.max(now.getFullYear() + 5, Number(year));
  return <div className="flex flex-wrap items-center gap-2">
    <Select value={month} onValueChange={selected => onChange(`${year}-${selected}`)}>
      <SelectTrigger id={id} aria-label={`${label}: mês`} className="w-40"><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
      <SelectContent>{months.map((name, index) => <SelectItem key={name} value={String(index + 1).padStart(2, '0')}>{name}</SelectItem>)}</SelectContent>
    </Select>
    <Select value={year} onValueChange={selected => onChange(`${selected}-${month || String(now.getMonth() + 1).padStart(2, '0')}`)}>
      <SelectTrigger aria-label={`${label}: ano`} className="w-28"><SelectValue /></SelectTrigger>
      <SelectContent>{Array.from({ length: lastYear - firstYear + 1 }, (_, index) => String(lastYear - index)).map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
    </Select>
  </div>;
}
