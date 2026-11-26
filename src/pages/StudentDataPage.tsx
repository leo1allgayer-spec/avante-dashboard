import {courseDisplayName} from '@/constants/courseCatalog';
import { useEffect, useMemo, useState } from "react";
import AnalyticsPeriodFilter from "@/components/AnalyticsPeriodFilter";
import { analyticsRange, localTimestampDate, type AnalyticsPeriod } from "@/lib/analyticsPeriods";
import { dateKey, inRange } from "@/lib/evolutionMetrics";
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
import { DollarSign, FileDown, Search, ShieldCheck, ShoppingBag, UserRound, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { downloadCommitmentPdf, formatBrazilDate, type CommitmentAcceptance } from "@/lib/studentCommitment";

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
  commitmentAcceptances: CommitmentAcceptance[];
};

type CommitmentFilter = "all" | "accepted" | "pending" | "legacy";
const TERM_ROLLOUT_DATE = "2026-11-24";

function commitmentStatus(record: StudentRecord) {
  if (record.commitmentAcceptances.length) return "accepted" as const;
  return localTimestampDate(record.createdAt) < TERM_ROLLOUT_DATE ? "legacy" as const : "pending" as const;
}

function commitmentStatusLabel(status: ReturnType<typeof commitmentStatus>) {
  if (status === "accepted") return "Termo aceito";
  if (status === "pending") return "Termo pendente";
  return "Cadastro anterior à implementação do termo";
}

export default function StudentDataPage() {
  const { data: students = [], isLoading: loadingStudents } = useFutureStudents();
  const { data: surveys = [], isLoading: loadingSurveys } = useSurveyResponses();
  const [commitmentAcceptances, setCommitmentAcceptances] = useState<CommitmentAcceptance[]>([]);
  const [commitmentFilter, setCommitmentFilter] = useState<CommitmentFilter>("all");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<AnalyticsPeriod>("all");
  const [anchor, setAnchor] = useState(dateKey(new Date()));
  const [selected, setSelected] = useState<StudentRecord | null>(null);

  useEffect(() => {
    let active = true;
    (supabase as any).from("student_commitment_acceptances_dashboard").select("*").order("accepted_at", { ascending: false })
      .then(({ data, error }: { data: CommitmentAcceptance[] | null; error: unknown }) => {
        if (!active) return;
        if (error) {
          console.error("Não foi possível carregar os termos dos alunos:", error);
          setCommitmentAcceptances([]);
          return;
        }
        setCommitmentAcceptances(data || []);
      });
    return () => { active = false; };
  }, []);

  const records = useMemo<StudentRecord[]>(() => {
    const acceptancesByStudent = new Map<string, CommitmentAcceptance[]>();
    commitmentAcceptances.forEach((acceptance) => {
      const current = acceptancesByStudent.get(acceptance.student_id) || [];
      current.push(acceptance);
      acceptancesByStudent.set(acceptance.student_id, current);
    });
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
        .map((item) => ({ tipo: item.tipo, nome: item.tipo === "curso" ? courseDisplayName(item.nome) : item.nome, valor_sinal: Number(item.valor_sinal || 0), valor_pendente: Number(item.valor_pendente || 0) }));
      const profile = student as FutureStudent & { data_nascimento?: string | null; email?: string | null; instagram?: string | null; cep?: string | null; cidade?: string | null; endereco?: string | null };
      return {
        key: student.id,
        createdAt: student.created_at,
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
        commitmentAcceptances: acceptancesByStudent.get(student.id) || [],
      };
    });

    const existingCpf = new Set(result.map((record) => cleanCpf(record.cpf)).filter(Boolean));
    const existingNames = new Set(result.map((record) => normalizeName(record.name)).filter(Boolean));
    surveys.forEach((survey) => {
      const cpf = cleanCpf(survey.cpf);
      const name = normalizeName(survey.nome);
      if ((cpf && existingCpf.has(cpf)) || (!cpf && existingNames.has(name))) return;
      result.push({ key: `survey-${survey.id}`, createdAt: survey.created_at, survey, name: survey.nome || "Aluno sem nome", cpf: survey.cpf || "", phone: survey.whatsapp || "", email: survey.email || "", birthDate: survey.data_nascimento || "", instagram: survey.instagram || "", cep: survey.cep || "", city: survey.cidade || "", address: survey.endereco || "", items: survey.curso_realizado ? [{ tipo: "curso", nome: survey.curso_realizado, valor_sinal: 0, valor_pendente: 0 }] : [], paid: 0, pending: 0, commitmentAcceptances: [] });
    });
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [students, surveys, commitmentAcceptances]);

  const filtered = useMemo(() => {
    const query = normalizeName(search);
    const range = analyticsRange(period, anchor);
    return records.filter((record) => (!range || inRange(localTimestampDate(record.createdAt),range)) && (commitmentFilter === "all" || commitmentStatus(record) === commitmentFilter) && (!query || normalizeName([record.name, record.cpf, record.phone, record.email, record.items.map((item) => item.nome).join(" ")].join(" ")).includes(query)));
  }, [records, search, period, anchor, commitmentFilter]);
  const totalPaid = filtered.reduce((sum, record) => sum + record.paid, 0);
  const totalPending = filtered.reduce((sum, record) => sum + record.pending, 0);

  return <PageTransition><DashboardLayout title="Dados dos Alunos" subtitle="Informações pessoais, compras e situação financeira dos alunos">
    <AnalyticsPeriodFilter mode={period} anchor={anchor} onMode={setPeriod} onAnchor={setAnchor}/>
    <p className="mb-4 text-xs text-muted-foreground">Filtro pela data do cadastro do aluno (horário de Brasília); quando existe apenas pesquisa, utiliza a data dela. Os valores são os saldos dos alunos selecionados, não o fluxo de caixa do período.</p>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Alunos" value={filtered.length} icon={<Users className="h-5 w-5" />} variant="primary" countUp />
      <MetricCard title="Com cadastro completo" value={filtered.filter((record) => record.email && record.cpf && record.birthDate).length} icon={<UserRound className="h-5 w-5" />} variant="accent" countUp />
      <MetricCard title="Total pago" value={totalPaid} icon={<DollarSign className="h-5 w-5" />} variant="success" countUp prefix="R$ " decimals={2} />
      <MetricCard title="Total pendente" value={totalPending} icon={<DollarSign className="h-5 w-5" />} variant="warning" countUp prefix="R$ " decimals={2} />
    </div>
    <Card className="border-border/30">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border/30 p-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-lg font-bold">Cadastro consolidado</h2><p className="text-xs text-muted-foreground">Clique em um aluno para ver todas as informações.</p></div><div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, CPF, telefone ou compra..." className="pl-9" /></div><Select value={commitmentFilter} onValueChange={(value: CommitmentFilter) => setCommitmentFilter(value)}><SelectTrigger className="w-full sm:w-[260px]"><SelectValue placeholder="Filtrar por termo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status do termo</SelectItem><SelectItem value="accepted">Termo aceito</SelectItem><SelectItem value="pending">Termo pendente</SelectItem><SelectItem value="legacy">Cadastro anterior ao termo</SelectItem></SelectContent></Select></div></div>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>CPF</TableHead><TableHead>Contato</TableHead><TableHead>Comprou</TableHead><TableHead>Termo</TableHead><TableHead className="text-right">Pago</TableHead><TableHead className="text-right">Pendente</TableHead></TableRow></TableHeader><TableBody>
          {(loadingStudents || loadingSurveys) ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Carregando dados...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum aluno encontrado.</TableCell></TableRow> : filtered.map((record) => { const status = commitmentStatus(record); return <TableRow key={record.key} onClick={() => setSelected(record)} className="cursor-pointer"><TableCell><p className="font-semibold">{record.name}</p><p className="text-xs text-muted-foreground">{record.city || "Cidade não informada"}</p></TableCell><TableCell>{record.cpf || "—"}</TableCell><TableCell><p>{record.phone || "—"}</p><p className="text-xs text-muted-foreground">{record.email || "E-mail não informado"}</p></TableCell><TableCell><div className="flex max-w-md flex-wrap gap-1">{record.items.length ? record.items.map((item, index) => <Badge key={`${item.nome}-${index}`} variant="secondary">{item.nome}</Badge>) : <span className="text-muted-foreground">Não informado</span>}</div></TableCell><TableCell><Badge variant="outline" className={status === "accepted" ? "border-success/40 text-success" : status === "pending" ? "border-warning/40 text-warning" : "text-muted-foreground"}>{commitmentStatusLabel(status)}</Badge></TableCell><TableCell className="text-right font-semibold text-success">{formatCurrency(record.paid)}</TableCell><TableCell className="text-right font-semibold text-warning">{formatCurrency(record.pending)}</TableCell></TableRow>; })}
        </TableBody></Table></div>
      </CardContent>
    </Card>
    <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" data-lenis-prevent><DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>{selected && <div className="space-y-5"><div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"><Info label="CPF" value={selected.cpf} /><Info label="Data de nascimento" value={formatDate(selected.birthDate)} /><Info label="WhatsApp" value={selected.phone} /><Info label="E-mail" value={selected.email} /><Info label="Instagram" value={selected.instagram} /><Info label="CEP" value={selected.cep} /><Info label="Cidade" value={selected.city} /><Info label="Endereço" value={selected.address} wide /></div><div><h3 className="mb-2 flex items-center gap-2 font-semibold"><ShoppingBag className="h-4 w-4" /> Compras e valores</h3><div className="space-y-2">{selected.items.length ? selected.items.map((item, index) => <div key={`${item.nome}-${index}`} className="grid gap-2 rounded-lg border border-border/40 p-3 sm:grid-cols-[1fr_130px_130px]"><div><Badge variant="outline" className="mr-2">{item.tipo}</Badge><span className="font-medium">{item.nome}</span></div><span className="text-success">Pago: {formatCurrency(item.valor_sinal)}</span><span className="text-warning">Pendente: {formatCurrency(item.valor_pendente)}</span></div>) : <p className="text-sm text-muted-foreground">Nenhuma compra vinculada.</p>}</div></div><section className="rounded-xl border border-border/50 p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Termo de Compromisso</h3>{selected.commitmentAcceptances.length === 0 ? <p className="text-sm text-muted-foreground">{commitmentStatusLabel(commitmentStatus(selected))}</p> : <div className="space-y-3">{selected.commitmentAcceptances.map((acceptance) => <article key={acceptance.id} className="rounded-lg border border-border/40 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><Badge variant="outline" className="border-success/40 text-success">Termo aceito</Badge><p className="mt-2 text-sm font-medium">{acceptance.course_name}{acceptance.course_date ? ` — ${formatBrazilDate(acceptance.course_date)}${acceptance.course_shift ? `, ${acceptance.course_shift}` : ""}` : " — data a definir"}</p><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(acceptance.accepted_at))} · versão {acceptance.term_version}</p></div><Button size="sm" variant="outline" onClick={() => downloadCommitmentPdf({ studentName: acceptance.student_name, cpf: acceptance.student_cpf, phone: acceptance.student_phone, email: selected?.email, courseName: acceptance.course_name, signalValue: acceptance.signal_value, acceptance })}><FileDown className="mr-2 h-4 w-4" />PDF</Button></div><details className="mt-3"><summary className="cursor-pointer text-sm text-primary">Visualizar termo completo</summary><pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/30 p-3 font-sans text-xs leading-relaxed text-muted-foreground">{acceptance.term_content}</pre><p className="mt-2 break-all text-[10px] text-muted-foreground">Documento {acceptance.id} · SHA-256 {acceptance.content_sha256}</p></details></article>)}</div>}</section></div>}</DialogContent></Dialog>
  </DashboardLayout></PageTransition>;
}

function Info({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  return <div className={wide ? "sm:col-span-2" : ""}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value || "Não informado"}</p></div>;
}
