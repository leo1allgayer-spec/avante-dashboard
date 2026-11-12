import { useMemo, useState } from "react";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useClientReports } from "@/hooks/clients/useClientReports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { parseReport, reportNumber } from "@/lib/reportImport";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function ClientReports({ clientId, historyOnly = false }: { clientId: string; historyOnly?: boolean }) {
  const { reports, loading, upload, remove, download } = useClientReports(clientId);
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [reportDate, setReportDate] = useState(today());
  const [campaign, setCampaign] = useState("Vendas");
  const [period, setPeriod] = useState("");
  const [investment, setInvestment] = useState("");
  const [impressions, setImpressions] = useState("");
  const [clicks, setClicks] = useState("");
  const [orders, setOrders] = useState("");
  const [revenue, setRevenue] = useState("");
  const [notes, setNotes] = useState("");
  const [reading, setReading] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [reviewed, setReviewed] = useState(true);
  const fillFromText = (text: string) => {
    const data = parseReport(text);
    setInvestment(data.investment); setImpressions(data.impressions);
    setClicks(data.clicks); setOrders(data.orders); setRevenue(data.revenue);
    setCampaign(data.campaign); setPeriod(data.period);
    const count = Object.values(data).filter(Boolean).length;
    setReviewed(false);
    setImportStatus(count ? `${count} campos identificados. Confira os valores e complete os campos não reconhecidos.` : "Nenhum campo identificado. Edite o texto ou preencha os indicadores manualmente.");
  };
  const readImage = async (image: File) => {
    if (!/^image\/(png|jpeg|webp)$/.test(image.type) || image.size > 15 * 1024 * 1024) {
      toast({ title: "Use uma imagem PNG, JPEG ou WebP de até 15 MB", variant: "destructive" }); return;
    }
    setReading(true); setReviewed(false); setImportStatus("Preparando leitura da imagem…");
    let worker: Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>> | undefined;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("por", 1, { logger: (message) => {
        if (message.status === "recognizing text") setImportStatus(`Lendo imagem: ${Math.round(message.progress * 100)}%`);
      } });
      const result = await worker.recognize(image);
      setSourceText(result.data.text);
      fillFromText(result.data.text);
    } catch {
      setImportStatus("Não foi possível ler a imagem. Tente outra imagem ou cole o texto do relatório abaixo.");
    } finally { await worker?.terminate(); setReading(false); }
  };
  const values = useMemo(() => {
    const spend = reportNumber(investment) || 0;
    const shown = Number(impressions) || 0;
    const clicked = Number(clicks) || 0;
    const bought = Number(orders) || 0;
    const total = reportNumber(revenue) || 0;
    return { spend, shown, clicked, bought, total, ctr: shown ? clicked / shown * 100 : 0, cpc: clicked ? spend / clicked : 0, cpo: bought ? spend / bought : 0, roas: spend ? total / spend : 0 };
  }, [investment, impressions, clicks, orders, revenue]);
  const generatedDescription = useMemo(() => {
    const efficiency = "os resultados informados para o período";
    const reading = values.clicked === 0 ? "Não houve cliques registrados no período." : `A campanha gerou ${values.clicked.toLocaleString("pt-BR")} clique(s), com CTR de ${values.ctr.toFixed(2).replace(".", ",")}%.`;
    const nextStep = "Comparar os resultados com as metas, a margem e o histórico da campanha antes de alterar o investimento. O ROAS representa receita por real investido em anúncios e não mede lucro.";
    return `RELATÓRIO SEMANAL DE PERFORMANCE\n${"=".repeat(34)}\nCampanha: ${campaign || "Não informada"}\nPeríodo: ${period || "Não informado"}\n\nRESUMO EXECUTIVO\nA campanha apresentou ${efficiency}, com ROAS de ${values.roas.toFixed(2).replace(".", ",")}x e faturamento de R$ ${values.total.toFixed(2).replace(".", ",")}. ${reading}\n\nINDICADORES PRINCIPAIS\nInvestimento em anúncios: R$ ${values.spend.toFixed(2).replace(".", ",")}\nFaturamento: R$ ${values.total.toFixed(2).replace(".", ",")}\nImpressões: ${values.shown.toLocaleString("pt-BR")}\nCliques: ${values.clicked.toLocaleString("pt-BR")}\nCTR: ${values.ctr.toFixed(2).replace(".", ",")}%\nPedidos: ${values.bought.toLocaleString("pt-BR")}\nCusto por clique: R$ ${values.cpc.toFixed(2).replace(".", ",")}\nCusto por pedido: R$ ${values.cpo.toFixed(2).replace(".", ",")}\nROAS: ${values.roas.toFixed(2).replace(".", ",")}x\n\nRECOMENDAÇÃO\n${nextStep}${notes ? `\n\nOBSERVAÇÕES DO GESTOR\n${notes}` : ""}`;
  }, [campaign, period, values, notes]);

  const submit = async () => {
    if (reading || !reviewed) { toast({ title: "Revise e confirme os dados importados", variant: "destructive" }); return; }
    if (!campaign.trim() || !period.trim()) { toast({ title: "Preencha campanha e período", variant: "destructive" }); return; }
    if ([investment, impressions, clicks, orders, revenue].some((value) => !value.trim() || !Number.isFinite(reportNumber(value)) || reportNumber(value) < 0)) {
      toast({ title: "Preencha todos os indicadores com números válidos. Use 0 apenas quando o resultado for zero.", variant: "destructive" }); return;
    }
    try {
      const reportFile = new File([generatedDescription], `${campaign.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${reportDate}.txt`, { type: "text/plain" });
      await upload.mutateAsync({ file: reportFile, title: title || `Relatório semanal · ${campaign}`, description: generatedDescription, reportDate });
      setTitle(""); setCampaign("Vendas"); setPeriod(""); setInvestment(""); setImpressions(""); setClicks(""); setOrders(""); setRevenue(""); setNotes("");
      setSourceText(""); setImportStatus(""); setReviewed(true);
      toast({ title: "Relatório armazenado" });
    } catch (error: any) {
      toast({ title: "Erro ao armazenar relatório", description: error.message, variant: "destructive" });
    }
  };

  return <div className="space-y-5">
    {!historyOnly && <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resultados das campanhas de anúncios</h3><p className="mb-4 text-xs text-muted-foreground">Informe os números da campanha e o dashboard gera automaticamente um relatório semanal profissional com indicadores calculados.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-3 rounded-lg border border-primary/30 p-4 md:col-span-3">
          <Label htmlFor="report-image">Importar dados de um print</Label>
          <Input id="report-image" type="file" accept="image/png,image/jpeg,image/webp" disabled={reading || upload.isPending} onChange={(e) => { const image = e.target.files?.[0]; if (image) void readImage(image); e.target.value = ""; }} />
          <p className="text-xs text-muted-foreground">Use uma imagem com os nomes dos indicadores e seus valores, como o relatório semanal. Tabelas com várias campanhas podem exigir preenchimento manual.</p>
          <Label htmlFor="report-source">Texto do relatório (cole aqui ou revise a leitura da imagem)</Label>
          <Textarea id="report-source" value={sourceText} disabled={reading} onChange={(e) => setSourceText(e.target.value)} />
          <Button variant="outline" disabled={reading || !sourceText.trim()} onClick={() => fillFromText(sourceText)}>Preencher com este texto</Button>
          <p role="status" className="text-sm">{importStatus}</p>
          {!reviewed && !reading && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />Conferi os campos preenchidos abaixo</label>}
        </div>
        <div><Label>Data do relatório</Label><Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} /></div>
        <div><Label>Campanha</Label><Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Vendas" /></div>
        <div><Label>Período</Label><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="17/09 a 23/09" /></div>
        <div><Label>Título (opcional)</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Relatório semanal" /></div>
        <div><Label>Investimento (R$)</Label><Input inputMode="decimal" value={investment} onChange={(e) => setInvestment(e.target.value)} placeholder="9,56" /></div>
        <div><Label>Impressões</Label><Input type="number" min="0" value={impressions} onChange={(e) => setImpressions(e.target.value)} placeholder="1035" /></div>
        <div><Label>Cliques</Label><Input type="number" min="0" value={clicks} onChange={(e) => setClicks(e.target.value)} placeholder="2" /></div>
        <div><Label>Pedidos</Label><Input type="number" min="0" value={orders} onChange={(e) => setOrders(e.target.value)} placeholder="3" /></div>
        <div><Label>Faturamento (R$)</Label><Input inputMode="decimal" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="177,88" /></div>
        <div className="md:col-span-3"><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resumo, aprendizados e próximos testes da campanha" /></div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm md:col-span-3"><strong>Prévia calculada:</strong> CTR {values.ctr.toFixed(2).replace(".", ",")}% · CPC R$ {values.cpc.toFixed(2).replace(".", ",")} · Custo por pedido R$ {values.cpo.toFixed(2).replace(".", ",")} · ROAS {values.roas.toFixed(2).replace(".", ",")}x</div>
        <div className="flex items-end"><Button className="w-full gap-2" disabled={upload.isPending || reading || !reviewed} onClick={() => void submit()}>{upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Gerar relatório</Button></div>
      </div>
    </div>}
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4"><h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Histórico de relatórios</h3></div>
      {loading ? <div className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : reports.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhum relatório armazenado.</div> : <div className="divide-y divide-border">{reports.map((report) => <div key={report.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><FileText className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="font-semibold">{report.title}</p><p className="text-xs text-muted-foreground">{new Date(`${report.report_date}T12:00:00`).toLocaleDateString("pt-BR")} · {report.file_name} · {formatSize(report.file_size)}</p>{report.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{report.description}</p>}</div><div className="flex gap-1"><Button size="icon" variant="outline" title="Abrir relatório" onClick={() => void download(report)}><Download className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" title="Excluir relatório" disabled={remove.isPending} onClick={() => void remove.mutateAsync(report)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>}
    </div>
  </div>;
}
