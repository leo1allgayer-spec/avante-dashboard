import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { supabaseClients } from "@/integrations/supabase/clientsClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logoFull from "@/assets/logo-full.svg";
import PageTransition from "@/components/PageTransition";

const PRODUCTION_APP_URL = "https://dashboard-avante.pages.dev";

const getPasswordResetRedirectUrl = () => {
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const origin = isLocal ? window.location.origin : PRODUCTION_APP_URL;
  return `${origin}/reset-password`;
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Informe seu e-mail", description: "Digite o e-mail no campo acima para receber o link.", variant: "destructive" });
      return;
    }
    setResetting(true);
    const redirectTo = getPasswordResetRedirectUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setResetting(false);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada e use o link novo enviado pelo dashboard atual.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({
          title: "Erro de Entrada",
          description: error.message,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Login concluido!",
        description: "Sessao iniciada com sucesso.",
      });

      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    } else {
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Cadastro realizado!", description: "Verifique seu e-mail para confirmar." });
      }
    }
    setLoading(false);
  };

  return (
    <PageTransition>
      <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md space-y-8 relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex flex-col items-center gap-4"
          >
            <img src={logoFull} alt="Avante Digital" className="h-32 object-contain drop-shadow-2xl" />
            <AnimatePresence mode="wait">
              <motion.h1
                key={isLogin ? "login" : "signup"}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="font-display text-2xl font-bold text-foreground"
              >
                {isLogin ? "Entrar no Dashboard" : "Criar Conta"}
              </motion.h1>
            </AnimatePresence>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="glass-card rounded-2xl p-8 space-y-5 shadow-2xl shadow-primary/5"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:border-accent transition-all duration-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:border-accent transition-all duration-300"
              />
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full h-12 rounded-xl text-sm font-semibold" disabled={loading}>
                {loading ? (
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    Carregando...
                  </motion.span>
                ) : isLogin ? "Entrar" : "Cadastrar"}
              </Button>
            </motion.div>
            {isLogin && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetting}
                className="w-full text-center text-xs text-muted-foreground hover:text-accent transition-colors duration-300"
              >
                {resetting ? "Enviando..." : "Esqueci minha senha"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center text-sm text-muted-foreground hover:text-accent transition-colors duration-300"
            >
              {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
            </button>
          </motion.form>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Auth;
