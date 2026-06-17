import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import MetricCard from "@/components/MetricCard";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, type Client } from "@/hooks/useClients";
import { useMonthMetrics } from "@/hooks/useMetrics";
import { motion } from "framer-motion";
import { UserCircle, Users, UserPlus, UserCheck, Clock, Pencil, Trash2, Plus, Mail, Phone, MapPin, Instagram, Star, Target, ShieldCheck, Eye, X, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const statusColors: Record<string, string> = {
  ativo: "bg-success/15 text-success border-success/30",
  inativo: "bg-muted text-muted-foreground border-border",
  trial: "bg-primary/15 text-primary border-primary/30",
};

const emptyForm = { nome: "", status: "ativo", valor: 0, leads: 0, mql: 0, ultima_atividade: new Date().toISOString(), instagram: "", cpf: "", email: "", endereco: "", bairro: "", numero: "", celular: "", enviado: "", consultor: "", nota: 0, origem: "", tempo_decisao: "", objetivo: "", exclusividade: true };

const ClientesPage = () => {
  const { data: clients = [], isLoading } = useClients();
  const { data: monthData } = useMonthMetrics();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const filteredClients = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      c.nome.toLowerCase().includes(q) ||
      (c.cpf && c.cpf.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const totalLeads = (monthData || []).reduce((s, d) => s + Number(d.leads), 0);
  const totalMql = (monthData || []).reduce((s, d) => s + Number(d.lead_mql), 0);
  const activeClients = clients.filter((c) => c.status === "ativo").length;
  const newThisMonth = clients.filter((c) => {
    const created = new Date(c.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const openCreate = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      nome: client.nome,
      status: client.status,
      valor: client.valor,
      leads: client.leads,
      mql: client.mql,
      ultima_atividade: client.ultima_atividade,
      instagram: client.instagram || "",
      cpf: client.cpf || "",
      email: client.email || "",
      endereco: client.endereco || "",
      bairro: client.bairro || "",
      numero: client.numero || "",
      celular: client.celular || "",
      enviado: client.enviado || "",
      consultor: client.consultor || "",
      nota: client.nota || 0,
      origem: client.origem || "",
      tempo_decisao: client.tempo_decisao || "",
      objetivo: client.objetivo || "",
      exclusividade: client.exclusividade ?? true,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      updateClient.mutate(
        { id: editingClient.id, ...form },
        {
          onSuccess: () => { toast({ title: "Cliente atualizado!" }); setOpen(false); },
          onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createClient.mutate(form, {
        onSuccess: () => { toast({ title: "Cliente adicionado!" }); setOpen(false); },
        onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteClient.mutate(id, {
      onSuccess: () => toast({ title: "Cliente removido!" }),
      onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
    });
  };

  const clearField = (client: Client, field: string) => {
    const nullableFields: Record<string, any> = { email: null, celular: null, instagram: null, cpf: null, endereco: null, bairro: null, numero: null, enviado: null, consultor: null, nota: null, origem: null, tempo_decisao: null, objetivo: null, valor: 0, leads: 0, mql: 0 };
    if (!(field in nullableFields)) return;
    updateClient.mutate(
      { id: client.id, [field]: nullableFields[field] },
      {
        onSuccess: () => {
          toast({ title: `Campo "${field}" limpo!` });
          // Update local viewing client
          setViewingClient((prev) => prev ? { ...prev, [field]: nullableFields[field] } : null);
        },
        onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
      }
    );
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Hoje";
    if (days === 1) return "Ontem";
    return `${days} dias`;
  };

  return (
    <PageTransition>
      <DashboardLayout
        title="Clientes"
        subtitle="Gestão de clientes e prospecção"
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        }
      >
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><MetricCard title="Clientes Ativos" value={activeClients} icon={<UserCheck className="h-5 w-5" />} variant="success" countUp /></StaggerItem>
          <StaggerItem><MetricCard title="Novos Este Mês" value={newThisMonth} icon={<UserPlus className="h-5 w-5" />} variant="primary" countUp /></StaggerItem>
          <StaggerItem><MetricCard title="Total Leads" value={totalLeads} icon={<Users className="h-5 w-5" />} variant="accent" countUp /></StaggerItem>
          <StaggerItem><MetricCard title="MQL Gerados" value={totalMql} icon={<UserCircle className="h-5 w-5" />} countUp /></StaggerItem>
        </StaggerContainer>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card-hover rounded-lg overflow-hidden">
          <div className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base de Clientes</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome, CPF ou e-mail..."
                className="pl-9 h-9 text-sm bg-secondary/40 border-border/40"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum cliente encontrado para "{search}".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full caption-bottom text-sm min-w-[1100px]">
                <thead>
                  <tr className="border-b border-border/40 hover:bg-transparent">
                    <th className="h-12 px-4 text-left align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap min-w-[160px]">Cliente</th>
                    <th className="h-12 px-4 text-left align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">Status</th>
                    <th className="h-12 px-4 text-left align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap min-w-[180px]">E-mail</th>
                    <th className="h-12 px-4 text-left align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">CPF</th>
                    <th className="h-12 px-4 text-left align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">Instagram</th>
                    <th className="h-12 px-4 text-left align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">Celular</th>
                    <th className="h-12 px-4 text-right align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">Valor</th>
                    <th className="h-12 px-4 text-left align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap min-w-[200px]">Endereço</th>
                    <th className="h-12 px-4 text-left align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">Consultor</th>
                    <th className="h-12 px-4 text-right align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">Nota</th>
                    <th className="h-12 px-4 text-left align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">Atividade</th>
                    <th className="h-12 px-4 text-right align-middle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap sticky right-0 bg-background">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((c) => (
                    <tr key={c.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                      <td className="p-4 align-middle font-medium text-sm text-foreground whitespace-nowrap">{c.nome}</td>
                      <td className="p-4 align-middle">
                        <Badge variant="outline" className={`text-[10px] ${statusColors[c.status] || ""}`}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-xs text-muted-foreground truncate max-w-[200px]">{c.email || "—"}</td>
                      <td className="p-4 align-middle text-xs text-muted-foreground whitespace-nowrap">{c.cpf || "—"}</td>
                      <td className="p-4 align-middle text-xs text-muted-foreground whitespace-nowrap">{c.instagram || "—"}</td>
                      <td className="p-4 align-middle text-xs text-muted-foreground whitespace-nowrap">{c.celular || "—"}</td>
                      <td className="p-4 align-middle text-right text-sm tabular-nums whitespace-nowrap">{formatCurrency(c.valor)}</td>
                      <td className="p-4 align-middle text-xs text-muted-foreground truncate max-w-[220px]">{c.endereco || "—"}</td>
                      <td className="p-4 align-middle text-xs text-muted-foreground whitespace-nowrap">{c.consultor || "—"}</td>
                      <td className="p-4 align-middle text-right text-sm tabular-nums whitespace-nowrap">{c.nota ? `${c.nota} ⭐` : "—"}</td>
                      <td className="p-4 align-middle">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3 w-3" /> {timeAgo(c.ultima_atividade)}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right sticky right-0 bg-background">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingClient(c)} title="Visão Geral">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(c.id)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Create/Edit Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent px-6 pt-6 pb-4">
              <DialogHeader>
                <DialogTitle className="font-display text-lg flex items-center gap-2">
                  {editingClient ? <><Pencil className="h-4 w-4 text-primary" /> Editar Cliente</> : <><UserPlus className="h-4 w-4 text-primary" /> Novo Cliente</>}
                </DialogTitle>
                {editingClient && (
                  <p className="text-xs text-muted-foreground mt-1">Editando: <span className="font-medium text-foreground">{editingClient.nome}</span></p>
                )}
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5 max-h-[65vh] overflow-y-auto">
              {/* Seção: Dados Pessoais */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserCircle className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Dados Pessoais</span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome</Label>
                    <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required placeholder="Nome completo" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">CPF</Label>
                      <Input value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">🟢 Ativo</SelectItem>
                          <SelectItem value="inativo">⚪ Inativo</SelectItem>
                          <SelectItem value="trial">🔵 Trial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/40" />

              {/* Seção: Contato */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Contato</span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-mail</Label>
                    <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Celular</Label>
                      <Input value={form.celular} onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))} placeholder="(51) 99999-0000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Instagram className="h-3 w-3" /> Instagram</Label>
                      <Input value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="@usuario" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/40" />

              {/* Seção: Endereço */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-3.5 w-3.5 text-success" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Endereço</span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs">Endereço</Label>
                      <Input value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} placeholder="Rua, Av..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Número</Label>
                      <Input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} placeholder="Nº" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bairro</Label>
                    <Input value={form.bairro} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" />
                  </div>
                </div>
              </div>

              <Separator className="bg-border/40" />

              {/* Seção: Comercial */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Comercial</span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input type="number" step="any" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Leads</Label>
                      <Input type="number" value={form.leads} onChange={(e) => setForm((f) => ({ ...f, leads: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">MQL</Label>
                      <Input type="number" value={form.mql} onChange={(e) => setForm((f) => ({ ...f, mql: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Consultor</Label>
                      <Input value={form.consultor} onChange={(e) => setForm((f) => ({ ...f, consultor: e.target.value }))} placeholder="Nome do consultor" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Enviado</Label>
                      <Input value={form.enviado} onChange={(e) => setForm((f) => ({ ...f, enviado: e.target.value }))} placeholder="ex: enviado" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/40" />

              {/* Seção: Pesquisa */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pesquisa de Satisfação</span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nota (0-10)</Label>
                      <Input type="number" min={0} max={10} step="0.1" value={form.nota} onChange={(e) => setForm((f) => ({ ...f, nota: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Exclusividade</Label>
                      <Select value={form.exclusividade ? "sim" : "nao"} onValueChange={(v) => setForm((f) => ({ ...f, exclusividade: v === "sim" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">✅ Sim</SelectItem>
                          <SelectItem value="nao">❌ Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Origem</Label>
                      <Select value={form.origem} onValueChange={(v) => setForm((f) => ({ ...f, origem: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Anúncio nas redes">Anúncio nas redes</SelectItem>
                          <SelectItem value="Indicação de amigo">Indicação de amigo</SelectItem>
                          <SelectItem value="Instagram/TikTok">Instagram/TikTok</SelectItem>
                          <SelectItem value="Já conhecia">Já conhecia</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tempo de Decisão</Label>
                      <Select value={form.tempo_decisao} onValueChange={(v) => setForm((f) => ({ ...f, tempo_decisao: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mesmo dia">Mesmo dia</SelectItem>
                          <SelectItem value="Alguns dias">Alguns dias</SelectItem>
                          <SelectItem value="Mais de 1 semana">Mais de 1 semana</SelectItem>
                          <SelectItem value="Mais de 30 dias">Mais de 30 dias</SelectItem>
                          <SelectItem value="Mais de 60 dias">Mais de 60 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Objetivo</Label>
                    <Select value={form.objetivo} onValueChange={(v) => setForm((f) => ({ ...f, objetivo: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aplicar no meu negócio">Aplicar no meu negócio</SelectItem>
                        <SelectItem value="Aumentar vendas">Aumentar vendas</SelectItem>
                        <SelectItem value="Gestão para outras empresas">Gestão para outras empresas</SelectItem>
                        <SelectItem value="Mudar de profissão">Mudar de profissão</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={createClient.isPending || updateClient.isPending}>
                {(createClient.isPending || updateClient.isPending) ? "Salvando..." : editingClient ? "💾 Atualizar Cliente" : "➕ Adicionar Cliente"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Visão Geral Dialog */}
        <Dialog open={!!viewingClient} onOpenChange={(o) => !o && setViewingClient(null)}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent px-6 pt-6 pb-4">
              <DialogHeader>
                <DialogTitle className="font-display text-lg flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" /> Visão Geral
                </DialogTitle>
                {viewingClient && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cliente: <span className="font-medium text-foreground">{viewingClient.nome}</span>
                  </p>
                )}
              </DialogHeader>
            </div>
            {viewingClient && (
              <div className="px-6 pb-6 max-h-[65vh] overflow-y-auto space-y-4">
                {[
                  { label: "Nome", field: "nome", value: viewingClient.nome, canClear: false },
                  { label: "Status", field: "status", value: viewingClient.status, canClear: false },
                  { label: "E-mail", field: "email", value: viewingClient.email },
                  { label: "Celular", field: "celular", value: viewingClient.celular },
                  { label: "Instagram", field: "instagram", value: viewingClient.instagram },
                  { label: "CPF", field: "cpf", value: viewingClient.cpf },
                  { label: "Endereço", field: "endereco", value: viewingClient.endereco },
                  { label: "Número", field: "numero", value: viewingClient.numero },
                  { label: "Bairro", field: "bairro", value: viewingClient.bairro },
                  { label: "Valor", field: "valor", value: viewingClient.valor ? formatCurrency(viewingClient.valor) : null },
                  { label: "Leads", field: "leads", value: viewingClient.leads },
                  { label: "MQL", field: "mql", value: viewingClient.mql },
                  { label: "Consultor", field: "consultor", value: viewingClient.consultor },
                  { label: "Enviado", field: "enviado", value: viewingClient.enviado },
                  { label: "Nota", field: "nota", value: viewingClient.nota },
                  { label: "Origem", field: "origem", value: viewingClient.origem },
                  { label: "Tempo de Decisão", field: "tempo_decisao", value: viewingClient.tempo_decisao },
                  { label: "Objetivo", field: "objetivo", value: viewingClient.objetivo },
                  { label: "Exclusividade", field: "exclusividade", value: viewingClient.exclusividade ? "Sim" : "Não", canClear: false },
                  { label: "Última Atividade", field: "ultima_atividade", value: viewingClient.ultima_atividade ? timeAgo(viewingClient.ultima_atividade) : null, canClear: false },
                ].map(({ label, field, value, canClear = true }) => (
                  <div key={field} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
                      <p className="text-sm text-foreground truncate">{value || <span className="text-muted-foreground italic">—</span>}</p>
                    </div>
                    {canClear && value && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0 ml-2" title={`Apagar ${label}`}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar "{label}"?</AlertDialogTitle>
                            <AlertDialogDescription>O valor deste campo será removido.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => clearField(viewingClient, field)}>Apagar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}

                <Separator className="bg-border/40" />

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => { setViewingClient(null); openEdit(viewingClient); }}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="flex-1 gap-2">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir Cliente
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os dados serão removidos.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { handleDelete(viewingClient.id); setViewingClient(null); }}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </PageTransition>
  );
};

export default ClientesPage;
