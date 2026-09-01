import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatLocalDate } from "@/hooks/useMetrics";

const STEPS = ["Sobre Você", "Jornada de Compra", "Atendimento"];

const COMO_CONHECEU = [
  "Vi um anúncio nas redes sociais",
  "Um amigo me indicou",
  "Já conhecia a escola",
  "Vi no Instagram ou TikTok",
  "Outro",
];

const TEMPO_FECHAR = [
  "Fechei no mesmo dia",
  "Levei alguns dias pra decidir",
  "Pensei por mais de uma semana",
  "Pensei por mais de 30 dias",
  "Pensei por mais de 60 dias",
  "Não lembro",
];

const OBJETIVO = [
  "Aprender pra aplicar no meu negócio",
  "Mudar de profissão / começar na área",
  "Aumentar minhas vendas",
  "Trabalhar com gestão de tráfego pra outras empresas",
  "Outro",
];

const TEMPO_ATENDIMENTO = [
  "Em menos de 5 minutos",
  "Entre 5 e 15 minutos",
  "Mais de 15 minutos",
  "Não lembro",
];

const ATENDIMENTO_RAPIDO = [
  "Sim, foi bem rápido",
  "Foi razoável",
  "Poderia ter sido mais ágil",
];

const FORMA_ATENDIMENTO = [
  "Sim, gostei",
  "Tanto faz",
  "Prefiro só texto",
  "Prefiro só áudio",
];

const VALOR_CURSO = ["Muito caro", "Preço justo", "Muito barato"];
const COMMUNITY_GROUP_URL = "https://chat.whatsapp.com/Dv3za8lv0gz1QfU4wgPRj9?s=cl&p=a&ilr=1&amv=2";

const CURSOS_REALIZADOS = [
  "Curso de Meta Ads",
  "Curso de Google Ads",
  "Curso de Social Media",
  "Curso de Inteligência Artificial",
  "Curso Canva para Empreendedores",
  "Curso de Edição e Captação de Vídeos",
];

type FormData = {
  como_conheceu: string;
  tempo_para_fechar: string;
  conversou_outras_escolas: string;
  objetivo_principal: string;
  segmento: string;
  fator_determinante: string;
  dor_principal: string;
  consultor: string;
  tempo_atendimento: string;
  atendimento_rapido: string;
  nota_whatsapp: number;
  nota_curso: number;
  forma_atendimento: string;
  motivacao_fechar: string;
  valor_curso_opiniao: string;
  sugestao_atendimento: string;
  indicaria_alguem: string;
  nota_indicacao: number;
  nome: string;
  cpf: string;
  data_nascimento: string;
  cep: string;
  cidade: string;
  email: string;
  instagram: string;
  endereco: string;
  whatsapp: string;
  data_curso: string;
  curso_realizado: string;
};

const initialForm: FormData = {
  como_conheceu: "",
  tempo_para_fechar: "",
  conversou_outras_escolas: "",
  objetivo_principal: "",
  segmento: "",
  fator_determinante: "",
  dor_principal: "",
  consultor: "",
  tempo_atendimento: "",
  atendimento_rapido: "",
  nota_whatsapp: 8,
  nota_curso: 8,
  forma_atendimento: "",
  motivacao_fechar: "",
  valor_curso_opiniao: "",
  sugestao_atendimento: "",
  indicaria_alguem: "",
  nota_indicacao: 8,
  nome: "",
  cpf: "",
  data_nascimento: "",
  cep: "",
  cidade: "",
  email: "",
  instagram: "",
  endereco: "",
  whatsapp: "",
  data_curso: formatLocalDate(new Date()),
  curso_realizado: "",
};

const RadioGroup = ({ options, value, onChange, name }: { options: string[]; value: string; onChange: (v: string) => void; name: string }) => (
  <div className="space-y-2">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        name={name}
        onClick={() => onChange(opt)}
        className={`flex w-full items-center gap-3 p-3 rounded-xl border cursor-pointer text-left transition-all ${value === opt ? "border-accent bg-accent/10 text-foreground" : "border-border/40 bg-secondary/30 text-muted-foreground hover:border-border"}`}
      >
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${value === opt ? "border-accent" : "border-muted-foreground/40"}`}>
          {value === opt && <div className="w-2 h-2 rounded-full bg-accent" />}
        </div>
        <span className="text-sm">{opt}</span>
      </button>
    ))}
  </div>
);

const SliderScore = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
  <div>
    <div className="flex justify-between mb-2">
      <span className="text-xs text-muted-foreground">Ruim</span>
      <span className="text-xs text-muted-foreground">Excelente</span>
    </div>
    <div className="flex gap-1.5">
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`flex-1 h-10 rounded-lg text-xs font-semibold transition-all ${value === i ? "bg-accent text-accent-foreground scale-110 shadow-lg" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}
        >
          {i}
        </button>
      ))}
    </div>
  </div>
);

const PesquisaPage = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCpf, setLoadingCpf] = useState(false);
  const [cpfLookupMessage, setCpfLookupMessage] = useState("");
  const { toast } = useToast();

  const set = (key: keyof FormData, val: string | number) => setForm((p) => ({ ...p, [key]: val }));

  const handleCpfChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    const formatted = digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    set("cpf", formatted);
    setCpfLookupMessage("");
    if (digits.length === 11) void lookupStudentByCpf(formatted);
  };

  const lookupStudentByCpf = async (cpf: string) => {
    setLoadingCpf(true);
    try {
      const { data, error } = await supabase.functions.invoke("future-student-lookup", { body: { cpf } });
      if (error) throw error;
      const registration = data as any;
      if (!registration?.found) {
        setCpfLookupMessage("Cadastro anterior ao novo sistema. Continue preenchendo os dados manualmente; seu agendamento será reconhecido pelo nome, curso, data, e-mail ou telefone.");
        return;
      }
      setForm((current) => ({
        ...current,
        cpf,
        nome: registration.name || current.nome,
        data_nascimento: registration.birthDate || current.data_nascimento,
        whatsapp: registration.phone || current.whatsapp,
        cep: registration.cep || current.cep,
        cidade: registration.city || current.cidade,
        email: registration.email || current.email,
        instagram: registration.instagram || current.instagram,
        endereco: registration.address || current.endereco,
        curso_realizado: registration.cursoRealizado || registration.course || current.curso_realizado,
        data_curso: formatLocalDate(new Date()),
      }));
      setCpfLookupMessage("Cadastro encontrado. Conferimos e preenchemos seus dados automaticamente.");
    } catch {
      setCpfLookupMessage("Não foi possível consultar agora. Você pode preencher os dados manualmente.");
    } finally {
      setLoadingCpf(false);
    }
  };

  const handleCepChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    set("cep", formatted);
  };

  const lookupCep = async () => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error("Não foi possível consultar o CEP");
      const address = await response.json();
      if (address.erro) {
        toast({ title: "CEP não encontrado", description: "Confira o CEP ou preencha o endereço manualmente.", variant: "destructive" });
        return;
      }

      const streetAndDistrict = [address.logradouro, address.bairro].filter(Boolean).join(", ");
      const endereco = [streetAndDistrict, address.uf].filter(Boolean).join(" - ");
      setForm((previous) => ({
        ...previous,
        cep: address.cep || previous.cep,
        cidade: address.localidade || previous.cidade,
        endereco: endereco || previous.endereco,
      }));
    } catch (error) {
      toast({
        title: "Não foi possível buscar o CEP",
        description: "Você ainda pode preencher cidade e endereço manualmente.",
        variant: "destructive",
      });
    } finally {
      setLoadingCep(false);
    }
  };


  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.nome.trim()) return "Preencha seu nome completo";
      if (!form.cpf.trim()) return "Preencha seu CPF";
      if (!form.data_nascimento) return "Preencha sua data de nascimento";
      if (!form.cep.trim()) return "Preencha seu CEP";
      if (!form.cidade.trim()) return "Preencha sua cidade";
      if (!form.email.trim()) return "Preencha seu e-mail";
      if (!form.endereco.trim()) return "Preencha seu endereço";
      if (!form.whatsapp.trim()) return "Preencha seu WhatsApp";
      if (!form.curso_realizado) return "Selecione o curso que voce fez";
    }
    if (s === 1) {
      if (!form.como_conheceu) return "Selecione como conheceu a Avante";
      if (!form.tempo_para_fechar) return "Selecione o tempo para fechar";
      if (!form.conversou_outras_escolas) return "Informe se conversou com outras escolas";
      if (!form.objetivo_principal) return "Selecione seu objetivo principal";
      if (!form.segmento.trim()) return "Preencha seu segmento";
      if (!form.fator_determinante.trim()) return "Preencha o fator determinante";
    }
    if (s === 2) {
      if (!form.tempo_atendimento) return "Selecione o tempo de atendimento";
      if (!form.atendimento_rapido) return "Selecione se o atendimento foi rápido";
      if (!form.forma_atendimento) return "Selecione sobre a forma de atendimento";
      if (!form.motivacao_fechar.trim()) return "Preencha o que te motivou a fechar";
      if (!form.valor_curso_opiniao) return "Selecione sua opinião sobre o valor";
      if (!form.indicaria_alguem) return "Informe se indicaria alguém";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      toast({ title: "Campo obrigatório", description: err, variant: "destructive" });
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    const err = validateStep(step);
    if (err) {
      toast({ title: "Campo obrigatório", description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("survey_responses").insert({
        nome: form.nome,
        cpf: form.cpf || null,
        data_nascimento: form.data_nascimento || null,
        cep: form.cep || null,
        cidade: form.cidade || null,
        email: form.email || null,
        instagram: form.instagram || null,
        endereco: form.endereco || null,
        whatsapp: form.whatsapp || null,
        data_curso: form.data_curso || null,
        curso_realizado: form.curso_realizado || null,
        como_conheceu: form.como_conheceu || null,
        tempo_para_fechar: form.tempo_para_fechar || null,
        conversou_outras_escolas: form.conversou_outras_escolas || null,
        objetivo_principal: form.objetivo_principal || null,
        segmento: form.segmento || null,
        fator_determinante: form.fator_determinante || null,
        dor_principal: form.dor_principal || null,
        consultor: null,
        tempo_atendimento: form.tempo_atendimento || null,
        atendimento_rapido: form.atendimento_rapido || null,
        nota_whatsapp: form.nota_whatsapp,
        nota_curso: form.nota_curso,
        forma_atendimento: form.forma_atendimento || null,
        motivacao_fechar: form.motivacao_fechar || null,
        valor_curso_opiniao: form.valor_curso_opiniao || null,
        sugestao_atendimento: form.sugestao_atendimento || null,
        indicaria_alguem: form.indicaria_alguem || null,
        nota_indicacao: form.nota_indicacao,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      const message = String(err?.message || "");
      const description = message.includes("row-level security")
        ? "O envio do formulário ainda não está liberado no banco de dados. Avise a equipe da Avante."
        : message || "Tente novamente em alguns instantes.";
      toast({ title: "Erro ao enviar", description, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div translate="no" className="notranslate min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-accent" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Obrigado!</h1>
          <p className="text-muted-foreground">Sua resposta foi enviada com sucesso. Agradecemos seu feedback! 💜</p>
          <Button asChild className="w-full h-12 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/25">
            <a href={COMMUNITY_GROUP_URL} target="_blank" rel="noopener noreferrer">
              Entrar no grupo da comunidade
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div translate="no" className="notranslate min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="font-display text-lg font-bold text-foreground">Pesquisa Avante Digital</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Sua opinião nos ajuda a melhorar</p>
          {/* Progress */}
          <div className="flex gap-2 mt-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-accent" : "bg-secondary/60"}`} />
                <p className={`text-[10px] mt-1 ${i === step ? "text-accent font-medium" : "text-muted-foreground/50"}`}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {step === 0 && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">Informações para matrícula</p>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">CPF *</Label>
                <div className="relative">
                  <Input value={form.cpf} onChange={(e) => handleCpfChange(e.target.value)} inputMode="numeric" maxLength={14} placeholder="000.000.000-00" className="bg-secondary/30 border-border/40 pr-9" />
                  {loadingCpf && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
                </div>
              </div>
              {cpfLookupMessage && <p className="-mt-3 text-xs text-muted-foreground">{cpfLookupMessage}</p>}
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">Nome completo *</Label>
                <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} className="bg-secondary/30 border-border/40" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">Data de nascimento *</Label>
                <Input type="date" value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} max={formatLocalDate(new Date())} className="bg-secondary/30 border-border/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold text-foreground mb-1.5 block">CEP *</Label>
                  <div className="relative">
                    <Input value={form.cep} onChange={(e) => handleCepChange(e.target.value)} onBlur={lookupCep} inputMode="numeric" maxLength={9} placeholder="66000-000" className="bg-secondary/30 border-border/40 pr-9" />
                    {loadingCep && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-foreground mb-1.5 block">Cidade *</Label>
                  <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} className="bg-secondary/30 border-border/40" />
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">E-mail *</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="bg-secondary/30 border-border/40" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">Instagram (pessoal)</Label>
                <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@avante.digital" className="bg-secondary/30 border-border/40" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">Endereço completo *</Label>
                <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, bairro, número e complemento" className="bg-secondary/30 border-border/40" />
                <p className="mt-1 text-xs text-muted-foreground">A rua e o bairro são preenchidos pelo CEP. Informe o número e o complemento.</p>
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">WhatsApp para contato *</Label>
                <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="55 91 99999-9999" className="bg-secondary/30 border-border/40" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">Data do preenchimento</Label>
                <Input type="date" value={form.data_curso} readOnly className="bg-secondary/20 border-border/40 text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">Preenchida automaticamente com a data de hoje.</p>
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-1.5 block">Qual curso voce esta fazendo? *</Label>
                <Select value={form.curso_realizado} onValueChange={(v) => set("curso_realizado", v)}>
                  <SelectTrigger className="bg-secondary/30 border-border/40">
                    <SelectValue placeholder="Selecione o curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURSOS_REALIZADOS.map((curso) => (
                      <SelectItem key={curso} value={curso}>{curso}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Como você conheceu a Avante? *</Label>
                <RadioGroup options={COMO_CONHECEU} value={form.como_conheceu} onChange={(v) => set("como_conheceu", v)} name="como_conheceu" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Quanto tempo levou entre o primeiro contato e fechar o curso? *</Label>
                <RadioGroup options={TEMPO_FECHAR} value={form.tempo_para_fechar} onChange={(v) => set("tempo_para_fechar", v)} name="tempo_fechar" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Você conversou com outras escolas antes de decidir pela Avante? *</Label>
                <RadioGroup options={["Sim", "Não"]} value={form.conversou_outras_escolas} onChange={(v) => set("conversou_outras_escolas", v)} name="outras_escolas" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Qual era o seu principal objetivo ao buscar o curso? *</Label>
                <RadioGroup options={OBJETIVO} value={form.objetivo_principal} onChange={(v) => set("objetivo_principal", v)} name="objetivo" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Qual seu segmento? *</Label>
                <Input value={form.segmento} onChange={(e) => set("segmento", e.target.value)} placeholder="Ex.: Restaurante, Loja de roupas..." className="bg-secondary/30 border-border/40" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Qual foi o fator determinante para você fechar com a Avante? *</Label>
                <Textarea value={form.fator_determinante} onChange={(e) => set("fator_determinante", e.target.value)} placeholder="O que te convenceu?" className="bg-secondary/30 border-border/40" rows={3} />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Qual foi a sua principal dificuldade ou dor antes de procurar o curso?</Label>
                <Textarea value={form.dor_principal} onChange={(e) => set("dor_principal", e.target.value)} placeholder="O que você queria resolver?" className="bg-secondary/30 border-border/40" rows={3} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Em quanto tempo você foi atendido(a) após o primeiro contato? *</Label>
                <RadioGroup options={TEMPO_ATENDIMENTO} value={form.tempo_atendimento} onChange={(v) => set("tempo_atendimento", v)} name="tempo_atendimento" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Você considera que o atendimento foi rápido? *</Label>
                <RadioGroup options={ATENDIMENTO_RAPIDO} value={form.atendimento_rapido} onChange={(v) => set("atendimento_rapido", v)} name="atendimento_rapido" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">De 0 a 10, quanto você gostou do atendimento no WhatsApp? *</Label>
                <SliderScore value={form.nota_whatsapp} onChange={(v) => set("nota_whatsapp", v)} label="Nota WhatsApp" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">De 0 a 10, qual nota voce da para o curso? *</Label>
                <SliderScore value={form.nota_curso} onChange={(v) => set("nota_curso", v)} label="Nota Curso" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Nosso atendimento é feito com áudios e textos. Gostou dessa forma? *</Label>
                <RadioGroup options={FORMA_ATENDIMENTO} value={form.forma_atendimento} onChange={(v) => set("forma_atendimento", v)} name="forma_atendimento" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">O que mais te motivou a fechar o curso conosco? *</Label>
                <Textarea value={form.motivacao_fechar} onChange={(e) => set("motivacao_fechar", e.target.value)} placeholder="Conte pra gente" className="bg-secondary/30 border-border/40" rows={3} />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">O que achou sobre o valor do curso pelo que é entregue? *</Label>
                <RadioGroup options={VALOR_CURSO} value={form.valor_curso_opiniao} onChange={(v) => set("valor_curso_opiniao", v)} name="valor_curso" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">De 0 a 10, o quanto você indicaria a Avante para um amigo?</Label>
                <SliderScore value={form.nota_indicacao} onChange={(v) => set("nota_indicacao", v)} label="NPS" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Sugestão para melhorarmos nosso atendimento</Label>
                <Textarea value={form.sugestao_atendimento} onChange={(e) => set("sugestao_atendimento", e.target.value)} placeholder="Opcional" className="bg-secondary/30 border-border/40" rows={3} />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground mb-2 block">Você conhece alguém que indicaria este curso? *</Label>
                <RadioGroup options={["Sim", "Não"]} value={form.indicaria_alguem} onChange={(v) => set("indicaria_alguem", v)} name="indicaria" />
              </div>
            </div>
          )}
      </div>

      {/* Footer nav */}
      <div className="border-t border-border/40 bg-card/50 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PesquisaPage;
