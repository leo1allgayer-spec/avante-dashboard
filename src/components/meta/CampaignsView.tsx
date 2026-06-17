import React, { useState } from "react";
import { Search, ChevronDown, ChevronRight, BarChart2 } from "lucide-react";
import type { CampaignData } from "../utils/mockData";

interface CampaignsViewProps {
  campaigns: CampaignData[];
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({ campaigns }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedCampaigns((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getRoasClass = (roas: number) => {
    if (roas >= 3) return "roas-badge excellent";
    if (roas >= 1.5) return "roas-badge good";
    return "roas-badge poor";
  };

  // Formatação de Dinheiro em Reais
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Filtragem
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && campaign.status === "ACTIVE") ||
      (statusFilter === "PAUSED" && campaign.status === "PAUSED");
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="glass-panel table-section animate-fade-in">
      <div className="table-header">
        <div className="search-input-container">
          <Search />
          <input
            type="text"
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="data-mode-toggle">
          <button
            className={`toggle-btn ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            Todas
          </button>
          <button
            className={`toggle-btn ${statusFilter === "ACTIVE" ? "active" : ""}`}
            onClick={() => setStatusFilter("ACTIVE")}
          >
            Ativas
          </button>
          <button
            className={`toggle-btn ${statusFilter === "PAUSED" ? "active" : ""}`}
            onClick={() => setStatusFilter("PAUSED")}
          >
            Pausadas
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}></th>
              <th>Nome da Campanha</th>
              <th>Status</th>
              <th>Gasto (R$)</th>
              <th>Cliques</th>
              <th>CTR</th>
              <th>CPC</th>
              <th>Leads</th>
              <th>Faturamento</th>
              <th>ROAS</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", color: "hsl(var(--text-secondary))", padding: "40px" }}>
                  Nenhuma campanha encontrada com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredCampaigns.map((campaign) => {
                const isExpanded = expandedCampaigns[campaign.id];
                return (
                  <React.Fragment key={campaign.id}>
                    {/* Linha da Campanha */}
                    <tr
                      className={`campaign-row ${isExpanded ? "expanded" : ""}`}
                      onClick={() => toggleExpand(campaign.id)}
                    >
                      <td style={{ textAlign: "center" }}>
                        {isExpanded ? (
                          <ChevronDown size={18} className="chevron-icon" style={{ color: "hsl(var(--text-muted))" }} />
                        ) : (
                          <ChevronRight size={18} className="chevron-icon" style={{ color: "hsl(var(--text-muted))" }} />
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <BarChart2 size={16} style={{ color: "hsl(var(--color-spend))" }} />
                          {campaign.name}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${campaign.status.toLowerCase()}`}>
                          <span className="status-circle"></span>
                          {campaign.status === "ACTIVE" ? "Ativa" : "Pausada"}
                        </span>
                      </td>
                      <td style={{ color: "hsl(var(--color-spend))", fontWeight: 700 }}>
                        {formatCurrency(campaign.spend)}
                      </td>
                      <td>{campaign.clicks.toLocaleString()}</td>
                      <td>{campaign.ctr.toFixed(2)}%</td>
                      <td>{formatCurrency(campaign.cpc)}</td>
                      <td style={{ fontWeight: 700 }}>{campaign.leads}</td>
                      <td style={{ color: "hsl(var(--color-revenue))", fontWeight: 700 }}>
                        {formatCurrency(campaign.revenue)}
                      </td>
                      <td>
                        <span className={getRoasClass(campaign.roas)}>
                          {campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : "0.00x"}
                        </span>
                      </td>
                    </tr>

                    {/* Conteúdo Drilldown quando Expandida */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} style={{ padding: 0 }}>
                          <div className="drilldown-container animate-fade-in">
                            <div className="drilldown-header">Conjuntos de Anúncios (Ad Sets)</div>
                            
                            <table className="custom-table" style={{ border: "1px solid hsl(var(--border-color))", background: "rgba(0, 0, 0, 0.1)", borderRadius: "var(--radius-sm)" }}>
                              <thead>
                                <tr style={{ background: "rgba(255,255,255,0.01)" }}>
                                  <th>Nome do Conjunto</th>
                                  <th>Status</th>
                                  <th>Gasto</th>
                                  <th>Cliques</th>
                                  <th>CTR</th>
                                  <th>CPC</th>
                                  <th>Leads</th>
                                  <th>Faturamento</th>
                                  <th>ROAS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {campaign.adsets.map((adset) => (
                                  <React.Fragment key={adset.id}>
                                    <tr style={{ background: "transparent" }}>
                                      <td style={{ fontWeight: 600, paddingLeft: "15px" }}>
                                        🎯 {adset.name}
                                      </td>
                                      <td>
                                        <span className={`status-badge ${adset.status.toLowerCase()}`}>
                                          <span className="status-circle"></span>
                                          {adset.status === "ACTIVE" ? "Ativo" : "Pausado"}
                                        </span>
                                      </td>
                                      <td style={{ color: "hsl(var(--color-spend))" }}>{formatCurrency(adset.spend)}</td>
                                      <td>{adset.clicks}</td>
                                      <td>{adset.ctr.toFixed(2)}%</td>
                                      <td>{formatCurrency(adset.cpc)}</td>
                                      <td style={{ fontWeight: 700 }}>{adset.leads}</td>
                                      <td style={{ color: "hsl(var(--color-revenue))" }}>{formatCurrency(adset.revenue)}</td>
                                      <td>
                                        <span className={getRoasClass(adset.roas)}>
                                          {adset.roas.toFixed(2)}x
                                        </span>
                                      </td>
                                    </tr>
                                    
                                    {/* Sub-tabela de Criativos individuais */}
                                    <tr>
                                      <td colSpan={9} style={{ padding: "0 0 10px 40px", borderBottom: "1px solid hsl(var(--border-color))" }}>
                                        <div style={{ borderLeft: "2px solid hsl(var(--border-color))", paddingLeft: "15px", marginTop: "5px" }}>
                                          <div className="drilldown-header" style={{ fontSize: "11px", marginBottom: "8px" }}>Anúncios (Criativos)</div>
                                          <table className="custom-table" style={{ fontSize: "13px", background: "rgba(255, 255, 255, 0.005)" }}>
                                            <thead>
                                              <tr style={{ background: "rgba(0,0,0,0.15)" }}>
                                                <th>Nome do Anúncio</th>
                                                <th>Tipo</th>
                                                <th>Gasto</th>
                                                <th>Cliques</th>
                                                <th>CTR</th>
                                                <th>Leads</th>
                                                <th>Faturamento</th>
                                                <th>ROAS</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {adset.ads.map((ad) => (
                                                <tr key={ad.id} style={{ background: "transparent" }}>
                                                  <td style={{ fontWeight: 500, color: "hsl(var(--text-primary))" }}>🖼️ {ad.name}</td>
                                                  <td style={{ textTransform: "capitalize", fontSize: "11px" }}>{ad.type === "video" ? "🎬 Vídeo" : "🖼️ Imagem"}</td>
                                                  <td style={{ color: "hsl(var(--color-spend))" }}>{formatCurrency(ad.spend)}</td>
                                                  <td>{ad.clicks}</td>
                                                  <td>{ad.ctr.toFixed(2)}%</td>
                                                  <td style={{ fontWeight: 700 }}>{ad.leads}</td>
                                                  <td style={{ color: "hsl(var(--color-revenue))" }}>{formatCurrency(ad.revenue)}</td>
                                                  <td>
                                                    <span className={getRoasClass(ad.roas)} style={{ fontSize: "11px", padding: "2px 6px" }}>
                                                      {ad.roas.toFixed(2)}x
                                                    </span>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default CampaignsView;
