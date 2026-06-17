import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import MetricCard from "@/components/MetricCard";
import { useClients } from "@/hooks/useClients";
import { motion } from "framer-motion";
import { DollarSign, Star, Users, ShieldCheck, MapPin } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CountUp from "react-countup";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "#f59e0b", "#ef4444", "#8b5cf6"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs bg-popover border border-border shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-foreground font-medium">
          {p.name}: {typeof p.value === "number" && p.value > 100 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const AnaliseVendasPage = () => {
  const { data: clients = [], isLoading } = useClients();

  const totalFat = clients.reduce((s, c) => s + Number(c.valor || 0), 0);
  const totalClients = clients.length;
  const ticketMedio = totalClients > 0 ? totalFat / totalClients : 0;
  const notasValidas = clients.filter((c) => c.nota != null && c.nota > 0);
  const notaMedia = notasValidas.length > 0 ? notasValidas.reduce((s, c) => s + Number(c.nota), 0) / notasValidas.length : 0;
  const exclusivos = clients.filter((c) => c.exclusividade === true).length;
  const taxaExcl = totalClients > 0 ? (exclusivos / totalClients) * 100 : 0;

  // Origem
  const origemMap: Record<string, number> = {};
  clients.forEach((c) => { const o = c.origem || "Não informado"; origemMap[o] = (origemMap[o] || 0) + 1; });
  const origemData = Object.entries(origemMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Consultor
  const consultorMap: Record<string, { atendimentos: number; faturamento: number }> = {};
  clients.forEach((c) => {
    const con = c.consultor || "Não informado";
    if (!consultorMap[con]) consultorMap[con] = { atendimentos: 0, faturamento: 0 };
    consultorMap[con].atendimentos++;
    consultorMap[con].faturamento += Number(c.valor || 0);
  });
  const consultorData = Object.entries(consultorMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.atendimentos - a.atendimentos);

  // Tempo de decisão
  const tempoMap: Record<string, number> = {};
  clients.forEach((c) => { const t = c.tempo_decisao || "Não informado"; tempoMap[t] = (tempoMap[t] || 0) + 1; });
  const tempoData = Object.entries(tempoMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Notas
  const notaMap: Record<number, number> = {};
  notasValidas.forEach((c) => { const n = Math.round(Number(c.nota)); notaMap[n] = (notaMap[n] || 0) + 1; });
  const notaData = Object.entries(notaMap).map(([nota, count]) => ({ nota: `${nota}⭐`, count: Number(count) })).sort((a, b) => parseInt(a.nota) - parseInt(b.nota));

  // Objetivo
  const objMap: Record<string, number> = {};
  clients.forEach((c) => { const o = c.objetivo || "Não informado"; objMap[o] = (objMap[o] || 0) + 1; });
  const objData = Object.entries(objMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Bairro / Região
  const bairroMap: Record<string, number> = {};
  clients.forEach((c) => { const b = c.bairro || "Não informado"; bairroMap[b] = (bairroMap[b] || 0) + 1; });
  const bairroData = Object.entries(bairroMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

  return (
    <PageTransition>
      <DashboardLayout title="Análise de Vendas" subtitle="Análise completa de vendas, atendimento e performance">
        {/* KPI Cards */}
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <MetricCard title="Faturamento Total" value={formatCurrency(totalFat)} subtitle={`${totalClients} alunos/leads`} icon={<DollarSign className="h-5 w-5" />} variant="accent" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Ticket Médio" value={formatCurrency(ticketMedio)} subtitle="Por aluno" icon={<DollarSign className="h-5 w-5" />} variant="primary" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Nota Média" value={notaMedia.toFixed(2)} subtitle="Satisfação (0-10)" icon={<Star className="h-5 w-5" />} variant="success" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard title="Taxa de Exclusividade" value={`${taxaExcl.toFixed(1)}%`} subtitle="Não conversaram com concorrentes" icon={<ShieldCheck className="h-5 w-5" />} />
          </StaggerItem>
        </StaggerContainer>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : (
          <>
            {/* Row 1: Origem + Atendimentos por Consultor */}
            <div className="grid gap-4 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-hover rounded-lg p-5">
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">🌐 Origem dos Alunos</h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={origemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {origemData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card-hover rounded-lg p-5">
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">👥 Atendimentos por Consultor</h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultorData} margin={{ left: -10, bottom: 40 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="atendimentos" name="Atendimentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Row 2: Tempo de Decisão + Notas */}
            <div className="grid gap-4 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card-hover rounded-lg p-5">
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">⏱️ Tempo de Decisão</h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tempoData} margin={{ left: -10, bottom: 40 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Quantidade" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card-hover rounded-lg p-5">
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">⭐ Distribuição de Notas</h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={notaData}>
                      <XAxis dataKey="nota" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="count" name="Qtd" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 5, fill: "hsl(var(--accent))" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Row 3: Faturamento por Consultor + Objetivos */}
            <div className="grid gap-4 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card-hover rounded-lg p-5">
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">💰 Faturamento por Consultor</h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultorData} margin={{ left: 10, bottom: 40 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="faturamento" name="Faturamento" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="glass-card-hover rounded-lg p-5">
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">🎯 Objetivos dos Alunos</h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={objData} layout="vertical" margin={{ left: 30 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Quantidade" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Row 4: Bairros */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.47 }} className="glass-card-hover rounded-lg p-5">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">📍 Distribuição por Bairro (Top 10)</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bairroData} margin={{ left: 10, bottom: 50 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Clientes" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Ranking de Consultores */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card-hover rounded-lg overflow-hidden">
              <div className="p-5 pb-3">
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">📋 Ranking de Consultores</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Consultor</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold text-right">Atendimentos</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold text-right">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultorData.map((c) => (
                    <TableRow key={c.name} className="border-border/30 hover:bg-secondary/30">
                      <TableCell className="font-medium text-sm">{c.name}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{c.atendimentos}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{formatCurrency(c.faturamento)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </>
        )}
      </DashboardLayout>
    </PageTransition>
  );
};

export default AnaliseVendasPage;
