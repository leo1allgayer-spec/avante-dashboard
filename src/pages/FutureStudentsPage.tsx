import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import MetricCard from "@/components/MetricCard";
import { useFutureStudents } from "@/hooks/useFutureStudents";
import { useSurveyResponses } from "@/hooks/useSurveyInsights";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, DollarSign, Link2, Search, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PUBLIC_SIGNUP_PATH = "/aluno-futuro";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));

const cleanCpf = (value?: string | null) => String(value || "").replace(/\D/g, "");

export default function FutureStudentsPage() {
  const { data: students = [], isLoading } = useFutureStudents();
  const { data: surveys = [] } = useSurveyResponses();
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const publicLink = `${window.location.origin}${PUBLIC_SIGNUP_PATH}`;

  const surveyCpfSet = useMemo(() => new Set(surveys.map((survey) => cleanCpf(survey.cpf)).filter(Boolean)), [surveys]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;

    return students.filter((student) =>
      student.nome.toLowerCase().includes(q) ||
      student.telefone.toLowerCase().includes(q) ||
      student.cpf.toLowerCase().includes(q) ||
      (student.curso || "").toLowerCase().includes(q) ||
      (student.itens || []).some((item) => item.nome.toLowerCase().includes(q)),
    );
  }, [search, students]);

  const totalSignal = students.reduce((sum, student) => sum + Number(student.valor_sinal || 0), 0);
  const linkedCount = students.filter((student) => surveyCpfSet.has(cleanCpf(student.cpf))).length;

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicLink);
    toast({ title: "Link copiado", description: publicLink });
  };

  return (
    <PageTransition>
      <DashboardLayout
        title="Alunos Futuros"
        subtitle="Controle de sinais pagos antes do agendamento e formulario"
        actions={
          <Button onClick={copyLink} className="gap-2">
            <Copy className="h-4 w-4" /> Copiar link de cadastro
          </Button>
        }
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Alunos com sinal" value={students.length} icon={<Users className="h-5 w-5" />} variant="primary" countUp />
          <MetricCard title="Total em sinais" value={totalSignal} icon={<DollarSign className="h-5 w-5" />} variant="success" countUp prefix="R$ " decimals={2} />
          <MetricCard title="Ja preencheram formulario" value={linkedCount} icon={<UserCheck className="h-5 w-5" />} variant="accent" countUp />
          <MetricCard title="Pendentes" value={Math.max(students.length - linkedCount, 0)} icon={<ShieldCheck className="h-5 w-5" />} variant="warning" countUp />
        </div>

        <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Link para enviar ao aluno</p>
              <p className="mt-1 break-all text-sm font-medium text-foreground">{publicLink}</p>
            </div>
            <Button variant="outline" onClick={copyLink} className="gap-2">
              <Link2 className="h-4 w-4" /> Copiar
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-xl border border-border/30">
          <div className="flex flex-col gap-3 border-b border-border/30 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Lista de alunos futuros</h2>
              <p className="text-xs text-muted-foreground">Os registros serao vinculados ao formulario pelo CPF.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, CPF ou telefone..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Produtos / serviços</TableHead>
                  <TableHead className="text-right">Valor sinal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Formulario</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nenhum aluno futuro cadastrado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const linked = surveyCpfSet.has(cleanCpf(student.cpf));

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-semibold">{student.nome}</TableCell>
                        <TableCell>{student.telefone}</TableCell>
                        <TableCell>{student.cpf}</TableCell>
                        <TableCell>
                          <div className="flex max-w-md flex-wrap gap-1.5">
                            {(student.itens?.length ? student.itens : student.curso ? [{ tipo: "curso", nome: student.curso, valor_sinal: student.valor_sinal, data: student.created_at }] : []).map((item, index) => (
                              <Badge key={`${item.nome}-${index}`} variant="secondary" title={`${item.tipo} · ${formatCurrency(item.valor_sinal)}`}>
                                {item.nome}
                              </Badge>
                            ))}
                            {!student.itens?.length && !student.curso && <span className="text-muted-foreground">Não informado</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-success">{formatCurrency(student.valor_sinal)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                            Sinal pago
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={linked ? "border-primary/30 bg-primary/10 text-primary" : "border-warning/30 bg-warning/10 text-warning"}>
                            {linked ? "Vinculado" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(student.created_at)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
}
