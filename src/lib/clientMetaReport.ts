import { jsPDF } from "jspdf";
export type MetaAction = { action_type: string; value: string };
export type MetaInsight = {
  date_start: string;
  date_stop: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  instagram_profile_follow?: string;
  inline_link_clicks?: string;
  inline_link_click_ctr?: string;
  cost_per_inline_link_click?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
  purchase_roas?: MetaAction[];
  website_purchase_roas?: MetaAction[];
  cost_per_action_type?: MetaAction[];
};
export type MetaReport = {
  connection: {
    account_name: string;
    account_id: string;
    currency: string;
    timezone_name?: string;
  };
  current: MetaInsight;
  previous: MetaInsight | null;
  previousRange: { since: string; until: string };
  daily: MetaInsight[];
  fetchedAt: string;
  campaigns?: { id: string; name: string; objective: string; current: MetaInsight; previous: MetaInsight | null; daily: MetaInsight[] }[];
};
export const numeric = (v: unknown): number | null =>
  v === undefined || v === null || v === "" || !Number.isFinite(Number(v))
    ? null
    : Number(v);
const action = (list: MetaAction[] | undefined, type: string) =>
  numeric(list?.find((a) => a.action_type === type)?.value);
export function values(i: MetaInsight | null) {
  return [
    numeric(i?.spend),
    numeric(i?.impressions),
    numeric(i?.clicks),
    numeric(i?.reach),
    numeric(i?.ctr),
    numeric(i?.cpc),
    action(i?.actions, "purchase"),
    action(i?.action_values, "purchase"),
    action(i?.purchase_roas, "omni_purchase") ??
      action(i?.purchase_roas, "purchase"),
  ];
}
export function variation(a: number | null, b: number | null) {
  return a === null || b === null || b === 0
    ? "Sem base de comparação"
    : `${a >= b ? "+" : ""}${(((a - b) / b) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export const goalMetrics = [
  { key: "purchases", label: "Compras atribuídas", index: 14, unit: "number", lower: false },
  { key: "revenue", label: "Valor das compras atribuídas", index: 15, unit: "money", lower: false },
  { key: "roas", label: "ROAS de compras", index: 16, unit: "ratio", lower: false },
  { key: "leads", label: "Cadastros (leads)", index: 7, unit: "number", lower: false },
  { key: "conversations", label: "Conversas iniciadas", index: 12, unit: "number", lower: false },
  { key: "cpl", label: "Custo máximo por lead", index: 11, unit: "money", lower: true },
] as const;
export type GoalTargets = Partial<Record<(typeof goalMetrics)[number]["key"], number>>;
export type GoalSnapshot = { month: string; targets: GoalTargets; insight: MetaInsight | null; currency: string; error?: string };
export function formatGoal(value: number | null, unit: string, currency: string) {
  if (value === null) return "Não informado";
  return unit === "money" ? value.toLocaleString("pt-BR", { style: "currency", currency }) : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + (unit === "ratio" ? "x" : "");
}
export function goalProgress(target: number, actual: number | null, lower = false) {
  if (actual === null) return { achieved: false, percent: null, gap: null };
  return { achieved: lower ? actual <= target : actual >= target, percent: lower ? (actual === 0 ? 100 : target / actual * 100) : actual / target * 100, gap: Math.max(lower ? actual - target : target - actual, 0) };
}
export function monthlyGoalText(snapshot?: GoalSnapshot) {
  if (!snapshot) return [];
  const metrics = reportMetrics(snapshot.insight);
  const lines = goalMetrics.filter(g => snapshot.targets[g.key] !== undefined).map(g => {
    const target = snapshot.targets[g.key]!;
    const actual = metrics[g.index].value;
    const progress = goalProgress(target, actual, g.lower);
    return `${g.label}: meta ${formatGoal(target, g.unit, snapshot.currency)}; realizado ${formatGoal(actual, g.unit, snapshot.currency)}. ${progress.percent === null ? "Sem dados para avaliar." : progress.achieved ? "Meta atingida." : `${g.lower ? "Reduzir em" : "Faltam"} ${formatGoal(progress.gap, g.unit, snapshot.currency)}; atingimento ${progress.percent.toFixed(1)}%.`}`;
  });
  return lines.length ? [`Metas mensais — ${snapshot.month.split("-").reverse().join("/")}. Valores do mês completo disponível na Meta, independentes do período do relatório.`, ...(snapshot.error ? ["Resultados mensais indisponíveis nesta consulta."] : []), ...lines] : [];
}
export function analyzeMetaReport(data: MetaReport, selected?: number[]) {
  const current = reportMetrics(data.current), prior = reportMetrics(data.previous);
  const chosen = selected || current.map((_, index) => index);
  const summary = [`Foram investidos ${formatGoal(numeric(data.current.spend), "money", data.connection.currency)} neste período. Os resultados abaixo seguem a atribuição da Meta.`];
  for (const index of [7, 12, 14]) {
    if (chosen.includes(index) && current[index].value !== null) summary.push(`${current[index].label}: ${formatGoal(current[index].value, "number", data.connection.currency)} no período.`);
  }
  if (chosen.includes(16) && current[16].value !== null) summary.push(`Para cada R$ 1 investido, a Meta atribuiu ${formatGoal(current[16].value, "money", data.connection.currency)} em compras. Esse retorno não representa lucro.`);
  const strengths: string[] = [], attention: string[] = [], improvements: string[] = [];
  const hints: Record<number, string> = {
    5: "Teste novas imagens e mensagens e confira se o anúncio combina com o público. Compare os testes antes de trocar o que já funciona.",
    6: "Compare públicos, posicionamentos e criativos para encontrar cliques de qualidade com menor custo.",
    7: "Revise o formulário ou página de cadastro e confirme se o acompanhamento de leads está funcionando.",
    11: "Compare o custo e a qualidade dos leads por campanha antes de redistribuir o orçamento.",
    12: "Revise a chamada para conversa e o atendimento das mensagens recebidas.",
    13: "Compare anúncios e públicos que geram conversas e verifique a qualidade dessas conversas.",
    14: "Confira o registro de compras e revise a página de venda, a oferta e o processo de pagamento.",
    15: "Compare o valor das compras e o investimento por campanha. Confira se os valores de compra estão sendo enviados corretamente.",
    16: "Revise investimento e valor das compras por campanha. ROAS representa receita atribuída por real investido, sem descontar os custos do negócio.",
  };
  for (const index of [5, 6, 7, 11, 12, 13, 14, 15, 16]) {
    if (!chosen.includes(index)) continue;
    const metric = current[index], old = prior[index].value;
    if (metric.value === null || old === null || old <= 0) continue;
    const change = (metric.value - old) / old;
    if (Math.abs(change) < 0.1) continue;
    const line = `${metric.label} ${change > 0 ? "aumentou" : "diminuiu"} ${Math.abs(change * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em relação ao período anterior.`;
    const good = metric.direction === "down" ? change < 0 : change > 0;
    (good ? strengths : attention).push(line);
    if (!good) improvements.push(hints[index]);
  }
  if (!data.previous) attention.push("Não há dados do período anterior para comparar. Isso não significa que os resultados sejam ruins.");
  const missing = chosen.filter(index => current[index]?.value === null);
  if (missing.length) {
    attention.push(`A Meta não informou: ${missing.map(index => current[index].label).join(", ")}. Ausência de informação não significa resultado zero.`);
    improvements.push("Confira se os eventos necessários ao objetivo da campanha estão configurados e chegando à Meta.");
  }
  if (!attention.length) attention.push("Não houve piora de 10% ou mais nos indicadores analisados com base de comparação. Isso não garante que a campanha esteja sem problemas.");
  if (!improvements.length) improvements.push("Compare os anúncios por resultado e custo e teste uma mudança por vez. Confira também a qualidade dos contatos e as vendas efetivamente realizadas.");
  return { summary, strengths, attention, improvements: [...new Set(improvements)], limitation: "A análise mostra tendências e hipóteses para revisão; os números agregados não permitem confirmar erros de configuração nem suas causas." };
}
type Metric = {
  label: string;
  value: number | null;
  format: "number" | "money" | "percent" | "ratio";
  direction: "up" | "down" | "neutral";
};
export function reportMetrics(i: MetaInsight | null): Metric[] {
  const followers = numeric(i?.instagram_profile_follow);
  const lead = action(i?.actions, "lead");
  const conversations = action(
    i?.actions,
    "onsite_conversion.messaging_conversation_started_7d",
  );
  const cost = (type: string, count: number | null) =>
    action(i?.cost_per_action_type, type) ??
    (count !== null && count > 0 && numeric(i?.spend) !== null
      ? Number(i?.spend) / count
      : null);
  return [
    {
      label: "Impressões totais",
      value: numeric(i?.impressions),
      format: "number",
      direction: "up",
    },
    {
      label: "Alcance total",
      value: numeric(i?.reach),
      format: "number",
      direction: "up",
    },
    {
      label: "Total de cliques no link",
      value: numeric(i?.inline_link_clicks),
      format: "number",
      direction: "up",
    },
    {
      label: "CPM médio",
      value: numeric(i?.cpm),
      format: "money",
      direction: "down",
    },
    {
      label: "Valor investido",
      value: numeric(i?.spend),
      format: "money",
      direction: "neutral",
    },
    {
      label: "CTR (taxa de cliques no link)",
      value: numeric(i?.inline_link_click_ctr),
      format: "percent",
      direction: "up",
    },
    {
      label: "CPC médio (cliques no link)",
      value: numeric(i?.cost_per_inline_link_click),
      format: "money",
      direction: "down",
    },
    {
      label: "Todos os cadastros (leads)",
      value: lead,
      format: "number",
      direction: "up",
    },
    {
      label: "ROAS de compras no site",
      value: action(
        i?.website_purchase_roas,
        "offsite_conversion.fb_pixel_purchase",
      ),
      format: "ratio",
      direction: "up",
    },
    {
      label: "Total de cliques",
      value: numeric(i?.clicks),
      format: "number",
      direction: "up",
    },
    {
      label: "Frequência",
      value: numeric(i?.frequency),
      format: "ratio",
      direction: "neutral",
    },
    {
      label: "Custo por cadastro (lead)",
      value: cost("lead", lead),
      format: "money",
      direction: "down",
    },
    {
      label: "Conversas iniciadas por mensagem",
      value: conversations,
      format: "number",
      direction: "up",
    },
    {
      label: "Custo por conversa iniciada por mensagem",
      value: cost(
        "onsite_conversion.messaging_conversation_started_7d",
        conversations,
      ),
      format: "money",
      direction: "down",
    },
    {
      label: "Compras atribuídas (todos os canais)",
      value: values(i)[6],
      format: "number",
      direction: "up",
    },
    {
      label: "Valor das compras atribuídas",
      value: values(i)[7],
      format: "money",
      direction: "up",
    },
    {
      label: "ROAS de compras (todos os canais)",
      value: values(i)[8],
      format: "ratio",
      direction: "up",
    },
    {
      label: "Seguidores (Instagram)",
      value: followers,
      format: "number",
      direction: "up",
    },
    {
      label: "Custo por seguidor",
      value: followers !== null && followers > 0 && numeric(i?.spend) !== null
        ? Number(i?.spend) / followers : null,
      format: "money",
      direction: "down",
    },
  ];
}
export function variationTone(metric: Metric, previous: number | null) {
  if (
    metric.value === null ||
    previous === null ||
    previous === 0 ||
    metric.value === previous ||
    metric.direction === "neutral"
  )
    return "neutral";
  return (
    metric.direction === "up"
      ? metric.value > previous
      : metric.value < previous
  )
    ? "good"
    : "bad";
}
const date = (s: string) => s.split("-").reverse().join("/");
export function createMetaReport(
  data: MetaReport,
  client: string,
  logo: string,
  notes = "",
  selectedMetrics?: number[],
  goals?: GoalSnapshot,
  existingPdf?: jsPDF,
) {
  const pdf = existingPdf || new jsPDF({ orientation: "landscape", compress: true });
  if (data.campaigns?.length) {
    const objectives: Record<string,string> = { OUTCOME_TRAFFIC:"Tráfego", TRAFFIC:"Tráfego", LINK_CLICKS:"Tráfego", OUTCOME_ENGAGEMENT:"Engajamento", ENGAGEMENT:"Engajamento", POST_ENGAGEMENT:"Engajamento", OUTCOME_SALES:"Vendas", CONVERSIONS:"Conversões", OUTCOME_LEADS:"Cadastros (leads)", LEAD_GENERATION:"Cadastros (leads)", OUTCOME_AWARENESS:"Reconhecimento", BRAND_AWARENESS:"Reconhecimento", REACH:"Alcance", OUTCOME_APP_PROMOTION:"Promoção de aplicativo", MESSAGES:"Mensagens" };
    data.campaigns.forEach((campaign,index) => {
      if (index) pdf.addPage();
      createMetaReport({ ...data, campaigns:undefined, connection:{...data.connection, account_name:`${campaign.name} | Objetivo: ${objectives[campaign.objective] || campaign.objective || "Não informado"}`}, current:campaign.current, previous:campaign.previous, daily:campaign.daily },client,logo,notes,selectedMetrics,undefined,pdf);
    });
    reportFooter(pdf);
    return pdf;
  }
  const metrics = reportMetrics(data.current),
    previous = reportMetrics(data.previous);
  const selected =
    selectedMetrics === undefined
      ? metrics.map((_, index) => index)
      : [...new Set(selectedMetrics)]
          .filter(
            (index) =>
              Number.isInteger(index) && index >= 0 && index < metrics.length,
          )
          .sort((a, b) => a - b);
  if (!selected.length)
    throw new Error("Selecione pelo menos uma métrica para o relatório.");
  const format = (metric: Metric) =>
    metric.value === null
      ? "Não informado"
      : metric.format === "money"
        ? metric.value.toLocaleString("pt-BR", {
            style: "currency",
            currency: data.connection.currency,
          })
        : metric.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) +
          (metric.format === "percent" ? "%" : "");
  const text = (
    s: string | string[],
    x: number,
    y: number,
    size = 10,
    color = "#263238",
    align: "left" | "center" = "left",
    bold = false,
  ) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(color);
    pdf.text(s, x, y, { align });
  };
  const wrap = (
    s: string | string[],
    x: number,
    y: number,
    width: number,
    size = 9,
  ) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(Array.isArray(s) ? s.join("\n") : s, width);
    pdf.setTextColor("#607988");
    pdf.text(lines, x, y);
    return y + lines.length * size * 0.45;
  };
  const header = (title: string) => {
    pdf.setDrawColor("#0565f5");
    pdf.setLineWidth(0.7);
    pdf.line(12, 8, 285, 8);
    const p = pdf.getImageProperties(logo);
    pdf.addImage(logo, "PNG", 13, 11, 22, (22 * p.height) / p.width);
    text(title, 40, 20, 15, "#263238", "left", true);
    text("Avante Digital | Relatório de anúncios", 40, 27, 8, "#607988");
    wrap(client + " | " + data.connection.account_name, 13, 39, 272, 10);
    text(
      `Período: ${date(data.current.date_start)} a ${date(data.current.date_stop)}   |   Anterior: ${date(data.previousRange.since)} a ${date(data.previousRange.until)}`,
      13,
      46,
      8,
      "#607988",
    );
  };
  header("Meta Ads");
  function card(index: number, x: number, top: number, width: number) {
    const metric = metrics[index],
      prior = previous[index];
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    const labelLines = pdf.splitTextToSize(metric.label, width - 6);
    text(labelLines, x + width / 2, top, 9, "#263238", "center", true);
    const value = format(metric);
    const delta = variation(metric.value, prior.value);
    const badge = delta === "Sem base de comparação" ? "Sem base" : delta;
    const tone = variationTone(metric, prior.value);
    const colors =
      tone === "good"
        ? ["#dcf7e5", "#079640"]
        : tone === "bad"
          ? ["#ffe5e6", "#dc3944"]
          : ["#edf1f3", "#526874"];
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(metric.value === null ? 11 : 15);
    const valueWidth = pdf.getTextWidth(value);
    pdf.setFontSize(7);
    const badgeWidth = pdf.getTextWidth(badge) + 6;
    const gap = 2,
      start = x + (width - valueWidth - gap - badgeWidth) / 2,
      baseline = top + 12;
    text(
      value,
      start,
      baseline,
      metric.value === null ? 11 : 15,
      "#263238",
      "left",
      true,
    );
    pdf.setFillColor(colors[0]);
    pdf.roundedRect(
      start + valueWidth + gap,
      baseline - 4,
      badgeWidth,
      5,
      2,
      2,
      "F",
    );
    text(
      badge,
      start + valueWidth + gap + badgeWidth / 2,
      baseline - 0.4,
      7,
      colors[1],
      "center",
      true,
    );
    text(
      `${format(prior)} no período anterior`,
      x + width / 2,
      baseline + 6,
      7.5,
      "#607988",
      "center",
    );
  }
  const cardSpacing = selected.length > 16 ? 26 : 32;
  selected.forEach((index, position) => {
    card(index, 13 + (position % 4) * 68, 60 + Math.floor(position / 4) * cardSpacing, 68);
  });
  // Keep the daily page focused on the metrics the team selected. In addition
  // to spend and purchase value, show conversations and purchase counts when
  // they are part of the report selection.
  const chartMetrics = [4, 12, 14, 15].filter((index) => selected.includes(index));
  if (chartMetrics.length) { pdf.addPage(); header("Evolução diária"); }
  const daily = [...data.daily].sort((a, b) =>
    a.date_start.localeCompare(b.date_start),
  );
  function chart(
    index: number,
    title: string,
    x: number,
    top: number,
    width: number,
    color: string,
  ) {
    text(pdf.splitTextToSize(title, width), x, top, 9, "#263238", "left", true);
    const pts = daily.map((d) => ({
        day: d.date_start,
        v: reportMetrics(d)[index].value,
      })),
      max = Math.max(1, ...pts.map((p) => p.v ?? 0));
    const chartX = x + 22,
      w = width - 25,
      h = 38,
      base = top + 48;
    pdf.setLineWidth(0.2);
    pdf.setDrawColor("#dde7ef");
    pdf.line(chartX, base, chartX + w, base);
    const display: Metric = {
      ...metrics[index],
      value: max,
    };
    text(format(display), x, top + 13, 7, "#607988");
    text("0", x + 16, base, 7, "#607988");
    const start = Date.parse(data.current.date_start + "T00:00:00Z"),
      end = Date.parse(data.current.date_stop + "T00:00:00Z"),
      days = Math.round((end - start) / 86400000) + 1,
      step = w / days;
    pdf.setFillColor(color);
    for (const p of pts) {
      if (typeof p.v !== "number" || !Number.isFinite(p.v)) continue;
      const offset = Math.round(
        (Date.parse(p.day + "T00:00:00Z") - start) / 86400000,
      );
      pdf.rect(
        chartX + offset * step + 0.2,
        base - (p.v / max) * h,
        Math.max(0.4, step - 0.7),
        (p.v / max) * h,
        "F",
      );
      // Daily reports are often printed without an interactive tooltip. Put
      // the exact daily value above each bar so the chart remains useful on
      // paper and in the exported PDF.
      const label = format({ ...metrics[index], value: p.v });
      text(label, chartX + offset * step + Math.max(0.4, step - 0.7) / 2, base - (p.v / max) * h - 2, 5.2, "#607988", "center");
    }
    text(date(data.current.date_start), chartX, base + 6, 7, "#607988");
    text(date(data.current.date_stop), chartX + w - 22, base + 6, 7, "#607988");
    if (!pts.some((p) => p.v !== null))
      text(
        "Sem dados informados",
        chartX + w / 2,
        top + 30,
        9,
        "#607988",
        "center",
      );
  }
  chartMetrics.forEach((index, position) => {
    const wide = chartMetrics.length === 1 || (chartMetrics.length === 3 && position === 2);
    chart(index, metrics[index].label + " por dia", position % 2 === 1 ? 156 : 13, position < 2 ? 64 : 133, wide ? 272 : 129, ["#0565f5", "#723fc4", "#1497ad", "#ef8b2c"][position]);
  });
  pdf.addPage();
  header("Comparativo de desempenho");
  text("Indicador", 15, 57, 9, "#263238", "left", true);
  text("Atual", 120, 57, 9, "#263238", "left", true);
  text("Anterior", 174, 57, 9, "#263238", "left", true);
  text("Variação", 236, 57, 9, "#263238", "left", true);
  selected.forEach((index, k) => {
    const metric = metrics[index];
    const y = 65 + k * 6.5;
    if (k % 2 === 0) {
      pdf.setFillColor("#f4f8fc");
      pdf.rect(13, y - 4.5, 272, 6.5, "F");
    }
    text(metric.label, 15, y, 8);
    text(format(metric), 120, y, 8);
    text(format(previous[index]), 174, y, 8);
    const tone = variationTone(metric, previous[index].value);
    text(
      variation(metric.value, previous[index].value).replace(
        "Sem base de comparação",
        "Sem base",
      ),
      236,
      y,
      8,
      tone === "good" ? "#079640" : tone === "bad" ? "#dc3944" : "#607988",
    );
  });
  if (!existingPdf) reportFooter(pdf);
  return pdf;
}

function reportFooter(pdf: jsPDF) {
  const count = pdf.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    pdf.setPage(page);
    pdf.setDrawColor("#dde7ef");
    pdf.setLineWidth(0.2);
    pdf.line(13, 197, 285, 197);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor("#607988");
    pdf.text(
      "Fonte: Meta Ads. Atribuição da Meta. Sem retorno: Não informado. Sem base: anterior ausente ou zero.",
      13,
      202,
    );
    pdf.text(`Avante Digital | ${page}/${count}`, 251, 207);
  }
}
