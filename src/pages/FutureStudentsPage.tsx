import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import MetricCard from "@/components/MetricCard";
import { useFutureStudents, useUpdateFutureStudent, type FutureStudent } from "@/hooks/useFutureStudents";
import { useSurveyResponses } from "@/hooks/useSurveyInsights";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, DollarSign, Link2, Pencil, Plus, Search, ShieldCheck, Trash2, UserCheck, Users } from "lucide-react";
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
  const [editing, setEditing] = useState<FutureStudent | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", telefone: "", cpf: "", observacao: "", itens: [] as NonNullable<FutureStudent["itens"]> });
  const updateStudent = useUpdateFutureStudent();
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

  const openEdit = (student: FutureStudent) => {
    const itens = student.itens?.length
      ? student.itens.map((item) => ({ ...item }))
      : student.curso ? [{ tipo: "curso" as const, nome: student.curso, valor_sinal: Number(student.valor_sinal || 0), data: student.created_at }] : [];
    setEditing(student);
    setEditForm({ nome: student.nome, telefone: student.telefone, cpf: student.cpf, observacao: student.observacao || "", itens });
  };

  const saveEdit = async () => {
    if (!editing || !editForm.nome.trim() || cleanCpf(editForm.cpf).length !== 11) {
      toast({ title: "Verifique os dados", description: "Nome e CPF válido são obrigatórios.", variant: "destructive" });
      return;
    }
    const itens = editForm.itens.filter((item) => item.nome.trim()).map((item) => ({ ...item, valor_sinal: Number(item.valor_sinal || 0) }));
    const total = itens.reduce((sum, item) => sum + item.valor_sinal, 0);
    try {
      await updateStudent.mutateAsync({
        id: editing.id,
        nome: editForm.nome.trim(), telefone: editForm.telefone.trim(), cpf: editForm.cpf.trim(),
        observacao: editForm.observacao.trim(), itens, valor_sinal: total,
        curso: itens.find((item) => item.tipo === "curso")?.nome || itens[0]?.nome || "",
      });
      toast({ title: "Cadastro atualizado" });
      setEditing(null);
    } catch (error) {
      toast({ title: "Erro ao atualizar", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
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
        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader><DialogTitle>Editar cadastro do aluno</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-xs text-muted-foreground">Nome</label><Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} /></div>
              <div><label className="mb-1.5 block text-xs text-muted-foreground">Telefone</label><Input value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} /></div>
              <div><label className="mb-1.5 block text-xs text-muted-foreground">CPF</label><Input value={editForm.cpf} onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="mb-1.5 block text-xs text-muted-foreground">Observação</label><Textarea value={editForm.observacao} onChange={(e) => setEditForm({ ...editForm, observacao: e.target.value })} /></div>
            </div>
            <div className="mt-2 rounded-xl border border-border/40 p-4">
              <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">Produtos e serviços</h3><p className="text-xs text-muted-foreground">Edite ou adicione itens ao cadastro.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setEditForm({ ...editForm, itens: [...editForm.itens, { tipo: "curso", nome: "", valor_sinal: 0, data: new Date().toISOString() }] })}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button></div>
              <div className="space-y-2">
                {editForm.itens.map((item, index) => (
                  <div key={index} className="grid gap-2 rounded-lg bg-secondary/20 p-2 sm:grid-cols-[120px_1fr_150px_40px]">
                    <Select value={item.tipo} onValueChange={(value: "curso" | "produto" | "servico") => setEditForm({ ...editForm, itens: editForm.itens.map((current, i) => i === index ? { ...current, tipo: value } : current) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="curso">Curso</SelectItem><SelectItem value="produto">Produto</SelectItem><SelectItem value="servico">Serviço</SelectItem></SelectContent></Select>
                    <Input value={item.nome} placeholder="Nome do item" onChange={(e) => setEditForm({ ...editForm, itens: editForm.itens.map((current, i) => i === index ? { ...current, nome: e.target.value } : current) })} />
                    <Input type="number" min={0} step="0.01" value={item.valor_sinal} onChange={(e) => setEditForm({ ...editForm, itens: editForm.itens.map((current, i) => i === index ? { ...current, valor_sinal: Number(e.target.value) } : current) })} />
                    <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => setEditForm({ ...editForm, itens: editForm.itens.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-right text-sm">Total em sinais: <strong className="text-success">{formatCurrency(editForm.itens.reduce((sum, item) => sum + Number(item.valor_sinal || 0), 0))}</strong></p>
            </div>
            <Button onClick={saveEdit} disabled={updateStudent.isPending}>{updateStudent.isPending ? "Salvando..." : "Salvar alterações"}</Button>
          </DialogContent>
        </Dialog>
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
                  <TableHead className="w-14">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
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
                        <TableCell><Button size="icon" variant="ghost" onClick={() => openEdit(student)} title="Editar aluno"><Pencil className="h-4 w-4" /></Button></TableCell>
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
