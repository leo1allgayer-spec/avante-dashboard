import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCreateFutureStudent } from "@/hooks/useFutureStudents";
import avanteLogo from "@/assets/logo-full.svg";

const initialForm = {
  nome: "",
  telefone: "",
  cpf: "",
  valor_sinal: "",
  observacao: "",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function parseMoney(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function FutureStudentSignupPage() {
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const createFutureStudent = useCreateFutureStudent();
  const { toast } = useToast();

  const set = (key: keyof typeof initialForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.nome.trim() || !form.telefone.trim() || !form.cpf.trim() || !form.valor_sinal.trim()) {
      toast({ title: "Campos obrigatorios", description: "Preencha nome, telefone, CPF e valor do sinal.", variant: "destructive" });
      return;
    }

    createFutureStudent.mutate(
      {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        cpf: form.cpf.trim(),
        valor_sinal: parseMoney(form.valor_sinal),
        observacao: form.observacao.trim(),
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setForm(initialForm);
        },
        onError: (error) => {
          const message = String(error.message || "");
          const isMissingTable = message.includes("alunos_futuros") && message.includes("schema cache");
          toast({
            title: "Nao foi possivel cadastrar",
            description: isMissingTable
              ? "Esta area ainda esta em previa. O banco sera ativado depois da aprovacao."
              : message || "Tente novamente em alguns instantes.",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background text-foreground dot-pattern">
        <div className="flex min-h-screen items-center justify-center bg-background/85 px-4 py-8">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-border/60 bg-card/85 p-8 text-center shadow-xl shadow-black/20">
            <img src={avanteLogo} alt="Avante Digital" className="mx-auto h-16 w-auto object-contain" />
            <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold">Cadastro recebido</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Seu sinal ficou registrado. Agora a equipe da Avante vai liberar o proximo passo.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground dot-pattern">
      <div className="flex min-h-screen items-center justify-center bg-background/85 px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg rounded-2xl border border-border/60 bg-card/85 shadow-xl shadow-black/20 backdrop-blur-lg">
          <div className="border-b border-border/50 px-6 py-6">
            <img src={avanteLogo} alt="Avante Digital" className="h-16 w-auto object-contain" />
            <p className="mt-4 text-[10px] uppercase tracking-[0.24em] text-muted-foreground/60">Cadastro de aluno</p>
            <h1 className="mt-2 font-display text-2xl font-bold">Confirmacao de sinal</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Preencha seus dados para registrar o sinal e deixar sua vaga pronta no sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Seu nome completo" className="bg-secondary/30 border-border/40" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Telefone *</Label>
                <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="51 99999-9999" className="bg-secondary/30 border-border/40" />
              </div>
              <div className="space-y-1.5">
                <Label>CPF *</Label>
                <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" className="bg-secondary/30 border-border/40" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Valor do sinal *</Label>
              <Input
                value={form.valor_sinal}
                onChange={(e) => set("valor_sinal", e.target.value)}
                onBlur={() => {
                  const value = parseMoney(form.valor_sinal);
                  if (value > 0) set("valor_sinal", currencyFormatter.format(value));
                }}
                placeholder="R$ 0,00"
                className="bg-secondary/30 border-border/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Observacao</Label>
              <Textarea value={form.observacao} onChange={(e) => set("observacao", e.target.value)} placeholder="Opcional" className="bg-secondary/30 border-border/40" />
            </div>

            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Esses dados ficam vinculados ao seu CPF para facilitar a confirmacao do curso e o formulario pos-curso.</span>
              </div>
            </div>

            <Button type="submit" className="h-12 w-full rounded-xl text-sm font-semibold" disabled={createFutureStudent.isPending}>
              {createFutureStudent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Registrar sinal
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
