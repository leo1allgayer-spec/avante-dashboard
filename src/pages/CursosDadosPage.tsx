import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import DateFilterBar from "@/components/DateFilterBar";
import { useLocalDateFilter } from "@/hooks/useLocalDateFilter";
import { useCursosDados, useCreateCursoDado, useDeleteCursoDado, useUpdateCursoDado, type CursoDado } from "@/hooks/useCursosDados";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, GraduationCap, Users, BookOpen, TrendingUp, DollarSign, Award } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const TIPOS_CURSO = [
  "Curso de Meta Ads",
  "Curso de Google Ads",
  "Curso de TikTok Ads",
  "Curso de YouTube Ads",
  "Curso de Social Media",
  "Curso de Edição e Captação de Vídeos",
  "Curso de Inteligência Artificial",
];

const CHART_COLORS = [
  "hsl(270, 70%, 60%)",
  "hsl(174, 75%, 48%)",
  "hsl(45, 93%, 58%)",
  "hsl(340, 75%, 55%)",
  "hsl(210, 70%, 55%)",
];

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const CursosDadosPage = () => {
  const { data: allCursos = [], isLoading } = useCursosDados();
  const dateFilter = useLocalDateFilter();
  const cursos = dateFilter.filterByDate(allCursos);
  const createCurso = useCreateCursoDado();
  const deleteCurso = useDeleteCursoDado();
  const updateCurso = useUpdateCursoDado();

  const persist = (id: string, field: keyof CursoDado, value: any) => {
    updateCurso.mutate(
      { id, [field]: value } as any,
      { onError: (err) => toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" }) }
    );
  };
  const { session } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    data: new Date().toISOString().split("T")[0],
    instrutor: "",
    tipo_curso: "",
    nome_aluno: "",
    comissao_extra: 0,
  });

  // Computed metrics
  const metrics = useMemo(() => {
    const totalCursos = cursos.length;
    const alunosUnicos = new Set(cursos.map((c) => c.nome_aluno.trim().toLowerCase())).size;
    const mediaCursosPorAluno = alunosUnicos > 0 ? totalCursos / alunosUnicos : 0;
    const mesesSet = new Set(cursos.map((c) => c.data.substring(0, 7)));
    const totalMeses = mesesSet.size || 1;
    const mediaMensal = totalCursos / totalMeses;
    const totalComissao = cursos.reduce((s, c) => s + c.comissao_extra, 0);
    return { totalCursos, alunosUnicos, mediaCursosPorAluno, mediaMensal, totalComissao };
  }, [cursos]);

  // Chart: cursos por tipo (pie)
  const cursosPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    cursos.forEach((c) => {
      const label = c.tipo_curso.replace("Curso de ", "");
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [cursos]);

  // Chart: ranking alunos (top 8)
  const rankingAlunos = useMemo(() => {
    const map: Record<string, number> = {};
    cursos.forEach((c) => {
      const key = c.nome_aluno.trim();
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([nome, cursos]) => ({ nome, cursos }));
  }, [cursos]);

  // Chart: cursos por instrutor
  const cursosPorInstrutor = useMemo(() => {
    const map: Record<string, number> = {};
    cursos.forEach((c) => {
      map[c.instrutor.trim()] = (map[c.instrutor.trim()] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([instrutor, total]) => ({ instrutor, total }));
  }, [cursos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    createCurso.mutate(
      { user_id: session.user.id, ...form },
      {
        onSuccess: () => {
          toast({ title: "Curso registrado!" });
          setDialogOpen(false);
          setForm({ data: new Date().toISOString().split("T")[0], instrutor: "", tipo_curso: "", nome_aluno: "", comissao_extra: 0 });
        },
        onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
      }
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border/40 bg-card p-3 shadow-xl">
        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs text-muted-foreground">
            {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <PageTransition>
      <DashboardLayout
        title="Cursos Dados"
        subtitle="Registro de cursos realizados"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-0 gap-0 border-border/40 bg-card">
              <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 pb-4 border-b border-border/20">
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    Novo Curso Dado
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground/70">Registre um curso ministrado</DialogDescription>
                </DialogHeader>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Data</Label>
                    <Input type="date" value={form.data} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))} className="bg-secondary/30 border-border/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Instrutor</Label>
                    <Input value={form.instrutor} onChange={(e) => setForm((p) => ({ ...p, instrutor: e.target.value }))} required placeholder="Quem deu o curso" className="bg-secondary/30 border-border/30" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tipo do Curso</Label>
                  <Select value={form.tipo_curso} onValueChange={(v) => setForm((p) => ({ ...p, tipo_curso: v }))}>
                    <SelectTrigger className="bg-secondary/30 border-border/30"><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_CURSO.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome do Aluno</Label>
                  <Input value={form.nome_aluno} onChange={(e) => setForm((p) => ({ ...p, nome_aluno: e.target.value }))} required placeholder="Nome completo" className="bg-secondary/30 border-border/30" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Comissão Extra (R$)</Label>
                  <Input type="number" step="0.01" value={form.comissao_extra || ""} onChange={(e) => setForm((p) => ({ ...p, comissao_extra: Number(e.target.value) }))} placeholder="0,00" className="bg-secondary/30 border-border/30" />
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={createCurso.isPending}>
                  {createCurso.isPending ? "Salvando..." : "✓ Registrar Curso"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      >
        <DateFilterBar mode={dateFilter.mode} onModeChange={dateFilter.setMode} label={dateFilter.label} onBack={dateFilter.goBack} onForward={dateFilter.goForward} />

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <MetricCard title="Total Cursos" value={metrics.totalCursos} icon={<BookOpen className="h-5 w-5" />} variant="primary" countUp />
          <MetricCard title="Alunos Únicos" value={metrics.alunosUnicos} icon={<Users className="h-5 w-5" />} variant="accent" countUp />
          <MetricCard title="Cursos / Aluno" value={metrics.mediaCursosPorAluno.toFixed(1)} subtitle="Média por pessoa" icon={<TrendingUp className="h-5 w-5" />} variant="success" />
          <MetricCard title="Média Mensal" value={metrics.mediaMensal.toFixed(1)} subtitle="Cursos por mês" icon={<GraduationCap className="h-5 w-5" />} variant="warning" />
          <MetricCard title="Comissão Extra" value={metrics.totalComissao} icon={<DollarSign className="h-5 w-5" />} variant="primary" countUp prefix="R$ " decimals={2} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          {/* Pie: Cursos por Tipo */}
          <div className="glass-card rounded-lg p-5 border border-border/20">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Cursos por Tipo</h3>
            {cursosPorTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={cursosPorTipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {cursosPorTipo.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(v: string) => <span className="text-[10px] text-muted-foreground">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
            )}
          </div>

          {/* Bar: Ranking Alunos */}
          <div className="glass-card rounded-lg p-5 border border-border/20">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Award className="h-3.5 w-3.5 text-accent" /> Ranking Alunos (Top 8)
            </h3>
            {rankingAlunos.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rankingAlunos} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 15%, 18%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(260, 10%, 55%)" }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={90}
                    tick={{ fontSize: 10, fill: "hsl(260, 10%, 70%)" }}
                    tickFormatter={(v: string) => v.length > 12 ? v.substring(0, 12) + "…" : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cursos" name="Cursos" fill="hsl(174, 75%, 48%)" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
            )}
          </div>

          {/* Bar: Cursos por Instrutor */}
          <div className="glass-card rounded-lg p-5 border border-border/20">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Cursos por Instrutor</h3>
            {cursosPorInstrutor.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cursosPorInstrutor} margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 15%, 18%)" vertical={false} />
                  <XAxis
                    dataKey="instrutor"
                    tick={{ fontSize: 10, fill: "hsl(260, 10%, 70%)" }}
                    tickFormatter={(v: string) => v.length > 10 ? v.substring(0, 10) + "…" : v}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(260, 10%, 55%)" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Cursos" fill="hsl(270, 70%, 60%)" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden border border-border/30">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30" style={{ background: "hsl(260, 22%, 9%)" }}>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Data</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Instrutor</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Tipo do Curso</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Nome do Aluno</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Comissão Extra</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell>
                  </TableRow>
                ) : cursos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum curso registrado</TableCell>
                  </TableRow>
                ) : (
                  cursos.map((c) => (
                    <TableRow key={c.id} className="border-border/20 hover:bg-secondary/20" style={{ background: "hsl(260, 22%, 7%)" }}>
                      <TableCell className="text-sm p-1">
                        <Input
                          type="date"
                          defaultValue={c.data}
                          onBlur={(e) => e.target.value !== c.data && persist(c.id, "data", e.target.value)}
                          className="h-8 bg-transparent border-transparent hover:border-border/40 focus:border-border text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-sm p-1">
                        <Input
                          defaultValue={c.instrutor}
                          onBlur={(e) => e.target.value !== c.instrutor && persist(c.id, "instrutor", e.target.value)}
                          className="h-8 bg-transparent border-transparent hover:border-border/40 focus:border-border text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-sm p-1">
                        <Select value={c.tipo_curso} onValueChange={(v) => v !== c.tipo_curso && persist(c.id, "tipo_curso", v)}>
                          <SelectTrigger className="h-8 bg-transparent border-transparent hover:border-border/40 focus:border-border text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_CURSO.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm p-1">
                        <Input
                          defaultValue={c.nome_aluno}
                          onBlur={(e) => e.target.value !== c.nome_aluno && persist(c.id, "nome_aluno", e.target.value)}
                          className="h-8 bg-transparent border-transparent hover:border-border/40 focus:border-border text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-sm text-right p-1">
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={c.comissao_extra}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== c.comissao_extra) persist(c.id, "comissao_extra", v);
                          }}
                          className="h-8 bg-transparent border-transparent hover:border-border/40 focus:border-border text-sm text-right font-semibold"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteCurso.mutate(c.id, {
                            onSuccess: () => toast({ title: "Registro removido" }),
                            onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
                          })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DashboardLayout>
    </PageTransition>
  );
};

export default CursosDadosPage;
