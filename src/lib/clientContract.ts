import { jsPDF } from "jspdf";

export const contractDefaults = {
  providerName: "WEBSTER E HOPPE LTDA",
  providerCnpj: "54.488.348/0001-07",
  providerAddress: "Av. Feitora, nº 2300, Pinheiro, São Leopoldo/RS, CEP 93.120-160",
  providerRepresentative: "Luana Nadine Pinto Hoppe",
  signingCity: "São Leopoldo/RS",
  signingDate: "",
  paymentSchedule: "",
  standardTerms: `CLÁUSULA QUARTA - DAS OBRIGAÇÕES DA CONTRATADA
4.1. Realizar os serviços com zelo, diligência e técnica adequadas, buscando o cumprimento dos objetivos estabelecidos com a CONTRATANTE.
4.2. Manter a CONTRATANTE informada sobre o andamento dos trabalhos por meio de relatórios e comunicação contínua.
4.3. Proteger e manter a confidencialidade das informações da CONTRATANTE a que tiver acesso.

CLÁUSULA QUINTA - DAS OBRIGAÇÕES DA CONTRATANTE
5.1. Fornecer as informações, acessos e materiais necessários à execução dos serviços nos prazos solicitados pela CONTRATADA.
5.2. Efetuar os pagamentos nos prazos e valores estipulados na Cláusula Terceira.
5.3. Aprovar ou solicitar revisões nos planos e materiais apresentados em tempo hábil para não prejudicar o cronograma.

CLÁUSULA SEXTA - DA CONFIDENCIALIDADE
6.1. As partes comprometem-se a manter sob sigilo as informações comerciais, financeiras, estratégicas e técnicas obtidas em razão deste contrato, utilizando-as exclusivamente para a execução dos serviços.
6.2. A obrigação de confidencialidade permanecerá em vigor após o término ou rescisão do contrato.

CLÁUSULA SÉTIMA - DA PROPRIEDADE INTELECTUAL
7.1. As configurações de campanhas e estruturas criadas nas contas de anúncios da CONTRATANTE serão de sua propriedade após a quitação integral dos valores devidos.
7.2. A CONTRATADA utilizará ferramentas licenciadas ou de acesso público, não sendo responsável por violações de direitos de terceiros decorrentes de materiais fornecidos pela CONTRATANTE.

CLÁUSULA OITAVA - DA INDEPENDÊNCIA DAS PARTES
8.1. Este contrato caracteriza prestação de serviços, sem vínculo empregatício, societário ou de representação comercial entre as partes.
8.2. Cada parte responde pelas obrigações fiscais, trabalhistas, previdenciárias e civis decorrentes de suas atividades.

CLÁUSULA NONA - DA RESCISÃO
9.1. O contrato poderá ser rescindido por acordo mútuo, por descumprimento contratual não sanado após notificação com prazo de 15 dias, ou por iniciativa imotivada mediante aviso prévio de 30 dias.
9.2. Na rescisão imotivada pela CONTRATANTE antes do término do prazo, serão devidos os valores proporcionais aos serviços prestados e multa compensatória de 20% sobre o saldo dos serviços não executados. Eventuais pagamentos antecipados serão considerados na apuração do saldo.
9.3. Na rescisão por culpa exclusiva da CONTRATADA, serão restituídos os valores antecipados relativos a serviços não executados, sem incidência de multa.
9.4. Permanecem válidas as obrigações vencidas e aquelas que, por sua natureza, devam subsistir ao encerramento.

CLÁUSULA DÉCIMA - DO FORO
10.1. Fica eleito o Foro da Comarca de São Leopoldo/RS para dirimir dúvidas ou litígios decorrentes deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.`,
};

export type ContractSettings = typeof contractDefaults;
export interface ContractInput extends ContractSettings {
  personType: "PF" | "PJ";
  responsibleName: string; cpf: string; rg: string; rgIssuer: string;
  nationality: string; maritalStatus: string; profession: string;
  companyName: string; cnpj: string; address: string; cep?: string; email: string; phone: string;
  contractObject: string; contractValue: string; billingType: string;
  installments: string; paymentMethod: string; paymentDetails: string;
  contractTerm: string; serviceStartDate: string; deliveryTerms: string; specialClauses: string;
}

export function parseContractValue(value: string): number {
  const clean = value.replace(/R\$/g, "").replace(/\s/g, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(clean) && !/^\d+\.\d{1,2}$/.test(clean)) return NaN;
  return Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(?:\.\d{3})+$/.test(clean) ? clean.replace(/\./g, "") : clean);
}

const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
export function contractMissingFields(d: ContractInput): string[] {
  const required: Array<[keyof ContractInput, string]> = [
    ["responsibleName", "Nome do responsável"], ["cpf", "CPF"], ["address", "Endereço"],
    ["email", "E-mail"], ["phone", "Telefone"], ["contractObject", "Serviços contratados"],
    ["billingType", "Forma de cobrança"], ["paymentMethod", "Forma de pagamento"],
    ["paymentSchedule", "Valores e vencimentos do pagamento"], ["contractTerm", "Prazo do contrato"],
    ["serviceStartDate", "Início do serviço"], ["providerName", "Razão social da contratada"],
    ["providerCnpj", "CNPJ da contratada"], ["providerAddress", "Endereço da contratada"],
    ["providerRepresentative", "Representante da contratada"], ["signingCity", "Local da assinatura"],
    ["signingDate", "Data da assinatura"], ["standardTerms", "Cláusulas gerais"],
  ];
  if (d.personType === "PJ") required.push(["companyName", "Razão social do cliente"], ["cnpj", "CNPJ do cliente"]);
  const missing = required.filter(([key]) => !d[key]?.trim()).map(([, label]) => label);
  if (d.cpf && d.cpf.replace(/\D/g, "").length !== 11) missing.push("CPF com 11 dígitos");
  if (d.personType === "PJ" && d.cnpj && d.cnpj.replace(/\D/g, "").length !== 14) missing.push("CNPJ do cliente com 14 dígitos");
  if (d.providerCnpj && d.providerCnpj.replace(/\D/g, "").length !== 14) missing.push("CNPJ da contratada com 14 dígitos");
  if (!(parseContractValue(d.contractValue) > 0)) missing.push("Valor total válido e maior que zero");
  for (const key of ["serviceStartDate", "signingDate"] as const) {
    if (d[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(d[key]) || Number.isNaN(Date.parse(d[key])))) missing.push(key === "signingDate" ? "Data de assinatura válida" : "Data de início válida");
  }
  return missing;
}

export function buildContractText(d: ContractInput): string {
  const identity = [d.responsibleName, d.nationality, d.maritalStatus, d.profession,
    `CPF nº ${d.cpf}`, d.rg ? `RG nº ${d.rg}${d.rgIssuer ? ` - ${d.rgIssuer}` : ""}` : ""].filter(Boolean).join(", ");
  const client = d.personType === "PJ"
    ? `${d.companyName}, pessoa jurídica de direito privado, inscrita no CNPJ nº ${d.cnpj}, com sede em ${d.address}${d.cep ? `, CEP ${d.cep}` : ""}, representada por ${identity}`
    : `${identity}, residente e domiciliado(a) em ${d.address}${d.cep ? `, CEP ${d.cep}` : ""}`;
  const value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseContractValue(d.contractValue));
  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Pelo presente instrumento particular, as partes:

CONTRATANTE: ${client}. E-mail: ${d.email}. Telefone: ${d.phone}.

CONTRATADA: ${d.providerName}, pessoa jurídica de direito privado, inscrita no CNPJ nº ${d.providerCnpj}, com sede em ${d.providerAddress}, representada por ${d.providerRepresentative}.

As partes acima qualificadas ajustam a prestação dos serviços mediante as cláusulas e condições seguintes:

CLÁUSULA PRIMEIRA - DO OBJETO
1.1. A CONTRATADA prestará à CONTRATANTE os seguintes serviços:
${d.contractObject.trim()}
${d.deliveryTerms.trim() ? `\n1.2. Prazos e condições de entrega: ${d.deliveryTerms.trim()}\n` : ""}
CLÁUSULA SEGUNDA - DO PRAZO
2.1. O contrato terá duração de ${d.contractTerm}, com início em ${dateLabel(d.serviceStartDate)}.
2.2. Ao término do prazo, eventual continuidade dos serviços deverá ser formalizada por novo contrato ou aditivo.

CLÁUSULA TERCEIRA - DO PREÇO E CONDIÇÕES DE PAGAMENTO
3.1. O valor total do contrato é de ${value}. Forma de cobrança: ${d.billingType}.${d.installments.trim() ? ` Quantidade de parcelas: ${d.installments}.` : ""}
3.2. Forma de pagamento: ${d.paymentMethod}. Valores e vencimentos: ${d.paymentSchedule.trim()}${d.paymentDetails.trim() ? ` Dados de pagamento: ${d.paymentDetails.trim()}.` : ""}
3.3. Os honorários referem-se aos serviços descritos neste contrato. Investimentos em anúncios, ferramentas e licenças de terceiros são de responsabilidade da CONTRATANTE, salvo condição especial expressa.
3.4. O atraso sujeitará a CONTRATANTE a multa moratória de 2% sobre o valor devido, juros de 1% ao mês e correção pelo IPCA, desde o vencimento até o pagamento.

${d.standardTerms.trim()}
${d.specialClauses.trim() ? `\nCONDIÇÕES ESPECIAIS\n${d.specialClauses.trim()}\n` : ""}
E, por estarem de acordo, as partes assinam o presente instrumento.

${d.signingCity}, ${dateLabel(d.signingDate)}.

________________________________________________________
${d.personType === "PJ" ? d.companyName : d.responsibleName}
${d.personType === "PJ" ? `CNPJ: ${d.cnpj}\nRepresentante: ${d.responsibleName}` : `CPF: ${d.cpf}`}
CONTRATANTE

________________________________________________________
${d.providerName}
CNPJ: ${d.providerCnpj}
Representante: ${d.providerRepresentative}
CONTRATADA

TESTEMUNHAS
1. Nome: _______________________________________________
CPF: __________________________________________________

2. Nome: _______________________________________________
CPF: __________________________________________________`;
}

export function createContractPdf(text: string): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 22, bottom = 276, width = 166;
  let y = 24;
  const page = () => { pdf.addPage(); y = 24; };
  for (const paragraph of text.replace(/\u00a0/g, " ").split("\n")) {
    if (!paragraph.trim()) { y += 3; continue; }
    if (paragraph.startsWith("E, por estarem de acordo") && y + 125 > bottom) page();
    const heading = /^(CONTRATO DE|CLÁUSULA|CONDIÇÕES ESPECIAIS|TESTEMUNHAS)/.test(paragraph);
    pdf.setFont("times", heading ? "bold" : "normal");
    pdf.setFontSize(heading ? 12 : 11);
    const lines = pdf.splitTextToSize(paragraph, width) as string[];
    if (heading && y + lines.length * 5 + 10 > bottom) page();
    // Keep signature identification together with its signature line.
    if (paragraph.startsWith("_____") && y + 34 > bottom) page();
    for (const line of lines) {
      if (y + 5 > bottom) page();
      pdf.text(line, margin, y);
      y += 5;
    }
    y += 1;
  }
  const count = pdf.getNumberOfPages();
  for (let n = 1; n <= count; n++) {
    pdf.setPage(n); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(110);
    pdf.text(`Página ${n} de ${count}`, 188, 287, { align: "right" });
  }
  return pdf;
}
