import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { analyzeMetaReport, formatGoal, goalMetrics, goalProgress, reportMetrics, type GoalTargets, type GoalSnapshot, type MetaInsight, type MetaReport } from "@/lib/clientMetaReport";

type Request = <T>(action: string, values?: object) => Promise<T>;
export function ClientMetaGoals({ clientId, accountId, currency, request, loadReport, periodKey, onSnapshot, readOnly = false }: {
  readOnly?: boolean; clientId: string; accountId: string; currency: string; request: Request;
  loadReport: () => Promise<MetaReport>; periodKey: string; onSnapshot: (value: GoalSnapshot | undefined) => void;
}) {
  const cache = useQueryClient();
  const [month, setMonth] = useState(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7));
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false), [message, setMessage] = useState("");
  const [editingAnalysis, setEditingAnalysis] = useState(false);
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [analysisDraft, setAnalysisDraft] = useState<Record<string, string>>({});
  const analysisPeriod = `${accountId}|${periodKey}`;
  const analysisKey = ["client-meta-analysis-notes", clientId, analysisPeriod];
  const savedAnalysis = useQuery({ queryKey: analysisKey, retry: false, queryFn: async () => {
    const { data, error } = await (supabase as any).rpc("client_meta_analysis_notes_access", { p_client_id: clientId, p_period_key: analysisPeriod });
    if (error) throw error;
    return data as Record<string, string> | null;
  } });
  const key = ["client-meta-goals", clientId, month];
  const goals = useQuery({ queryKey: key, queryFn: () => request<{ targets: GoalTargets }>("goals", { month }), retry: false });
  const end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).toISOString().slice(0, 10);
  const monthly = useQuery({ queryKey: [...key, "results", accountId], queryFn: () => request<{ insight: MetaInsight | null }>("insights", { period: "custom", since: `${month}-01`, until: end }), retry: false, refetchInterval: 300000 });
  const report = useQuery({ queryKey: ["client-meta-analysis", clientId, accountId, periodKey], queryFn: loadReport, retry: false, refetchInterval: 300000 });
  useEffect(() => {
    setDraft(Object.fromEntries(Object.entries(goals.data?.targets || {}).map(([key, value]) => [key, String(value)])));
  }, [goals.data, month]);
  useEffect(() => {
    onSnapshot(goals.data ? { month, targets: goals.data.targets, insight: monthly.data?.insight || null, currency, error: monthly.isError ? "Resultados indisponíveis" : undefined } : undefined);
  }, [goals.data, monthly.data, monthly.isError, month, currency, onSnapshot]);
  const analysis = report.data ? analyzeMetaReport(report.data) : null;
  useEffect(() => {
    if (editingAnalysis || !report.data || savedAnalysis.isPending) return;
    const generated = analyzeMetaReport(report.data);
    setAnalysisDraft(savedAnalysis.data || {
      summary: generated.summary.join("\n\n"),
      strengths: generated.strengths.length ? generated.strengths.join("\n") : "Sem melhora de 10% ou mais nos indicadores com base de comparação.",
      attention: generated.attention.join("\n"), improvements: generated.improvements.join("\n"),
    });
  }, [report.data, savedAnalysis.data, savedAnalysis.isPending, editingAnalysis]);
  useEffect(() => { setEditingAnalysis(false); setAnalysisMessage(""); }, [analysisPeriod, clientId]);
  async function saveAnalysis() {
    setSavingAnalysis(true); setAnalysisMessage("");
    try {
      const { error } = await (supabase as any).rpc("client_meta_analysis_notes_access", { p_client_id: clientId, p_period_key: analysisPeriod, p_sections: analysisDraft });
      if (error) throw error;
      await cache.invalidateQueries({ queryKey: analysisKey });
      setEditingAnalysis(false); setAnalysisMessage("Análise interna salva.");
    } catch (error) { setAnalysisMessage(error instanceof Error ? error.message : "Não foi possível salvar a análise."); }
    finally { setSavingAnalysis(false); }
  }
  const actuals = reportMetrics(monthly.data?.insight || null);
  async function save() {
    setSaving(true); setMessage("");
    try {
      const targets: GoalTargets = {};
      for (const metric of goalMetrics) {
        const raw = draft[metric.key]?.trim();
        if (!raw) continue;
        const value = Number(raw.replace(",", "."));
        if (!Number.isFinite(value) || value <= 0) throw new Error("Preencha metas maiores que zero ou deixe o campo vazio.");
        targets[metric.key] = value;
      }
      await request("save_goals", { month, targets });
      await cache.invalidateQueries({ queryKey: key });
      setMessage("Metas mensais salvas.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }
  return <div className="space-y-5 border-t pt-4">
    <section className="space-y-3" aria-label="Análise dos resultados">
      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Análise interna dos resultados</h4>{!readOnly && !editingAnalysis && <Button variant="outline" size="sm" disabled={report.isPending || savedAnalysis.isPending || savedAnalysis.isError} onClick={() => setEditingAnalysis(true)}>Editar análise</Button>}</div>
      <p className="text-xs text-muted-foreground">Uso da equipe. Esta análise não aparece no relatório PDF. As edições ficam salvas para este cliente, conta e período.</p>
      {savedAnalysis.isError && <p role="alert" className="text-sm">Não foi possível carregar a análise salva. Atualize a página para tentar novamente.</p>}
      {report.isPending ? <p>Preparando análise…</p> : report.isError ? <p role="status" className="text-sm text-muted-foreground">{report.error.message}</p> : analysis && <>
        {editingAnalysis ? <label className="block text-sm font-medium">Resumo dos resultados<Textarea rows={4} value={analysisDraft.summary || ""} onChange={e => setAnalysisDraft(old => ({ ...old, summary: e.target.value }))} disabled={savingAnalysis} className="mt-2" /></label> : <p className="text-sm whitespace-pre-line">{analysisDraft.summary}</p>}
        <div className="grid gap-3 lg:grid-cols-3">{[
          ["O que melhorou", "strengths"], ["Pontos de atenção", "attention"], ["Melhorias sugeridas", "improvements"],
        ].map(([title, field]) => <div key={title} className="rounded-lg border p-3"><h5 className="mb-2 font-medium">{title}</h5>{editingAnalysis ? <Textarea aria-label={title} rows={8} value={analysisDraft[field] || ""} onChange={e => setAnalysisDraft(old => ({ ...old, [field]: e.target.value }))} disabled={savingAnalysis} /> : <p className="whitespace-pre-line text-sm text-muted-foreground">{analysisDraft[field]}</p>}</div>)}</div>
        {editingAnalysis && <div className="flex gap-2"><Button onClick={saveAnalysis} disabled={savingAnalysis}>{savingAnalysis ? "Salvando…" : "Salvar análise"}</Button><Button variant="outline" onClick={() => setEditingAnalysis(false)} disabled={savingAnalysis}>Cancelar</Button></div>}
        <p className="text-xs text-muted-foreground">{analysis.limitation}</p>
      </>}
      {analysisMessage && <p role="status" className="text-sm">{analysisMessage}</p>}
    </section>
    <section className="space-y-3" aria-label="Metas mensais do cliente">
      <h4 className="font-semibold">Metas mensais do cliente</h4>
      <label className="block text-sm">Mês das metas<input aria-label="Mês das metas" type="month" value={month} onChange={event => { if (event.target.value) { setMonth(event.target.value); setMessage(""); } }} className="ml-2 rounded-md border bg-background p-2" /></label>
      <p className="text-xs text-muted-foreground">Acompanhamento do mês selecionado, independente do período do relatório. Deixe em branco as metas que não se aplicam. Compras e receita seguem a atribuição da Meta; custo por lead é um limite máximo.</p>
      {goals.isError ? <p role="alert">Não foi possível carregar as metas. Tente atualizar a página.</p> : <>
        <fieldset disabled={readOnly || saving || goals.isPending} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{goalMetrics.map(metric => {
          const target = goals.data?.targets[metric.key];
          const actual = actuals[metric.index].value;
          const progress = target ? goalProgress(target, actual, metric.lower) : null;
          return <div key={metric.key} className="rounded-lg border p-3 space-y-2">
            <label className="block text-sm font-medium">{metric.label}<input aria-label={`Meta mensal: ${metric.label}`} type="number" min="0.01" step={metric.unit === "number" ? "1" : "0.01"} value={draft[metric.key] || ""} onChange={event => setDraft(old => ({ ...old, [metric.key]: event.target.value }))} placeholder="Sem meta" className="mt-1 block w-full rounded-md border bg-background p-2" /></label>
            <p className="text-sm">Realizado: {monthly.isPending ? "Carregando…" : monthly.isError ? "Indisponível" : formatGoal(actual, metric.unit, currency)}</p>
            {progress && <><p className="text-xs text-muted-foreground">Meta salva: {formatGoal(target!, metric.unit, currency)} · {progress.percent === null ? "Sem dados para avaliar" : `${progress.percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% atingido`}</p>
              {progress.percent !== null && <><div role="progressbar" aria-label={`Atingimento: ${metric.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, progress.percent))} className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }} /></div><p className="text-sm">{progress.achieved ? "Meta atingida" : `${metric.lower ? "Reduzir em" : "Faltam"} ${formatGoal(progress.gap, metric.unit, currency)}`}</p></>}
            </>}
          </div>;
        })}</fieldset>
        {!readOnly && <Button disabled={saving || goals.isPending} onClick={save}>{saving ? "Salvando…" : "Salvar metas mensais"}</Button>}
      </>}
      {message && <p role="status" className="text-sm">{message}</p>}
    </section>
  </div>;
}
