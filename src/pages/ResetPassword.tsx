import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logoFull from "@/assets/logo-full.svg";
import PageTransition from "@/components/PageTransition";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase recovery link sets a session via the URL hash automatically.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        toast({
          title: "Link inválido ou expirado",
          description: "Solicite um novo link de redefinição de senha.",
          variant: "destructive",
        });
      }
    });
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha redefinida!", description: "Faça login com sua nova senha." });
      await supabase.auth.signOut();
      navigate("/auth");
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-md space-y-8 relative z-10"
        >
          <div className="flex flex-col items-center gap-4">
            <img src={logoFull} alt="Avante Digital" className="h-32 object-contain" />
            <h1 className="font-display text-2xl font-bold text-foreground">Redefinir Senha</h1>
          </div>
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-5 shadow-2xl">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Nova Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={!ready}
                className="h-12 rounded-xl bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Confirmar Senha</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                disabled={!ready}
                className="h-12 rounded-xl bg-secondary/50 border-border/50"
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl text-sm font-semibold" disabled={loading || !ready}>
              {loading ? "Salvando..." : "Redefinir Senha"}
            </Button>
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="w-full text-center text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              Voltar ao login
            </button>
          </form>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default ResetPassword;
