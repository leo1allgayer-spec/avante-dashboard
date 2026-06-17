import React, { useState, useMemo } from "react";
import { Film, Image as ImageIcon, SlidersHorizontal } from "lucide-react";
import type { CreativeData, CampaignData } from "../utils/mockData";

interface CreativesViewProps {
  campaigns: CampaignData[];
}

export const CreativesView: React.FC<CreativesViewProps> = ({ campaigns }) => {
  const [sortBy, setSortBy] = useState<"roas" | "spend" | "leads" | "ctr">("roas");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "image" | "video">("ALL");

  // Extrai todos os criativos de todas as campanhas e adsets de forma única
  const allCreatives = useMemo(() => {
    const list: CreativeData[] = [];
    const ids = new Set<string>();

    campaigns.forEach((campaign) => {
      campaign.adsets.forEach((adset) => {
        adset.ads.forEach((ad) => {
          if (!ids.has(ad.id)) {
            ids.add(ad.id);
            list.push(ad);
          }
        });
      });
    });

    return list;
  }, [campaigns]);

  // Filtra e Ordena os criativos
  const processedCreatives = useMemo(() => {
    let result = [...allCreatives];

    // Filtro por Tipo
    if (typeFilter !== "ALL") {
      result = result.filter((ad) => ad.type === typeFilter);
    }

    // Ordenação
    result.sort((left, right) => {
      if (sortBy === "roas") return right.roas - left.roas;
      if (sortBy === "spend") return right.spend - left.spend;
      if (sortBy === "leads") return right.leads - left.leads;
      if (sortBy === "ctr") return right.ctr - left.ctr;
      return 0;
    });

    return result;
  }, [allCreatives, sortBy, typeFilter]);

  // Formata moeda
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      {/* Controles de Ordenação e Filtro */}
      <div className="glass-panel" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <SlidersHorizontal size={18} style={{ color: "hsl(var(--color-spend))" }} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Ordenar por:</span>
          <select
            className="form-input"
            style={{ width: "160px", padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: "13px", height: "auto" }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="roas">Melhor ROAS</option>
            <option value="spend">Maior Gasto</option>
            <option value="leads">Mais Leads</option>
            <option value="ctr">Maior CTR</option>
          </select>
        </div>

        <div className="data-mode-toggle" style={{ margin: 0 }}>
          <button
            className={`toggle-btn ${typeFilter === "ALL" ? "active" : ""}`}
            onClick={() => setTypeFilter("ALL")}
          >
            Todos
          </button>
          <button
            className={`toggle-btn ${typeFilter === "image" ? "active" : ""}`}
            onClick={() => setTypeFilter("image")}
          >
            Imagens
          </button>
          <button
            className={`toggle-btn ${typeFilter === "video" ? "active" : ""}`}
            onClick={() => setTypeFilter("video")}
          >
            Vídeos
          </button>
        </div>
      </div>

      {/* Grid de Criativos */}
      <div className="grid-3">
        {processedCreatives.map((creative) => (
          <div key={creative.id} className="glass-panel creative-card animate-fade-in">
            {/* Visualização de Mídia */}
            <div className="creative-media-container">
              <img src={creative.previewUrl} alt={creative.name} />
              <div className="creative-badge">
                {creative.type === "video" ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Film size={12} /> Vídeo
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <ImageIcon size={12} /> Imagem
                  </span>
                )}
              </div>
            </div>

            {/* Info e Métricas */}
            <div className="creative-info">
              <div className="creative-name" title={creative.name}>
                {creative.name}
              </div>
              <div className="creative-headline" title={creative.headline}>
                "{creative.headline}"
              </div>

              <div className="creative-metrics-row">
                <div className="creative-metric">
                  <div className="creative-metric-label">Gasto</div>
                  <div className="creative-metric-value" style={{ color: "hsl(var(--color-spend))" }}>
                    {formatCurrency(creative.spend)}
                  </div>
                </div>

                <div className="creative-metric">
                  <div className="creative-metric-label">Leads</div>
                  <div className="creative-metric-value">{creative.leads}</div>
                </div>

                <div className="creative-metric">
                  <div className="creative-metric-label">ROAS</div>
                  <div
                    className="creative-metric-value"
                    style={{
                      color:
                        creative.roas >= 3
                          ? "hsl(var(--color-revenue))"
                          : creative.roas >= 1.5
                          ? "hsl(var(--color-warning))"
                          : "hsl(var(--color-danger))",
                      fontWeight: 800,
                    }}
                  >
                    {creative.roas > 0 ? `${creative.roas.toFixed(2)}x` : "0.00x"}
                  </div>
                </div>
              </div>

              {/* Métricas Extra em barra sutil de rodapé */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "hsl(var(--text-muted))", borderTop: "1px dashed hsl(var(--border-color))", paddingTop: "12px", marginTop: "12px" }}>
                <span>CTR: <strong style={{ color: "hsl(var(--text-primary))" }}>{creative.ctr.toFixed(2)}%</strong></span>
                <span>CPC: <strong style={{ color: "hsl(var(--text-primary))" }}>{formatCurrency(creative.cpc)}</strong></span>
                <span>CPL: <strong style={{ color: "hsl(var(--text-primary))" }}>{creative.cpl > 0 ? formatCurrency(creative.cpl) : "-"}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default CreativesView;
