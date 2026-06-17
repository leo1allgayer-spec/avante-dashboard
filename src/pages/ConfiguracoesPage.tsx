import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageTransition from "@/components/PageTransition";
import StaggerContainer, { StaggerItem } from "@/components/StaggerAnimation";
import { motion } from "framer-motion";
import { User, Bell, Shield, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useMonthMetrics } from "@/hooks/useMetrics";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ConfiguracoesPage = () => {
  const { session, signOut } = useAuth();
  const { data: monthData } = useMonthMetrics();
  const { toast } = useToast();

  // Password change
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso!" });
      setPasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!monthData || monthData.length === 0) {
      toast({ title: "Sem dados", description: "Nenhuma métrica para exportar.", variant: "destructive" });
      return;
    }
    const headers = ["Data", "Meta Mensal Prev.", "Meta Mensal Real.", "Meta Diária Prev.", "Meta Diária Real.", "Faturamento", "Leads", "Custo/Lead", "MQL", "Custo/MQL", "CAC", "ROAS"];
    const rows = monthData.map((d) => [
      d.date, d.meta_mensal_prevista, d.meta_mensal_realizada, d.meta_diaria_prevista, d.meta_diaria_realizada,
      d.faturamento_dia, d.leads, d.custo_por_lead, d.lead_mql, d.custo_por_lead_mql, d.cac, d.roas,
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metricas_${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado!" });
  };

  const settingSections = [
    {
      icon: User,
      title: "Perfil",
      description: "Informações da conta",
      content: (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider">E-mail</Label>
            <Input value={session?.user?.email || ""} disabled className="bg-secondary/50 text-sm" />
          </div>
          <Button variant="destructive" size="sm" onClick={signOut}>Sair da Conta</Button>
        </div>
      ),
    },
    {
      icon: Bell,
      title: "Notificações",
      description: "Alertas e avisos do sistema",
      content: (
        <div className="space-y-4">
          {["Alerta de meta diária", "Resumo semanal", "Alerta de ROAS baixo", "Novos leads"].map((item) => (
            <div key={item} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{item}</span>
              <Switch defaultChecked={item !== "Resumo semanal"} />
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Shield,
      title: "Segurança",
      description: "Autenticação e acesso",
      content: (
        <div className="space-y-3">
          <Button variant="outline" size="sm" className="text-sm" onClick={() => setPasswordOpen(true)}>
            Alterar Senha
          </Button>
        </div>
      ),
    },
    {
      icon: Database,
      title: "Dados",
      description: "Exportação e backup",
      content: (
        <div className="space-y-3">
          <Button variant="outline" size="sm" className="text-sm" onClick={handleExportCSV}>
            Exportar Métricas (CSV)
          </Button>
          <p className="text-[11px] text-muted-foreground">Exporte todas as métricas do mês atual.</p>
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <DashboardLayout title="Configurações" subtitle="Preferências e ajustes do sistema">
        <StaggerContainer className="space-y-4">
          {settingSections.map((section) => (
            <StaggerItem key={section.title}>
              <motion.div whileHover={{ y: -1 }} className="glass-card-hover rounded-lg p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <section.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-sm font-semibold text-foreground">{section.title}</h3>
                    <p className="text-[11px] text-muted-foreground mb-4">{section.description}</p>
                    {section.content}
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Password Change Dialog */}
        <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Alterar Senha</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nova Senha</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confirmar Senha</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={changingPassword}>
                {changingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </PageTransition>
  );
};

export default ConfiguracoesPage;
