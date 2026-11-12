import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useClientReports } from "@/hooks/clients/useClientReports";
import logo from "@/assets/logo-full.png";
import { reportMetrics, type MetaReport, type GoalSnapshot } from "@/lib/clientMetaReport";
const objectiveLabels: Record<string,string> = {
  OUTCOME_TRAFFIC:"Tráfego", TRAFFIC:"Tráfego", LINK_CLICKS:"Tráfego",
  OUTCOME_ENGAGEMENT:"Engajamento", ENGAGEMENT:"Engajamento", POST_ENGAGEMENT:"Engajamento",
  OUTCOME_SALES:"Vendas", CONVERSIONS:"Conversões", PRODUCT_CATALOG_SALES:"Vendas de catálogo",
  OUTCOME_LEADS:"Cadastros (leads)", LEAD_GENERATION:"Cadastros (leads)",
  OUTCOME_AWARENESS:"Reconhecimento", BRAND_AWARENESS:"Reconhecimento", REACH:"Alcance",
  OUTCOME_APP_PROMOTION:"Promoção de aplicativo", APP_INSTALLS:"Instalações de aplicativo", VIDEO_VIEWS:"Visualizações de vídeo", MESSAGES:"Mensagens",
};
export function MetaReportButton({
  clientId,
  clientName,
  load,
  goals,
  periodKey,
}: {
  clientId: string;
  clientName: string;
  load: () => Promise<MetaReport>;
  goals?: GoalSnapshot;
  periodKey?: string;
}) {
  const { upload } = useClientReports(clientId);
  const [busy, setBusy] = useState(false),
    [notes, setNotes] = useState(""),
    [message, setMessage] = useState("");
  const choices = reportMetrics(null);
  const [campaigns, setCampaigns] = useState<NonNullable<MetaReport["campaigns"]>>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const requestVersion = useRef(0);
  useEffect(() => {
    requestVersion.current++;
    setCampaigns([]);
    setSelectedCampaigns([]);
    setMessage("");
    return () => { requestVersion.current++; };
  }, [clientId, periodKey]);
  const [selectedMetrics, setSelectedMetrics] = useState<number[]>(
    choices.map((_, index) => index),
  );
  async function loadCampaigns() {
    const version = requestVersion.current;
    setBusy(true);
    setMessage("");
    try {
      const data = await load();
      if (version !== requestVersion.current) return;
      if (!data.campaigns?.length) throw new Error("Nenhuma campanha com resultados no período selecionado.");
      setCampaigns(data.campaigns);
      setSelectedCampaigns(current => campaigns.length ? current.filter(id => data.campaigns!.some(c => c.id === id)) : data.campaigns!.map(c => c.id));
    } catch (error) {
      if (version === requestVersion.current) setMessage(error instanceof Error ? error.message : "Não foi possível carregar as campanhas.");
    } finally { setBusy(false); }
  }
  async function generate() {
    const version = requestVersion.current;
    setBusy(true);
    setMessage("");
    try {
      const data = await load();
      if (version !== requestVersion.current) return;
      if (!data.campaigns?.length) throw new Error("Não foi possível obter os resultados separados por campanha. Atualize e tente novamente.");
      data.campaigns = data.campaigns.filter(campaign => selectedCampaigns.includes(campaign.id));
      if (!data.campaigns.length) throw new Error("Selecione pelo menos uma campanha com resultados no período.");
      const { createMetaReport } = await import("@/lib/clientMetaReport");
      const image = await fetch(logo).then((r) => r.blob());
      const encoded = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });
      const pdf = createMetaReport(
        data,
        clientName,
        encoded,
        notes,
        selectedMetrics,
        goals,
      );
      if (version !== requestVersion.current) return;
      const name = `Relatorio-Avante-Campanhas-${clientName.replace(/[^a-zA-Z0-9-]/g, "_")}-${data.current.date_stop}.pdf`;
      pdf.save(name);
      try {
        await upload.mutateAsync({
          file: new File([pdf.output("blob")], name, {
            type: "application/pdf",
          }),
          title: `Meta Ads · ${clientName}`,
          description: `Período: ${data.current.date_start} a ${data.current.date_stop}. ${data.campaigns.length} campanha(s), com resultados e comparativos separados.`,
          reportDate: data.current.date_stop,
        });
        setMessage("PDF baixado e salvo no histórico.");
      } catch {
        setMessage("PDF baixado, mas não foi possível salvar no histórico.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o relatório.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 border-t pt-4">
      <h4 className="font-semibold">Relatório Avante</h4>
      <p className="text-sm text-muted-foreground">
        PDF separado por campanha e objetivo, com indicadores, gráficos diários e comparativo com o período
        anterior de mesma duração.
      </p>
      <fieldset className="rounded-lg border p-3 space-y-3" disabled={busy}>
        <legend className="px-1 text-sm font-semibold">Campanhas do relatório</legend>
        <Button type="button" size="sm" variant="outline" onClick={loadCampaigns}>{busy ? "Carregando…" : campaigns.length ? "Atualizar campanhas" : "Carregar campanhas do período"}</Button>
        {!!campaigns.length && <>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setSelectedCampaigns(campaigns.map(c => c.id))}>Marcar todas as campanhas</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setSelectedCampaigns([])}>Desmarcar todas as campanhas</Button>
            <span className="text-xs text-muted-foreground">{selectedCampaigns.length} de {campaigns.length} selecionadas</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">{campaigns.map(campaign => <label key={campaign.id} className="flex items-start gap-3 rounded-lg border bg-background/40 p-3 cursor-pointer">
            <input type="checkbox" className="mt-1 accent-blue-500" checked={selectedCampaigns.includes(campaign.id)} onChange={e => setSelectedCampaigns(current => e.target.checked ? [...current,campaign.id] : current.filter(id => id !== campaign.id))} />
            <span className="min-w-0"><span className="block text-sm font-medium break-words">{campaign.name}</span><span className="block text-xs text-muted-foreground">Objetivo: {objectiveLabels[campaign.objective] || campaign.objective || "Não informado"}</span></span>
          </label>)}</div>
        </>}
        <p className="text-xs text-muted-foreground">Somente as campanhas marcadas entram no PDF e no arquivo salvo no histórico. Ao mudar o período, carregue a lista novamente.</p>
      </fieldset>
      <fieldset className="rounded-lg border p-3 space-y-3" disabled={busy}>
        <legend className="px-1 text-sm font-semibold">
          Métricas do relatório
        </legend>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelectedMetrics(choices.map((_, index) => index))}
          >
            Marcar todas
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelectedMetrics([])}
          >
            Desmarcar todas
          </Button>
          <span className="self-center text-xs text-muted-foreground">
            {selectedMetrics.length} selecionadas
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {choices.map((metric, index) => (
            <label
              key={metric.label}
              className="flex items-start gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                className="mt-1 accent-blue-500"
                checked={selectedMetrics.includes(index)}
                onChange={(e) =>
                  setSelectedMetrics((current) =>
                    e.target.checked
                      ? [...current, index].sort((a, b) => a - b)
                      : current.filter((id) => id !== index),
                  )
                }
              />
              {metric.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          A seleção vale para os indicadores, gráficos e comparativo do PDF.
        </p>
      </fieldset>
      <textarea
        aria-label="Observações para o relatório"
        className="w-full rounded-md border bg-background p-3"
        placeholder="Observações da equipe (opcional)"
        maxLength={4000}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button disabled={busy || !selectedMetrics.length || !selectedCampaigns.length} onClick={generate}>
        {busy ? "Gerando relatório…" : "Gerar relatório PDF"}
      </Button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
