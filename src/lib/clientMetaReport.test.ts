import { describe, it, expect } from "vitest";
import { values, variation, createMetaReport, reportMetrics, variationTone, goalProgress, analyzeMetaReport } from "./clientMetaReport";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
describe("Meta report", () => {
  it("keeps every campaign objective and its own metrics, daily results and comparison isolated", () => {
    const current = {date_start:"2026-10-01",date_stop:"2026-10-07",spend:"999"};
    const pdf = createMetaReport({connection:{account_name:"Conta",account_id:"act_demo",currency:"BRL"},current,previous:null,previousRange:{since:"2026-09-24",until:"2026-09-30"},daily:[],fetchedAt:"2026-10-07",campaigns:[
      {id:"traffic",name:"Campanha Trafego",objective:"OUTCOME_TRAFFIC",current:{...current,spend:"100"},previous:{...current,spend:"50"},daily:[{...current,date_start:"2026-10-01",spend:"100"}]},
      {id:"engagement",name:"Campanha Engajamento",objective:"OUTCOME_ENGAGEMENT",current:{...current,spend:"200"},previous:null,daily:[{...current,date_start:"2026-10-02",spend:"200"}]},
      {id:"other",name:"Outro Objetivo",objective:"OTHER_OBJECTIVE",current:{...current,spend:"300"},previous:null,daily:[]},
    ]},"Cliente","data:image/png;base64,"+readFileSync("src/assets/logo-full.png").toString("base64"),"",[4]);
    const pages = pdf.internal.pages.slice(1).map(page => page.join("\n"));
    expect(pages).toHaveLength(9);
    expect(pages.slice(0,3).every(page => page.includes("Campanha Trafego") && !page.includes("Campanha Engajamento"))).toBe(true);
    expect(pages.slice(3,6).every(page => page.includes("Campanha Engajamento") && !page.includes("Campanha Trafego"))).toBe(true);
    expect(pages.slice(6).every(page => page.includes("OTHER_OBJECTIVE"))).toBe(true);
    expect(pages.join("\n")).not.toMatch(/\(R\$\s*999,00\)/);
    expect(pages.join("\n")).not.toContain("Metas e observa");
    mkdirSync("output/meta-report",{recursive:true});
    writeFileSync("output/meta-report/campanhas-separadas.pdf",Buffer.from(pdf.output("arraybuffer")));
  });
  it("uses attributed Instagram followers and avoids a cost when zero or missing", () => {
    const insight = { date_start: "2026-10-01", date_stop: "2026-10-09", spend: "100", instagram_profile_follow: "20" };
    expect(reportMetrics(insight)[17].value).toBe(20);
    expect(reportMetrics(insight)[18].value).toBe(5);
    expect(reportMetrics({ ...insight, instagram_profile_follow: "0" })[18].value).toBeNull();
    expect(reportMetrics({ ...insight, instagram_profile_follow: undefined })[17].value).toBeNull();
  });
  it("distinguishes missing results, achieved volume and maximum cost targets", () => {
    expect(goalProgress(20, null).percent).toBeNull();
    expect(goalProgress(20, 5)).toEqual({ achieved: false, percent: 25, gap: 15 });
    expect(goalProgress(20, 25).gap).toBe(0);
    expect(goalProgress(10, 20, true)).toEqual({ achieved: false, percent: 50, gap: 10 });
    expect(goalProgress(10, 0, true).achieved).toBe(true);
  });
  it("flags higher costs and falling conversions without inventing causes", () => {
    const report = { connection: { account_name: "Teste", account_id: "act_demo", currency: "BRL" }, current: { date_start: "2026-10-01", date_stop: "2026-10-05", spend: "100", cost_per_inline_link_click: "2", actions: [{ action_type: "purchase", value: "5" }] }, previous: { date_start: "2026-09-26", date_stop: "2026-09-30", cost_per_inline_link_click: "1", actions: [{ action_type: "purchase", value: "10" }] }, previousRange: { since: "2026-09-26", until: "2026-09-30" }, daily: [], fetchedAt: "2026-10-05" };
    const analysis = analyzeMetaReport(report, [6, 14, 15]);
    expect(analysis.attention.join(" ")).toContain("aumentou 100%");
    expect(analysis.attention.join(" ")).toContain("diminuiu 50%");
    expect(analysis.attention.join(" ")).toContain("Ausência de informação não significa resultado zero");
    expect(analysis.limitation).toContain("não permitem confirmar erros");
  });
  it("keeps link, website purchase and messaging metrics distinct and handles cost direction", () => {
    const metrics = reportMetrics({ date_start: "2026-09-01", date_stop: "2026-09-30", spend: "100", clicks: "500", inline_link_clicks: "80", purchase_roas: [{ action_type: "omni_purchase", value: "9" }], actions: [{ action_type: "lead", value: "10" }, { action_type: "onsite_conversion.lead_grouped", value: "10" }, { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "5" }] });
    expect(metrics[2].value).toBe(80);
    expect(metrics[9].value).toBe(500);
    expect(metrics[7].value).toBe(10);
    expect(metrics[8].value).toBeNull();
    expect(metrics[11].value).toBe(10);
    expect(metrics[13].value).toBe(20);
    expect(variationTone(metrics[11], 12)).toBe("good");
    expect(variationTone(metrics[11], 8)).toBe("bad");
    expect(reportMetrics({ date_start: "2026-09-01", date_stop: "2026-09-30", spend: "100", actions: [{ action_type: "lead", value: "0" }] })[11].value).toBeNull();
  });
  it("does not sum overlapping purchase attribution or invent missing values", () => {
    expect(values(null)[7]).toBeNull();
    expect(
      values({
        date_start: "2026-09-01",
        date_stop: "2026-09-30",
        actions: [
          { action_type: "purchase", value: "2" },
          { action_type: "omni_purchase", value: "2" },
        ],
      })[6],
    ).toBe(2);
    expect(variation(20, 0)).toBe("Sem base de comparação");
    expect(variation(0, 20)).toBe("-100%");
  });
  it("generates a complete PDF for visual review", () => {
    const current = {
      date_start: "2026-09-01",
      date_stop: "2026-09-30",
      spend: "600",
      impressions: "79000",
      clicks: "1100",
      reach: "29000",
      ctr: "1.4",
      cpc: "0.54", cpm: "7.59", frequency: "2.72", inline_link_clicks: "850", inline_link_click_ctr: "1.08", cost_per_inline_link_click: "0.71", website_purchase_roas: [{ action_type: "offsite_conversion.fb_pixel_purchase", value: "11.83" }],
      actions: [{ action_type: "purchase", value: "100" }, { action_type: "lead", value: "30" }, { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "15" }],
      action_values: [{ action_type: "purchase", value: "7100" }],
      purchase_roas: [{ action_type: "omni_purchase", value: "11.83" }],
    };
    const pdf = createMetaReport(
      {
        connection: {
          account_name: "Conta de demonstração",
          account_id: "act_demo",
          currency: "BRL",
        },
        current,
        previous: { ...current, spend: "500" },
        previousRange: { since: "2026-08-02", until: "2026-08-31" },
        daily: Array.from({ length: 30 }, (_, i) => ({
          ...current,
          date_start: `2026-09-${String(i + 1).padStart(2, "0")}`,
          spend: String(10 + i),
          actions: [{ action_type: "purchase", value: String(i % 7) }],
          action_values: [{ action_type: "purchase", value: String(i * 15) }],
        })),
        fetchedAt: "2026-10-03",
      },
      "CLIENTE DEMONSTRAÇÃO",
      "data:image/png;base64," +
        readFileSync("src/assets/logo-full.png").toString("base64"),
      "Exemplo visual com dados fictícios para validar a apresentação.",
      undefined,
      { month: "2026-09", targets: { purchases: 120, revenue: 10000, roas: 12, leads: 50, conversations: 20, cpl: 15 }, insight: current, currency: "BRL" },
    );
    const selectedPdf = createMetaReport({ connection: { account_name: "Conta", account_id: "act_demo", currency: "BRL" }, current, previous: null, previousRange: { since: "2026-08-02", until: "2026-08-31" }, daily: [], fetchedAt: "2026-10-03" }, "Cliente", "data:image/png;base64," + readFileSync("src/assets/logo-full.png").toString("base64"), "", [4]);
    const selectedText = selectedPdf.internal.pages.flat().join("\n");
    expect(selectedText).not.toContain("Melhorias sugeridas");
    expect(selectedText).not.toContain("Pontos de aten");
    expect(selectedText).toContain("Valor investido");
    expect(selectedText).not.toContain("Alcance total");
    expect(selectedText).not.toContain("Valor das compras");
    writeFileSync("output/meta-report/selecionado.pdf", Buffer.from(selectedPdf.output("arraybuffer")));
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(3);
    expect(pdf.internal.pages.flat().join("\n")).not.toContain("Metas e observa");
    mkdirSync("output/meta-report", { recursive: true });
    writeFileSync(
      "output/meta-report/exemplo.pdf",
      Buffer.from(pdf.output("arraybuffer")),
    );
  });
});


