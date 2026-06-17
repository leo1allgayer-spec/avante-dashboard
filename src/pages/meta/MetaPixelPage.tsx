import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  Eye,
  MousePointerClick,
  RefreshCw,
  AlertTriangle,
  LayoutDashboard,
  Megaphone,
  Layers,
  Cpu,
  Settings as SettingsIcon,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Estilos específicos da Meta
import "@/styles/meta/global.css";
import "@/styles/meta/dashboard.css";

// Utils & Componentes
import { generateMockData } from "@/utils/meta/mockData";
import type { DashboardMetrics } from "@/utils/meta/mockData";
import { fetchMetaInsights } from "@/utils/meta/metaApi";
import type { MetaCredentials } from "@/utils/meta/metaApi";
import { KpiCard } from "@/components/meta/KpiCard";
import { CampaignsView } from "@/components/meta/CampaignsView";
import { CreativesView } from "@/components/meta/CreativesView";
import { CapiSimulator } from "@/components/meta/CapiSimulator";
import { SettingsView } from "@/components/meta/SettingsView";
import DashboardLayout from "@/components/DashboardLayout";

export default function MetaPixelPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "campaigns" | "creatives" | "capi" | "settings">("overview");
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false); // Sempre começa no modo Real para a Avante
  const [credentials, setCredentials] = useState<MetaCredentials>({
    pixelId: "3118022051838271",
    capiToken: "EAAJuG2qVusgBRolxkQN6J07ZAeHOGuChHisR8Eb2AWM533MQYqHuhR0R2MFtcmZCjOOelUNUqxHtTFZByLsJDk54cdLQgV4x4voEnyBQiPDdL1Vn3Skhee4BipSjb5XqjaIJUQorfLu0QODIrpoIsNXkHZAZAZBmvnnhzl5ZAb90LM86GqzxN809bbcNej4pQZDZD",
    adAccountId: "821406542700599",
  });

  const [realInsights, setRealInsights] = useState<any[] | null>(null);
  const [realLoading, setRealLoading] = useState(false);
  const [realError, setRealError] = useState<string | null>(null);

  // 1. Carrega credenciais do localStorage ou usa as da Avante por padrão
  useEffect(() => {
    const savedPixel = localStorage.getItem("avante_meta_pixel_id") || "3118022051838271";
    const savedCapi = localStorage.getItem("avante_meta_capi_token") || "EAAJuG2qVusgBRolxkQN6J07ZAeHOGuChHisR8Eb2AWM533MQYqHuhR0R2MFtcmZCjOOelUNUqxHtTFZByLsJDk54cdLQgV4x4voEnyBQiPDdL1Vn3Skhee4BipSjb5XqjaIJUQorfLu0QODIrpoIsNXkHZAZAZBmvnnhzl5ZAb90LM86GqzxN809bbcNej4pQZDZD";
    const savedAdAccount = localStorage.getItem("avante_meta_ad_account_id") || "821406542700599";

    const creds = { pixelId: savedPixel, capiToken: savedCapi, adAccountId: savedAdAccount };
    setCredentials(creds);
    setIsSimulatedMode(false);
  }, []);

  // 2. Busca dados reais se as credenciais estiverem disponíveis e o modo real estiver ativo
  useEffect(() => {
    if (isSimulatedMode || !credentials.adAccountId || !credentials.capiToken) {
      setRealInsights(null);
      setRealError(null);
      return;
    }

    const loadRealData = async () => {
      setRealLoading(true);
      setRealError(null);
      
      const response = await fetchMetaInsights(credentials);
      
      if (response.success) {
        setRealInsights(response.data);
      } else {
        setRealError(response.error || "Falha ao consultar insights da Meta Ads API.");
      }
      setRealLoading(false);
    };

    loadRealData();
  }, [isSimulatedMode, credentials]);

  // 3. Mock Data padrão estruturado
  const mockMetrics = useMemo(() => generateMockData(), []);

  // 4. Agrega e mescla dados (se vem da API real ou Mock)
  const metrics: DashboardMetrics = useMemo(() => {
    if (isSimulatedMode || !realInsights || realInsights.length === 0) {
      return mockMetrics;
    }

    try {
      let totalSpend = 0;
      let totalLeads = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalRevenue = 0;

      const formattedCampaigns = realInsights.map((apiCampaign: any, index: number) => {
        const spend = Number(apiCampaign.spend || 0);
        const clicks = Number(apiCampaign.clicks || 0);
        const impressions = Number(apiCampaign.impressions || 0);
        
        let leads = 0;
        if (apiCampaign.actions) {
          const leadAction = apiCampaign.actions.find(
            (action: any) =>
              action.action_type === "lead" || 
              action.action_type === "offsite_conversion.fb_pixel_lead" ||
              action.action_type === "onsite_conversion.messaging_first_reply"
          );
          leads = Number(leadAction?.value || 0);
        }

        let revenue = 0;
        if (apiCampaign.action_values) {
          const purchaseVal = apiCampaign.action_values.find(
            (action: any) => action.action_type === "purchase" || action.action_type === "offsite_conversion.fb_pixel_purchase"
          );
          revenue = Number(purchaseVal?.value || 0);
        }

        if (revenue === 0 && leads > 0) {
          revenue = Math.round(leads * 0.12 * 197 * 100) / 100;
        }

        totalSpend += spend;
        totalLeads += leads;
        totalImpressions += impressions;
        totalClicks += clicks;
        totalRevenue += revenue;

        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const cpl = leads > 0 ? spend / leads : 0;
        const roas = spend > 0 ? revenue / spend : 0;

        return {
          id: apiCampaign.campaign_id || `real_c_${index}`,
          name: apiCampaign.campaign_name || "Campanha sem nome",
          status: "ACTIVE" as const,
          objective: "OUTCOMES",
          budget: 150,
          spend,
          impressions,
          clicks,
          leads,
          revenue,
          ctr,
          cpc,
          cpl,
          roas,
          adsets: [],
        };
      });

      const averageRoas = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0;
      const averageCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0;
      const averageCpc = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0;
      const averageCpl = totalLeads > 0 ? Math.round((totalSpend / totalLeads) * 100) / 100 : 0;

      return {
        totalSpend,
        totalRevenue,
        totalLeads,
        totalImpressions,
        totalClicks,
        averageRoas,
        averageCtr,
        averageCpc,
        averageCpl,
        campaigns: formattedCampaigns,
        dailyHistory: mockMetrics.dailyHistory,
      };
    } catch (e) {
      console.error("Erro ao processar insights reais:", e);
      return mockMetrics;
    }
  }, [isSimulatedMode, mockMetrics, realInsights]);

  // 5. Salvar credenciais localmente
  const handleSaveCredentials = (creds: MetaCredentials) => {
    setCredentials(creds);
    localStorage.setItem("avante_meta_pixel_id", creds.pixelId);
    localStorage.setItem("avante_meta_capi_token", creds.capiToken);
    localStorage.setItem("avante_meta_ad_account_id", creds.adAccountId);
    setIsSimulatedMode(false);
  };

  // 6. Limpar credenciais
  const handleClearCredentials = () => {
    setCredentials({ pixelId: "", capiToken: "", adAccountId: "" });
    localStorage.removeItem("avante_meta_pixel_id");
    localStorage.removeItem("avante_meta_capi_token");
    localStorage.removeItem("avante_meta_ad_account_id");
    setIsSimulatedMode(true);
    setRealInsights(null);
    setRealError(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <DashboardLayout
      title="Meta Pixel & CAPI Hub"
      subtitle="Gerenciamento de Pixel, Conversões CAPI e performance de Ads"
      actions={
        <div className="data-mode-toggle" style={{ margin: 0 }}>
          <button
            className={`toggle-btn ${isSimulatedMode ? "active" : ""}`}
            onClick={() => setIsSimulatedMode(true)}
          >
            Simulação
          </button>
          <button
            className={`toggle-btn ${!isSimulatedMode ? "active" : ""}`}
            onClick={() => {
              if (!credentials.pixelId || !credentials.capiToken || !credentials.adAccountId) {
                alert("Por favor, configure e salve suas credenciais da Meta antes de ativar o Modo Real.");
                setActiveTab("settings");
              } else {
                setIsSimulatedMode(false);
              }
            }}
          >
            Modo Real
          </button>
        </div>
      }
    >
      <div className="meta-pixel-theme flex flex-col gap-6 w-full text-foreground">
        
        {/* Sub-Navegação de abas internas do Pixel */}
        <div className="flex border-b border-border/40 gap-1 pb-px overflow-x-auto">
          <button
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-semibold transition-all ${
              activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("overview")}
          >
            <LayoutDashboard size={16} />
            Visão Geral
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-semibold transition-all ${
              activeTab === "campaigns" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("campaigns")}
          >
            <Megaphone size={16} />
            Campanhas
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-semibold transition-all ${
              activeTab === "creatives" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("creatives")}
          >
            <Layers size={16} />
            Criativos
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-semibold transition-all ${
              activeTab === "capi" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("capi")}
          >
            <Cpu size={16} />
            Simulador CAPI
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-semibold transition-all ${
              activeTab === "settings" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("settings")}
          >
            <SettingsIcon size={16} />
            Configurações
          </button>
        </div>

        {/* Notificação de Erro na API Real */}
        {!isSimulatedMode && realError && (
          <div className="simulation-banner">
            <AlertTriangle />
            <div className="simulation-banner-text text-left">
              <h4>Erro na Meta API (Usando Fallback Simulador)</h4>
              <p>{realError}. Mostrando dados fictícios de alta performance para manter a visualização.</p>
            </div>
          </div>
        )}

        {/* Loading Spinner para API Real */}
        {realLoading && (
          <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/25 rounded-md">
            <RefreshCw size={18} className="animate-spin text-primary" />
            <span className="text-sm font-semibold">Sincronizando dados com a Meta Ads API em tempo real...</span>
          </div>
        )}

        {/* RENDERIZAÇÃO DAS SUB-ABAS */}
        
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6">
            
            {/* KPI Cards Grid */}
            <div className="grid-4 kpis-grid">
              <KpiCard
                label="Gasto em Anúncios"
                value={formatCurrency(metrics.totalSpend)}
                icon={<DollarSign />}
                trend={{ value: 8.2, isPositive: false }}
                variant="spend"
              />
              
              <KpiCard
                label="Faturamento Atribuído"
                value={formatCurrency(metrics.totalRevenue)}
                icon={<TrendingUp />}
                trend={{ value: 14.8, isPositive: true }}
                variant="revenue"
              />
              
              <KpiCard
                label="ROAS Médio Geral"
                value={`${metrics.averageRoas.toFixed(2)}x`}
                icon={<TrendingUp />}
                trend={{ value: 21.2, isPositive: true }}
                variant="roas"
              />
              
              <KpiCard
                label="Leads Convertidos"
                value={metrics.totalLeads.toLocaleString()}
                icon={<Users />}
                trend={{ value: 11.5, isPositive: true }}
                variant="conversions"
              />
            </div>

            {/* Painel de Gráficos Recharts */}
            <div className="glass-panel chart-section text-left">
              <div className="chart-header flex justify-between items-center mb-6">
                <div className="chart-title">
                  <h2 className="text-lg font-bold text-foreground">Tendência de Retorno e ROAS Diário</h2>
                  <p className="text-xs text-muted-foreground mt-1">Comparativo dinâmico de valor investido contra faturamento nos últimos 30 dias.</p>
                </div>
                
                <div className="chart-legend flex gap-4">
                  <div className="legend-item flex items-center gap-2">
                    <span className="legend-color spend" style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "hsl(var(--color-spend))" }} />
                    <span className="text-xs font-medium text-muted-foreground">Gasto</span>
                  </div>
                  <div className="legend-item flex items-center gap-2">
                    <span className="legend-color revenue" style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "hsl(var(--color-revenue))" }} />
                    <span className="text-xs font-medium text-muted-foreground">Faturamento</span>
                  </div>
                </div>
              </div>

              <div className="chart-container" style={{ height: "320px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={metrics.dailyHistory}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--color-spend))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--color-spend))" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--color-revenue))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--color-revenue))" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255, 255, 255, 0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgba(255, 255, 255, 0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `R$${val}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="custom-tooltip">
                              <div className="tooltip-date">Dia: {label}</div>
                              <div className="tooltip-row spend">
                                <span>Gasto:</span>
                                <strong>{formatCurrency(data.spend)}</strong>
                              </div>
                              <div className="tooltip-row revenue">
                                <span>Faturamento:</span>
                                <strong>{formatCurrency(data.revenue)}</strong>
                              </div>
                              <div className="tooltip-row roas">
                                <span>ROAS:</span>
                                <strong>{data.roas.toFixed(2)}x</strong>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="hsl(var(--color-spend))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSpend)"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--color-revenue))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Eficiência cards */}
            <div className="grid-3">
              <div className="glass-panel flex gap-4 items-center p-6 text-left">
                <div className="p-3 bg-blue-500/10 rounded-md text-blue-500">
                  <Eye />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Visualizações & CTR</div>
                  <div className="text-xl font-bold mt-1">
                    {metrics.totalImpressions.toLocaleString()} <span className="text-xs text-muted-foreground font-semibold">(CTR: {metrics.averageCtr.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
              
              <div className="glass-panel flex gap-4 items-center p-6 text-left">
                <div className="p-3 bg-purple-500/10 rounded-md text-purple-500">
                  <MousePointerClick />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cliques & CPC</div>
                  <div className="text-xl font-bold mt-1">
                    {metrics.totalClicks.toLocaleString()} <span className="text-xs text-muted-foreground font-semibold">(CPC: {formatCurrency(metrics.averageCpc)})</span>
                  </div>
                </div>
              </div>

              <div className="glass-panel flex gap-4 items-center p-6 text-left">
                <div className="p-3 bg-amber-500/10 rounded-md text-amber-500">
                  <Users />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Custo por Lead (CPL)</div>
                  <div className="text-xl font-bold mt-1">
                    {formatCurrency(metrics.averageCpl)} <span className="text-xs text-muted-foreground font-semibold">(Ticket Médio: R$197,00)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === "campaigns" && (
          <CampaignsView campaigns={metrics.campaigns} />
        )}

        {activeTab === "creatives" && (
          <CreativesView campaigns={metrics.campaigns} />
        )}

        {activeTab === "capi" && (
          <CapiSimulator credentials={credentials} isSimulatedMode={isSimulatedMode} />
        )}

        {activeTab === "settings" && (
          <SettingsView
            credentials={credentials}
            onSave={handleSaveCredentials}
            onClear={handleClearCredentials}
          />
        )}

      </div>
    </DashboardLayout>
  );
}
