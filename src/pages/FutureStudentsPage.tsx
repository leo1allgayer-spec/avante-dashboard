import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import MetricCard from "@/components/MetricCard";
import { useDeleteFutureStudent, useFutureStudents, useUpdateFutureStudent, type FutureStudent } from "@/hooks/useFutureStudents";
import { useSurveyResponses } from "@/hooks/useSurveyInsights";
import { useCourseBookings } from "@/hooks/clients/useCourseBookings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, DollarSign, Pencil, Plus, Search, ShieldCheck, Trash2, UserCheck, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));

const cleanCpf = (value?: string | null) => String(value || "").replace(/\D/g, "");
const cleanPhone = (value?: string | null) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : "";
};
const cleanName = (value?: string | null) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();
const cleanCourse = (value?: string | null) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/\bcurso\b/g, " ")
  .replace(/\bde\b/g, " ")
  .replace(/\btrafego pago\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const getStudentItems = (student: FutureStudent) => student.itens?.length
  ? student.itens
  : student.curso
    ? [{ tipo: "curso" as const, nome: student.curso, valor_sinal: Number(student.valor_sinal || 0), valor_pendente: 0, data: student.created_at }]
    : [];

const samePerson = (student: FutureStudent, survey: { cpf?: string | null; whatsapp?: string | null; nome?: string | null }) => {
  const cpf = cleanCpf(student.cpf);
  const phone = cleanPhone(student.telefone);
  const name = cleanName(student.nome);
  return (cpf.length === 11 && cpf === cleanCpf(survey.cpf)) ||
    (phone && phone === cleanPhone(survey.whatsapp)) ||
    (name.length >= 6 && name === cleanName(survey.nome));
};

export default function FutureStudentsPage() {
  const { data: students = [], isLoading } = useFutureStudents();
  const { data: surveys = [] } = useSurveyResponses();
  const { bookings = [] } = useCourseBookings();
  const [search, setSearch] = useState("");
  const [studentView, setStudentView] = useState<"pending" | "linked">("pending");
  const [editing, setEditing] = useState<FutureStudent | null>(null);
  const [valueDrafts, setValueDrafts] = useState<Record<string, { signal: string; pending: string }>>({});
  const [editForm, setEditForm] = useState({ nome: "", telefone: "", cpf: "", observacao: "", itens: [] as NonNullable<FutureStudent["itens"]> });
  const updateStudent = useUpdateFutureStudent();
  const deleteStudent = useDeleteFutureStudent();
  const { toast } = useToast();

  const enrollmentRows = useMemo(() => students.flatMap((student) =>
    getStudentItems(student).map((item, itemIndex) => {
      const courseKey = cleanCourse(item.nome);
      const linked = courseKey !== "" && surveys.some((survey) =>
        samePerson(student, survey) && cleanCourse(survey.curso_realizado) === courseKey
      );
      const booking = bookings
        .filter((candidate) => candidate.courseStatus !== "cancelado" && candidate.status !== "cancelled" && samePerson(student, { cpf: "", whatsapp: candidate.phone, nome: candidate.studentName }) && cleanCourse(candidate.courseName) === courseKey)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0] || null;
      return { student, item, itemIndex, rowKey: `${student.id}:${itemIndex}:${courseKey}`, linked, booking };
    })
  ), [students, surveys, bookings]);

  const filteredEnrollments = useMemo(() => {
    const q = cleanName(search);
    return enrollmentRows.filter(({ student, item, linked }) => {
      if (studentView === "linked" ? !linked : linked) return false;
      if (!q) return true;
      return cleanName(`${student.nome} ${student.telefone} ${student.cpf} ${item.nome}`).includes(q);
    });
  }, [search, studentView, enrollmentRows]);

  const totalSignal = enrollmentRows.reduce((sum, row) => sum + Number(row.item.valor_sinal || 0), 0);
  const totalPending = enrollmentRows.reduce((sum, row) => sum + Number(row.item.valor_pendente || 0), 0);
  const linkedCount = enrollmentRows.filter((row) => row.linked).length;
  const enrollmentCount = enrollmentRows.length;

  const openEdit = (student: FutureStudent) => {
    const itens = student.itens?.length
      ? student.itens.map((item) => ({ ...item }))
      : student.curso ? [{ tipo: "curso" as const, nome: student.curso, valor_sinal: Number(student.valor_sinal || 0), valor_pendente: 0, data: student.created_at }] : [];
    setEditing(student);
    setEditForm({ nome: student.nome, telefone: student.telefone, cpf: student.cpf, observacao: student.observacao || "", itens });
  };

  const saveEdit = async () => {
    if (!editing || !editForm.nome.trim() || cleanCpf(editForm.cpf).length !== 11) {
      toast({ title: "Verifique os dados", description: "Nome e CPF válido são obrigatórios.", variant: "destructive" });
      return;
    }
    const itens = editForm.itens.filter((item) => item.nome.trim()).map((item) => ({ ...item, valor_sinal: Number(item.valor_sinal || 0), valor_pendente: Number(item.valor_pendente || 0) }));
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

  const removeStudent = async (student: FutureStudent) => {
    try {
      await deleteStudent.mutateAsync(student.id);
      toast({ title: "Aluno removido", description: `O cadastro de ${student.nome} foi excluído.` });
    } catch (error) {
      toast({ title: "Erro ao remover", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  const updateValueDraft = (rowKey: string, item: ReturnType<typeof getStudentItems>[number], field: "signal" | "pending", value: string) => {
    setValueDrafts((current) => ({
      ...current,
      [rowKey]: {
        signal: current[rowKey]?.signal ?? String(Number(item.valor_sinal || 0)),
        pending: current[rowKey]?.pending ?? String(Number(item.valor_pendente || 0)),
        [field]: value,
      },
    }));
  };

  const startValueEdit = (rowKey: string, item: ReturnType<typeof getStudentItems>[number]) => setValueDrafts((current) => ({
    ...current,
    [rowKey]: current[rowKey] || {
      signal: String(Number(item.valor_sinal || 0)),
      pending: String(Number(item.valor_pendente || 0)),
    },
  }));

  const cancelValueDraft = (rowKey: string) => setValueDrafts((current) => {
    const nextDrafts = { ...current };
    delete nextDrafts[rowKey];
    return nextDrafts;
  });

  const saveInlineValues = async (student: FutureStudent, itemIndex: number, rowKey: string) => {
    const draft = valueDrafts[rowKey];
    if (!draft) return;
    const signal = Math.max(Number(draft.signal.replace(",", ".")) || 0, 0);
    const pending = Math.max(Number(draft.pending.replace(",", ".")) || 0, 0);
    const itens = getStudentItems(student).map((item, index) => index === itemIndex
      ? { ...item, valor_sinal: signal, valor_pendente: pending }
      : { ...item });
    try {
      await updateStudent.mutateAsync({
        id: student.id,
        valor_sinal: itens.reduce((sum, item) => sum + Number(item.valor_sinal || 0), 0),
        itens,
      });
      cancelValueDraft(rowKey);
      toast({ title: "Valores atualizados", description: `${student.nome} · ${itens[itemIndex].nome}: sinal ${formatCurrency(signal)} · a receber ${formatCurrency(pending)}` });
    } catch (error) {
      toast({ title: "Erro ao salvar valores", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  const removeEnrollment = async (student: FutureStudent, itemIndex: number) => {
    const itens = getStudentItems(student);
    if (itens.length <= 1) return removeStudent(student);
    const remaining = itens.filter((_, index) => index !== itemIndex);
    try {
      await updateStudent.mutateAsync({
        id: student.id,
        itens: remaining,
        valor_sinal: remaining.reduce((sum, item) => sum + Number(item.valor_sinal || 0), 0),
        curso: remaining.find((item) => item.tipo === "curso")?.nome || remaining[0]?.nome || "",
      });
      toast({ title: "Curso removido", description: `${student.nome} permanece cadastrado nos demais cursos.` });
    } catch (error) {
      toast({ title: "Erro ao remover curso", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  return (
    <PageTransition>
      <DashboardLayout
        title="Alunos Futuros"
        subtitle="Controle de sinais pagos antes do agendamento e formulario"
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
              <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">Produtos e serviços</h3><p className="text-xs text-muted-foreground">Edite ou adicione itens ao cadastro.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setEditForm({ ...editForm, itens: [...editForm.itens, { tipo: "curso", nome: "", valor_sinal: 0, valor_pendente: 0, data: new Date().toISOString() }] })}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button></div>
              <div className="mb-1 hidden grid-cols-[110px_1fr_130px_130px_40px] gap-2 px-2 text-[10px] uppercase text-muted-foreground sm:grid"><span>Tipo</span><span>Item</span><span>Sinal pago</span><span>Falta pagar</span><span /></div>
              <div className="space-y-2">
                {editForm.itens.map((item, index) => (
                  <div key={index} className="grid gap-2 rounded-lg bg-secondary/20 p-2 sm:grid-cols-[110px_1fr_130px_130px_40px]">
                    <Select value={item.tipo} onValueChange={(value: "curso" | "produto" | "servico") => setEditForm({ ...editForm, itens: editForm.itens.map((current, i) => i === index ? { ...current, tipo: value } : current) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="curso">Curso</SelectItem><SelectItem value="produto">Produto</SelectItem><SelectItem value="servico">Serviço</SelectItem></SelectContent></Select>
                    <Input value={item.nome} placeholder="Nome do item" onChange={(e) => setEditForm({ ...editForm, itens: editForm.itens.map((current, i) => i === index ? { ...current, nome: e.target.value } : current) })} />
                    <Input type="number" min={0} step="0.01" value={item.valor_sinal} onChange={(e) => setEditForm({ ...editForm, itens: editForm.itens.map((current, i) => i === index ? { ...current, valor_sinal: Number(e.target.value) } : current) })} />
                    <Input type="number" min={0} step="0.01" value={item.valor_pendente || 0} onChange={(e) => setEditForm({ ...editForm, itens: editForm.itens.map((current, i) => i === index ? { ...current, valor_pendente: Number(e.target.value) } : current) })} />
                    <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => setEditForm({ ...editForm, itens: editForm.itens.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-4 text-sm"><span>Total em sinais: <strong className="text-success">{formatCurrency(editForm.itens.reduce((sum, item) => sum + Number(item.valor_sinal || 0), 0))}</strong></span><span>Total a receber: <strong className="text-warning">{formatCurrency(editForm.itens.reduce((sum, item) => sum + Number(item.valor_pendente || 0), 0))}</strong></span></div>
            </div>
            <Button onClick={saveEdit} disabled={updateStudent.isPending}>{updateStudent.isPending ? "Salvando..." : "Salvar alterações"}</Button>
          </DialogContent>
        </Dialog>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard title="Cursos com sinal" value={enrollmentCount} icon={<Users className="h-5 w-5" />} variant="primary" countUp />
          <MetricCard title="Total em sinais" value={totalSignal} icon={<DollarSign className="h-5 w-5" />} variant="success" countUp prefix="R$ " decimals={2} />
          <MetricCard title="Total a receber" value={totalPending} icon={<DollarSign className="h-5 w-5" />} variant="warning" countUp prefix="R$ " decimals={2} />
          <MetricCard title="Ja preencheram formulario" value={linkedCount} icon={<UserCheck className="h-5 w-5" />} variant="accent" countUp />
          <MetricCard title="Pendentes" value={Math.max(enrollmentCount - linkedCount, 0)} icon={<ShieldCheck className="h-5 w-5" />} variant="warning" countUp />
        </div>

        <div className="glass-card rounded-xl border border-border/30">
          <div className="flex flex-col gap-3 border-b border-border/30 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Lista de alunos futuros</h2>
              <p className="text-xs text-muted-foreground">Cada curso é vinculado separadamente ao formulário pela pessoa e pelo curso realizado.</p>
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

          <div className="border-b border-border/30 px-4 py-3">
            <Tabs value={studentView} onValueChange={(value) => setStudentView(value as "pending" | "linked")}>
              <TabsList className="grid h-auto w-full grid-cols-2 sm:w-[420px]">
                <TabsTrigger value="pending" className="gap-2 py-2">
                  Pendentes
                  <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5">{Math.max(enrollmentCount - linkedCount, 0)}</Badge>
                </TabsTrigger>
                <TabsTrigger value="linked" className="gap-2 py-2">
                  Cursos feitos
                  <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5">{linkedCount}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
                  <TableHead className="text-right">A receber</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Curso feito</TableHead>
                  <TableHead>Agendamento</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : filteredEnrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                      {search.trim()
                        ? "Nenhum aluno encontrado com essa busca."
                        : studentView === "linked"
                          ? "Nenhum aluno vinculado ao formulário ainda."
                          : "Nenhum aluno pendente de vinculação."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrollments.map(({ student, item, itemIndex, rowKey, linked, booking }) => {

                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="font-semibold">{student.nome}</TableCell>
                        <TableCell>{student.telefone}</TableCell>
                        <TableCell>{student.cpf}</TableCell>
                        <TableCell>
                          <div className="flex max-w-md flex-wrap gap-1.5">
                            <Badge variant="secondary" title={`${item.tipo} · ${formatCurrency(item.valor_sinal)}`}>{item.nome}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {valueDrafts[rowKey] ? <div className="relative ml-auto w-28">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-success">R$</span>
                            <Input autoFocus type="number" min={0} step="0.01" value={valueDrafts[rowKey].signal} onChange={(event) => updateValueDraft(rowKey, item, "signal", event.target.value)} onKeyDown={(event) => event.key === "Enter" && void saveInlineValues(student, itemIndex, rowKey)} className="h-8 pl-8 text-right font-semibold text-success" aria-label={`Valor do sinal de ${student.nome}`} />
                          </div> : <button type="button" onClick={() => startValueEdit(rowKey, item)} className="rounded-md px-2 py-1 font-semibold text-success transition-colors hover:bg-success/10" title="Clique para editar o valor do sinal">{formatCurrency(item.valor_sinal)}</button>}
                        </TableCell>
                        <TableCell className="text-right">
                          {valueDrafts[rowKey] ? <div className="relative ml-auto w-28">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-warning">R$</span>
                            <Input type="number" min={0} step="0.01" value={valueDrafts[rowKey].pending} onChange={(event) => updateValueDraft(rowKey, item, "pending", event.target.value)} onKeyDown={(event) => event.key === "Enter" && void saveInlineValues(student, itemIndex, rowKey)} className="h-8 pl-8 text-right font-semibold text-warning" aria-label={`Valor a receber de ${student.nome}`} />
                          </div> : <button type="button" onClick={() => startValueEdit(rowKey, item)} className="rounded-md px-2 py-1 font-semibold text-warning transition-colors hover:bg-warning/10" title="Clique para editar o valor a receber">{formatCurrency(Number(item.valor_pendente || 0))}</button>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                            Sinal pago
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={linked ? "border-primary/30 bg-primary/10 text-primary" : "border-warning/30 bg-warning/10 text-warning"}>
                            {linked ? "Curso feito" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {booking ? <div className="space-y-1"><Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Curso marcado</Badge><div className="text-xs text-muted-foreground">{formatDate(`${booking.date}T12:00:00`)}{booking.time ? ` · ${booking.time}` : ""}</div></div> : <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">Ainda não marcado</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(student.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {valueDrafts[rowKey] && <><Button size="icon" variant="ghost" disabled={updateStudent.isPending} onClick={() => void saveInlineValues(student, itemIndex, rowKey)} title="Salvar valores" className="text-success hover:text-success"><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" disabled={updateStudent.isPending} onClick={() => cancelValueDraft(rowKey)} title="Cancelar alteração"><X className="h-4 w-4" /></Button></>}
                            <Button size="icon" variant="ghost" onClick={() => openEdit(student)} title="Editar aluno"><Pencil className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" title="Remover aluno"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Remover cadastro?</AlertDialogTitle><AlertDialogDescription>O curso <strong>{item.nome}</strong> de <strong>{student.nome}</strong> será removido. Os outros cursos e agendamentos não serão apagados.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => removeEnrollment(student, itemIndex)}>Remover cadastro</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
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
