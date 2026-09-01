import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import MetricCard from "@/components/MetricCard";
import { useFutureStudents, type FutureStudent } from "@/hooks/useFutureStudents";
import { useSurveyResponses, type SurveyResponse } from "@/hooks/useSurveyInsights";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Search, ShoppingBag, UserRound, Users } from "lucide-react";

const cleanCpf = (value?: string | null) => String(value || "").replace(/\D/g, "");
const normalizeName = (value?: string | null) => String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : "—";

type StudentRecord = {
  key: string;
  createdAt: string;
  student?: FutureStudent;
  survey?: SurveyResponse;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  birthDate: string;
  instagram: string;
  cep: string;
  city: string;
  address: string;
  items: Array<{ tipo: string; nome: string; valor_sinal: number; valor_pendente: number }>;
  paid: number;
  pending: number;
};

export default function StudentDataPage() {
  const { data: students = [], isLoading: loadingStudents } = useFutureStudents();
  const { data: surveys = [], isLoading: loadingSurveys } = useSurveyResponses();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StudentRecord | null>(null);

  const records = useMemo<StudentRecord[]>(() => {
    const latestSurveyByCpf = new Map<string, SurveyResponse>();
    const latestSurveyByName = new Map<string, SurveyResponse>();
    surveys.forEach((survey) => {
      const cpf = cleanCpf(survey.cpf);
      if (cpf && !latestSurveyByCpf.has(cpf)) latestSurveyByCpf.set(cpf, survey);
      const name = normalizeName(survey.nome);
      if (name && !latestSurveyByName.has(name)) latestSurveyByName.set(name, survey);
    });

    const result: StudentRecord[] = students.map((student) => {
      const survey = latestSurveyByCpf.get(cleanCpf(student.cpf)) || latestSurveyByName.get(normalizeName(student.nome));
      const items = (student.itens?.length ? student.itens : student.curso ? [{ tipo: "curso", nome: student.curso, valor_sinal: Number(student.valor_sinal || 0), valor_pendente: 0, data: student.created_at }] : [])
        .map((item) => ({ tipo: item.tipo, nome: item.nome, valor_sinal: Number(item.valor_sinal || 0), valor_pendente: Number(item.valor_pendente || 0) }));
      const profile = student as FutureStudent & { data_nascimento?: string | null; email?: string | null; instagram?: string | null; cep?: string | null; cidade?: string | null; endereco?: string | null };
      return {
        key: student.id,
        createdAt: [student.created_at, survey?.created_at || ""].sort().at(-1) || student.created_at,
        student, survey,
        name: student.nome || survey?.nome || "Aluno sem nome",
        cpf: student.cpf || survey?.cpf || "",
        phone: student.telefone || survey?.whatsapp || "",
        email: profile.email || survey?.email || "",
        birthDate: profile.data_nascimento || survey?.data_nascimento || "",
        instagram: profile.instagram || survey?.instagram || "",
        cep: profile.cep || survey?.cep || "",
        city: profile.cidade || survey?.cidade || "",
        address: profile.endereco || survey?.endereco || "",
        items,
        paid: items.reduce((sum, item) => sum + item.valor_sinal, 0),
        pending: items.reduce((sum, item) => sum + item.valor_pendente, 0),
      };
    });

    const existingCpf = new Set(result.map((record) => cleanCpf(record.cpf)).filter(Boolean));
    const existingNames = new Set(result.map((record) => normalizeName(record.name)).filter(Boolean));
    surveys.forEach((survey) => {
      const cpf = cleanCpf(survey.cpf);
      const name = normalizeName(survey.nome);
      if ((cpf && existingCpf.has(cpf)) || (!cpf && existingNames.has(name))) return;
      result.push({ key: `survey-${survey.id}`, createdAt: survey.created_at, survey, name: survey.nome || "Aluno sem nome", cpf: survey.cpf || "", phone: survey.whatsapp || "", email: survey.email || "", birthDate: survey.data_nascimento || "", instagram: survey.instagram || "", cep: survey.cep || "", city: survey.cidade || "", address: survey.endereco || "", items: survey.curso_realizado ? [{ tipo: "curso", nome: survey.curso_realizado, valor_sinal: 0, valor_pendente: 0 }] : [], paid: 0, pending: 0 });
    });
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [students, surveys]);

  const filtered = useMemo(() => {
    const query = normalizeName(search);
    if (!query) return records;
    return records.filter((record) => normalizeName([record.name, record.cpf, record.phone, record.email, record.items.map((item) => item.nome).join(" ")].join(" ")).includes(query));
  }, [records, search]);
  const totalPaid = records.reduce((sum, record) => sum + record.paid, 0);
  const totalPending = records.reduce((sum, record) => sum + record.pending, 0);

  return <PageTransition><DashboardLayout title="Dados dos Alunos" subtitle="Informações pessoais, compras e situação financeira dos alunos">
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Alunos" value={records.length} icon={<Users className="h-5 w-5" />} variant="primary" countUp />
      <MetricCard title="Com cadastro completo" value={records.filter((record) => record.email && record.cpf && record.birthDate).length} icon={<UserRound className="h-5 w-5" />} variant="accent" countUp />
      <MetricCard title="Total pago" value={totalPaid} icon={<DollarSign className="h-5 w-5" />} variant="success" countUp prefix="R$ " decimals={2} />
      <MetricCard title="Total pendente" value={totalPending} icon={<DollarSign className="h-5 w-5" />} variant="warning" countUp prefix="R$ " decimals={2} />
    </div>
    <Card className="border-border/30">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border/30 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-lg font-bold">Cadastro consolidado</h2><p className="text-xs text-muted-foreground">Clique em um aluno para ver todas as informações.</p></div><div className="relative w-full sm:w-96"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, CPF, telefone ou compra..." className="pl-9" /></div></div>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>CPF</TableHead><TableHead>Contato</TableHead><TableHead>Comprou</TableHead><TableHead className="text-right">Pago</TableHead><TableHead className="text-right">Pendente</TableHead></TableRow></TableHeader><TableBody>
          {(loadingStudents || loadingSurveys) ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Carregando dados...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum aluno encontrado.</TableCell></TableRow> : filtered.map((record) => <TableRow key={record.key} onClick={() => setSelected(record)} className="cursor-pointer"><TableCell><p className="font-semibold">{record.name}</p><p className="text-xs text-muted-foreground">{record.city || "Cidade não informada"}</p></TableCell><TableCell>{record.cpf || "—"}</TableCell><TableCell><p>{record.phone || "—"}</p><p className="text-xs text-muted-foreground">{record.email || "E-mail não informado"}</p></TableCell><TableCell><div className="flex max-w-md flex-wrap gap-1">{record.items.length ? record.items.map((item, index) => <Badge key={`${item.nome}-${index}`} variant="secondary">{item.nome}</Badge>) : <span className="text-muted-foreground">Não informado</span>}</div></TableCell><TableCell className="text-right font-semibold text-success">{formatCurrency(record.paid)}</TableCell><TableCell className="text-right font-semibold text-warning">{formatCurrency(record.pending)}</TableCell></TableRow>)}
        </TableBody></Table></div>
      </CardContent>
    </Card>
    <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" data-lenis-prevent><DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>{selected && <div className="space-y-5"><div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"><Info label="CPF" value={selected.cpf} /><Info label="Data de nascimento" value={formatDate(selected.birthDate)} /><Info label="WhatsApp" value={selected.phone} /><Info label="E-mail" value={selected.email} /><Info label="Instagram" value={selected.instagram} /><Info label="CEP" value={selected.cep} /><Info label="Cidade" value={selected.city} /><Info label="Endereço" value={selected.address} wide /></div><div><h3 className="mb-2 flex items-center gap-2 font-semibold"><ShoppingBag className="h-4 w-4" /> Compras e valores</h3><div className="space-y-2">{selected.items.length ? selected.items.map((item, index) => <div key={`${item.nome}-${index}`} className="grid gap-2 rounded-lg border border-border/40 p-3 sm:grid-cols-[1fr_130px_130px]"><div><Badge variant="outline" className="mr-2">{item.tipo}</Badge><span className="font-medium">{item.nome}</span></div><span className="text-success">Pago: {formatCurrency(item.valor_sinal)}</span><span className="text-warning">Pendente: {formatCurrency(item.valor_pendente)}</span></div>) : <p className="text-sm text-muted-foreground">Nenhuma compra vinculada.</p>}</div></div></div>}</DialogContent></Dialog>
  </DashboardLayout></PageTransition>;
}

function Info({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  return <div className={wide ? "sm:col-span-2" : ""}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value || "Não informado"}</p></div>;
}