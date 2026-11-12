import { describe, expect, it } from "vitest";
import { buildContractText, contractDefaults, contractMissingFields, createContractPdf, parseContractValue, type ContractInput } from "./clientContract";

const sample: ContractInput = {
  ...contractDefaults, personType: "PJ", responsibleName: "Pessoa Exemplo", cpf: "123.456.789-00",
  rg: "", rgIssuer: "", nationality: "brasileira", maritalStatus: "", profession: "",
  companyName: "Empresa Exemplo LTDA", cnpj: "12.345.678/0001-00", address: "Rua Exemplo, 100, São Leopoldo/RS",
  email: "exemplo@example.com", phone: "51999999999", contractObject: "Gestão de Meta Ads e captação quinzenal.",
  contractValue: "36.000,00", billingType: "Parcelado", installments: "6", paymentMethod: "PIX",
  paymentDetails: "", paymentSchedule: "6 parcelas de R$ 6.000,00, primeira em 10/10/2026 e demais no dia 10.",
  contractTerm: "6 meses", serviceStartDate: "2026-10-01", deliveryTerms: "15 vídeos e 10 cards por mês.",
  specialClauses: "Stories não incluídos.", signingDate: "2026-09-24",
};

describe("geração de contratos", () => {
  it("aceita valores brasileiros e valores numéricos vindos do cadastro", () => {
    for (const value of ["36.000,00", "R$ 36.000,00", "36000", "36000.00", "36.000"]) expect(parseContractValue(value)).toBe(36000);
    for (const value of ["", "-10", "R$ abc", "1,2,3"]) expect(Number.isNaN(parseContractValue(value))).toBe(true);
  });
  it("exige dados das duas partes, datas, valor e vencimentos", () => {
    expect(contractMissingFields(sample)).toEqual([]);
    expect(contractMissingFields({ ...sample, paymentSchedule: "", providerCnpj: "", contractValue: "0" })).toEqual(expect.arrayContaining(["Valores e vencimentos do pagamento", "CNPJ da contratada", "Valor total válido e maior que zero"]));
  });
  it("usa os mesmos documentos na qualificação e nas assinaturas", () => {
    const text = buildContractText(sample);
    expect(text.split(sample.cnpj)).toHaveLength(3);
    expect(text.split(sample.providerCnpj)).toHaveLength(3);
    expect(text).toContain("R$ 36.000,00");
    expect(text).toContain(sample.paymentSchedule);
    expect(text).toContain(sample.specialClauses);
    expect(text).not.toContain("venda do imóvel");
    expect(text).not.toContain("NaN");
  });
  it("gera pessoa física sem incluir dados antigos da empresa", () => {
    const pf = { ...sample, personType: "PF" as const, cnpj: "", companyName: "EMPRESA ANTIGA" };
    expect(contractMissingFields(pf)).toEqual([]);
    const text = buildContractText(pf);
    expect(text).not.toContain("EMPRESA ANTIGA");
    expect(text.split(sample.cpf)).toHaveLength(3);
  });
  it("pagina contratos longos sem perder o final", () => {
    const pdf = createContractPdf(buildContractText({ ...sample, contractObject: "Serviço detalhado. ".repeat(1600) }));
    expect(pdf.getNumberOfPages()).toBeGreaterThan(5);
    expect(pdf.output()).toContain("%%EOF");
  });
});
