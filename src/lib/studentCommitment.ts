import { jsPDF } from "jspdf";

export const STUDENT_COMMITMENT_VERSION = "2026-11-24-v1";

export const STUDENT_COMMITMENT_TITLE = "TERMO DE COMPROMISSO E RESERVA DE VAGA";

export const STUDENT_COMMITMENT_TEXT = `${STUDENT_COMMITMENT_TITLE}

Ao realizar meu cadastro, declaro estar ciente de que os treinamentos presenciais da Avante Digital possuem vagas limitadas e exigem planejamento prévio de professores, equipe e estrutura.

Reserva da vaga: o valor pago como sinal será integralmente abatido do valor total do treinamento contratado, quando realizado.

Compromisso de comparecimento: comprometo-me a comparecer ao treinamento na data e horário previamente acordados. Caso não seja possível comparecer, deverei comunicar a Avante Digital com, no mínimo, 24 horas de antecedência.

Primeiro não comparecimento: será disponibilizada uma oportunidade de reagendamento sem custo adicional, conforme disponibilidade e mediante confirmação da nova data pelo aluno.

Segundo não comparecimento: caso eu não compareça injustificadamente em duas datas previamente acordadas, minha reserva poderá ser encerrada, com retenção proporcional do valor do sinal, observados os prejuízos decorrentes da reserva e a legislação aplicável. Uma nova reserva poderá exigir o pagamento de um novo sinal.

Situações excepcionais: emergências, situações de força maior e demais imprevistos justificados serão analisados individualmente, inclusive quando não for possível respeitar o prazo de 24 horas.

Direitos do consumidor: permanecem assegurados o direito de arrependimento, quando aplicável, e todos os demais direitos previstos no Código de Defesa do Consumidor.`;

export const STUDENT_COMMITMENT_ACCEPTANCE = "Declaro que li, compreendi e concordo com os termos de compromisso e reserva de vaga, assumindo o compromisso de comparecer ao treinamento na data acordada.";

export type CommitmentAcceptance = {
  id: string;
  student_id: string;
  student_name: string;
  student_cpf: string;
  student_phone: string;
  student_identity: Record<string, string | null>;
  accepted_at: string;
  term_version: string;
  term_content: string;
  content_sha256: string;
  course_name: string;
  course_date: string | null;
  course_shift: string | null;
  signal_value: number | null;
  accepted: boolean;
  acceptance_text: string;
};

export function downloadCommitmentPdf(input: {
  studentName: string;
  cpf: string;
  phone: string;
  email?: string;
  courseName: string;
  signalValue?: number | null;
  acceptance: CommitmentAcceptance;
}) {
  const { acceptance } = input;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text("Avante Digital", margin, y);
  y += 10;
  pdf.setFontSize(12);
  pdf.text(STUDENT_COMMITMENT_TITLE, margin, y);
  y += 9;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const fields = [
    `Documento: ${acceptance.id}`,
    `Aluno: ${input.studentName}`,
    `CPF: ${input.cpf}`,
    `Telefone: ${input.phone}`,
    ...(input.email || acceptance.student_identity.email ? [`E-mail: ${input.email || acceptance.student_identity.email}`] : []),
    ...(acceptance.student_identity.data_nascimento ? [`Data de nascimento: ${formatBrazilDate(acceptance.student_identity.data_nascimento)}`] : []),
    ...(acceptance.student_identity.instagram ? [`Instagram: ${acceptance.student_identity.instagram}`] : []),
    ...(acceptance.student_identity.cep ? [`CEP: ${acceptance.student_identity.cep}`] : []),
    ...(acceptance.student_identity.cidade ? [`Cidade: ${acceptance.student_identity.cidade}`] : []),
    ...(acceptance.student_identity.endereco ? [`Endereço: ${acceptance.student_identity.endereco}`] : []),
    ...(acceptance.student_identity.nome_certificado ? [`Nome para certificado: ${acceptance.student_identity.nome_certificado}`] : []),
    `Treinamento: ${input.courseName}`,
    `Data acordada: ${acceptance.course_date ? `${formatBrazilDate(acceptance.course_date)}${acceptance.course_shift ? ` — ${acceptance.course_shift}` : ""}` : "A definir"}`,
    `Sinal registrado: ${formatCurrency(input.signalValue ?? acceptance.signal_value)}`,
    `Aceite registrado em: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(acceptance.accepted_at))}`,
    `Versão do termo: ${acceptance.term_version}`,
    `SHA-256 do termo: ${acceptance.content_sha256}`,
  ];
  fields.forEach((field) => {
    const lines = pdf.splitTextToSize(field, contentWidth);
    if (y + lines.length * 4.5 > 278) { pdf.addPage(); y = 20; }
    pdf.text(lines, margin, y);
    y += lines.length * 4.5;
  });

  y += 4;
  const paragraphs = acceptance.term_content.split(/\n\s*\n/).filter(Boolean);
  paragraphs.forEach((paragraph) => {
    pdf.setFont("helvetica", paragraph.startsWith("Segundo não comparecimento:") || paragraph.startsWith("Compromisso de comparecimento:") ? "bold" : "normal");
    const lines = pdf.splitTextToSize(paragraph, contentWidth);
    const height = lines.length * 4.6 + 3;
    if (y + height > 278) { pdf.addPage(); y = 20; }
    pdf.text(lines, margin, y);
    y += height;
  });

  y += 3;
  pdf.setFont("helvetica", "bold");
  pdf.text("Declaração expressa de aceite", margin, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  const acceptanceLines = pdf.splitTextToSize(acceptance.acceptance_text, contentWidth);
  if (y + acceptanceLines.length * 4.6 > 278) { pdf.addPage(); y = 20; }
  pdf.text(acceptanceLines, margin, y);

  pdf.save(`termo-compromisso-${acceptance.id}.pdf`);
}

export function formatBrazilDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}
