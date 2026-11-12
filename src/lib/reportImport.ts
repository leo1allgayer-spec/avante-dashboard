export function reportNumber(raw: string): number {
  const clean = raw.replace(/R\$|\s/g, "");
  return Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean);
}

export function parseReport(text: string) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const metric = (label: string, integer = false) => {
    const match = normalized.match(new RegExp(`(?:^|\\n)[^\\w\\n]*${label}\\s*[:：-]?\\s*(?:R\\$\\s*)?([\\d.,]+)`, "i"));
    if (!match) return "";
    const value = integer ? Number(match[1].replace(/[.,]/g, "")) : reportNumber(match[1]);
    return Number.isFinite(value) && value >= 0 ? String(value) : "";
  };
  return {
    campaign: normalized.match(/campanha\s*[:：]\s*([^\n]+)/i)?.[1]?.trim() || "",
    period: normalized.match(/periodo\s*[:：]\s*([^\n]+)/i)?.[1]?.trim() || "",
    investment: metric("(?:investimento(?: em anuncios)?|valor usado|valor gasto)"),
    impressions: metric("impressoes", true),
    clicks: metric("cliques(?: no link)?", true),
    orders: metric("(?:pedidos|compras)", true),
    revenue: metric("(?:faturamento|receita|valor de conversao de compras)"),
  };
}
