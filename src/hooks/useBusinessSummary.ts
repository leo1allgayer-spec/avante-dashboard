import { useMemo } from "react";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useTodayMetrics } from "@/hooks/useMetrics";
import { useFechamentosDiarios } from "@/hooks/useFechamentosDiarios";
import { useCursosDados } from "@/hooks/useCursosDados";
import { COURSE_PRODUCTS, canonicalizeSaleCategory } from "@/constants/serviceCategories";

const normalizeText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export type BusinessSummaryFilter = ReturnType<typeof useDateFilter>;

export function useBusinessSummary(filter: BusinessSummaryFilter) {
  const { data: today } = useTodayMetrics();
  const { data: fechamentos = [] } = useFechamentosDiarios();
  const { data: cursosDados = [] } = useCursosDados();

  const rawMonthData = filter.metrics;
  const vendasData = filter.vendas;

  const monthData = useMemo(() => {
    const map = new Map<string, typeof rawMonthData[0]>();
    rawMonthData.forEach((d) => {
      const existing = map.get(d.date);
      if (!existing) {
        map.set(d.date, { ...d });
      } else {
        map.set(d.date, {
          ...existing,
          faturamento_dia: Number(existing.faturamento_dia || 0) + Number(d.faturamento_dia || 0),
          faturamento_marcado: Number(existing.faturamento_marcado || 0) + Number(d.faturamento_marcado || 0),
          leads: Number(existing.leads || 0) + Number(d.leads || 0),
          lead_mql: Number(existing.lead_mql || 0) + Number(d.lead_mql || 0),
          curso_marcado: Number(existing.curso_marcado || 0) + Number(d.curso_marcado || 0),
          curso_feito: Number(existing.curso_feito || 0) + Number(d.curso_feito || 0),
          ads: Number(existing.ads || 0) + Number(d.ads || 0),
          cac: Math.max(Number(existing.cac || 0), Number(d.cac || 0)),
          custo_por_lead: Math.max(Number(existing.custo_por_lead || 0), Number(d.custo_por_lead || 0)),
          custo_por_lead_mql: Math.max(Number(existing.custo_por_lead_mql || 0), Number(d.custo_por_lead_mql || 0)),
          roas: Math.max(Number(existing.roas || 0), Number(d.roas || 0)),
          meta_mensal_prevista: Math.max(Number(existing.meta_mensal_prevista || 0), Number(d.meta_mensal_prevista || 0)),
          super_meta_mensal: Math.max(Number(existing.super_meta_mensal || 0), Number(d.super_meta_mensal || 0)),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [rawMonthData]);

  const approvedVendas = useMemo(() => vendasData.filter((v) => v.status === "aprovada"), [vendasData]);

  const fechamentosMes = useMemo(() => {
    const { start, end } = filter.range;
    return fechamentos.filter((item) => {
      if ((item.status || "").toLowerCase() === "cancelado") return false;
      const inData = item.data >= start && item.data <= end;
      const inPrevisao = Boolean(item.previsao_entrada) && item.previsao_entrada! >= start && item.previsao_entrada! <= end;
      const inParcelas = Array.isArray(item.parcelas_datas) && item.parcelas_datas.some((date) => date >= start && date <= end);
      return inData || inPrevisao || inParcelas;
    });
  }, [fechamentos, filter.range.start, filter.range.end]);

  const monthMetrics = useMemo(() => filter.monthMetrics || [], [filter.monthMetrics]);
  const monthVendas = useMemo(() => filter.monthVendas || [], [filter.monthVendas]);

  const vendasTotal = approvedVendas.reduce((s, v) => s + Number(v.valor || 0), 0);
  const vendasComissao = approvedVendas.reduce((s, v) => s + Number(v.comissao || 0), 0);
  const leadsTotal = monthData.reduce((s, d) => s + Number(d.leads || 0), 0);
  const mqlTotal = monthData.reduce((s, d) => s + Number(d.lead_mql || 0), 0);
  const adsTotal = monthData.reduce((s, d) => s + Number(d.ads || 0), 0);
  const cursosFeitos = cursosDados.length;
  const totalCursoFeito = cursosFeitos;
  const cursosMarcados = approvedVendas.filter((v) => COURSE_PRODUCTS.some((produto) => normalizeText(produto) === normalizeText(canonicalizeSaleCategory(v.servico || v.produto)))).length;

  const coletadoMes = fechamentosMes.reduce((s, item) => s + Number(item.valor_sinal || 0), 0);
  const aReceberMes = fechamentosMes.reduce((s, item) => {
    if (item.previsao_entrada && item.previsao_entrada >= filter.range.start && item.previsao_entrada <= filter.range.end) {
      if (Array.isArray(item.parcelas_datas) && item.parcelas_datas.length > 0 && Number(item.valor_parcela || 0) > 0) {
        return s + item.parcelas_datas.filter((date) => date >= filter.range.start && date <= filter.range.end).length * Number(item.valor_parcela || 0);
      }
      return s + Number(item.valor_a_entrar || 0);
    }
    if (item.data >= filter.range.start && item.data <= filter.range.end && !item.previsao_entrada && (!item.parcelas_datas || item.parcelas_datas.length === 0)) {
      return s + Number(item.valor_a_entrar || 0);
    }
    return s;
  }, 0);

  const monthRealized = vendasTotal;
  const latestDay = monthData.length > 0 ? monthData[monthData.length - 1] : null;
  const metaMensal = latestDay?.meta_mensal_prevista || 0;
  const superMetaMensal = [...monthData].reverse().find((d) => Number(d.super_meta_mensal) > 0)?.super_meta_mensal || 0;
  const metaPct = metaMensal > 0 ? Math.min((monthRealized / metaMensal) * 100, 100) : 0;
  const superMetaPct = Number(superMetaMensal) > 0 ? Math.min((monthRealized / Number(superMetaMensal)) * 100, 100) : 0;

  const daysWithData = monthData.filter((d) => Number(d.faturamento_dia) > 0 || Number(d.leads) > 0);
  const avgCac = daysWithData.length > 0 ? daysWithData.reduce((s, d) => s + Number(d.cac || 0), 0) / (daysWithData.filter((d) => Number(d.cac) > 0).length || 1) : 0;
  const avgCpl = daysWithData.length > 0 ? daysWithData.reduce((s, d) => s + Number(d.custo_por_lead || 0), 0) / (daysWithData.filter((d) => Number(d.custo_por_lead) > 0).length || 1) : 0;
  const convRate = leadsTotal > 0 ? ((mqlTotal / leadsTotal) * 100) : 0;
  const totalFatMarcado = aReceberMes;
  const totalCursoMarcado = cursosMarcados;
  const totalLeads = leadsTotal;
  const totalMql = mqlTotal;
  const totalAds = adsTotal;

  return {
    today,
    monthData,
    monthMetrics,
    monthVendas,
    vendasData,
    approvedVendas,
    fechamentosMes,
    vendasTotal,
    vendasComissao,
    monthRealized,
    totalFatMarcado,
    totalLeads,
    totalMql,
    totalAds,
    totalCursoFeito,
    cursosFeitos,
    totalCursoMarcado,
    coletadoMes,
    aReceberMes,
    metaMensal,
    superMetaMensal,
    metaPct,
    superMetaPct,
    daysWithData,
    avgCac,
    avgCpl,
    convRate,
  };
}
