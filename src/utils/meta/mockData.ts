/**
 * Utilitário de geração de dados ricos e de alto impacto visual para simulação da dashboard.
 * Representa uma operação ativa da Avante.digital com dados realistas de alta performance.
 */

export interface CreativeData {
  id: string;
  name: string;
  type: "image" | "video";
  status: "ACTIVE" | "PAUSED";
  previewUrl: string;
  headline: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpl: number;
  roas: number;
}

export interface AdSetData {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED";
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpl: number;
  roas: number;
  ads: CreativeData[];
}

export interface CampaignData {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED";
  objective: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpl: number;
  roas: number;
  adsets: AdSetData[];
}

export interface DailyMetrics {
  date: string;
  spend: number;
  revenue: number;
  leads: number;
  clicks: number;
  roas: number;
  cpl: number;
}

export interface DashboardMetrics {
  totalSpend: number;
  totalRevenue: number;
  totalLeads: number;
  totalImpressions: number;
  totalClicks: number;
  averageRoas: number;
  averageCtr: number;
  averageCpc: number;
  averageCpl: number;
  campaigns: CampaignData[];
  dailyHistory: DailyMetrics[];
}

// Imagens de ilustração reais usando gradientes SVG incorporados para evitar links externos quebrados
const MOCK_CREATIVES_SVG = {
  vendas_lead: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><defs><linearGradient id='g1' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%231e3a8a'/><stop offset='100%' stop-color='%233b82f6'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g1)'/><text x='50%' y='40%' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-size='24' font-family='sans-serif' font-weight='bold'>AVANTE DIGITAL</text><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='%23a7f3d0' font-size='16' font-family='sans-serif'>CURSO DE VENDAS 2.0</text><rect x='100' y='260' width='200' height='45' rx='10' fill='%2310b981'/><text x='50%' y='283%' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-size='14' font-family='sans-serif' font-weight='bold'>QUERO PARTICIPAR</text></svg>",
  escala_negocios: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><defs><linearGradient id='g2' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%234c1d95'/><stop offset='100%' stop-color='%238b5cf6'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g2)'/><text x='50%' y='40%' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-size='22' font-family='sans-serif' font-weight='bold'>ESCALA DE VENDAS</text><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='%23fef08a' font-size='16' font-family='sans-serif'>Fature 7 Dígitos no WhatsApp</text><rect x='100' y='260' width='200' height='45' rx='10' fill='%23fbbf24'/><text x='50%' y='283%' dominant-baseline='middle' text-anchor='middle' fill='%231e1b4b' font-size='14' font-family='sans-serif' font-weight='bold'>COMEÇAR AGORA</text></svg>",
  funil_automatico: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><defs><linearGradient id='g3' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23064e3b'/><stop offset='100%' stop-color='%2310b981'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g3)'/><text x='50%' y='40%' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-size='22' font-family='sans-serif' font-weight='bold'>FUNIL AUTOMÁTICO</text><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='%2393c5fd' font-size='16' font-family='sans-serif'>Evolution API + CRM Integrado</text><rect x='100' y='260' width='200' height='45' rx='10' fill='%233b82f6'/><text x='50%' y='283%' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-size='14' font-family='sans-serif' font-weight='bold'>TESTAR GRATIS</text></svg>",
  mentoria_high: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><defs><linearGradient id='g4' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23701a75'/><stop offset='100%' stop-color='%23d946ef'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g4)'/><text x='50%' y='40%' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-size='22' font-family='sans-serif' font-weight='bold'>MENTORIA BLACK</text><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='%23fed7aa' font-size='16' font-family='sans-serif'>Mentoria Individual de Escala</text><rect x='100' y='260' width='200' height='45' rx='10' fill='%23ea580c'/><text x='50%' y='283%' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-size='14' font-family='sans-serif' font-weight='bold'>SOLICITAR ANÁLISE</text></svg>"
};

export function generateMockData(): DashboardMetrics {
  // 1. Campanhas
  const campaigns: CampaignData[] = [
    {
      id: "c_1",
      name: "🚀 [Conversão] Tráfego Direto - Mentoria Black - WhatsApp",
      status: "ACTIVE",
      objective: "OUTCOMES",
      budget: 500, // Diário
      spend: 7420.50,
      impressions: 184500,
      clicks: 4428,
      leads: 369,
      revenue: 29500.00,
      ctr: 2.40,
      cpc: 1.67,
      cpl: 20.10,
      roas: 3.97,
      adsets: [
        {
          id: "as_1_1",
          name: "Público Alvo - Lookalike Compradores 1%",
          status: "ACTIVE",
          budget: 250,
          spend: 3850.25,
          impressions: 96000,
          clicks: 2400,
          leads: 202,
          revenue: 16500.00,
          ctr: 2.50,
          cpc: 1.60,
          cpl: 19.06,
          roas: 4.28,
          ads: [
            {
              id: "ad_1_1_1",
              name: "Criativo 01 - Venda Consultiva [Mentoria]",
              type: "video",
              status: "ACTIVE",
              previewUrl: MOCK_CREATIVES_SVG.mentoria_high,
              headline: "Mentoria de Alto Impacto para Negócios Digitais",
              spend: 2150.00,
              impressions: 54000,
              clicks: 1404,
              leads: 118,
              revenue: 11000.00,
              ctr: 2.60,
              cpc: 1.53,
              cpl: 18.22,
              roas: 5.11
            },
            {
              id: "ad_1_1_2",
              name: "Criativo 02 - Prova Social Mentoria",
              type: "image",
              status: "ACTIVE",
              previewUrl: MOCK_CREATIVES_SVG.vendas_lead,
              headline: "Como o João faturou +100k em 30 dias",
              spend: 1700.25,
              impressions: 42000,
              clicks: 996,
              leads: 84,
              revenue: 5500.00,
              ctr: 2.37,
              cpc: 1.70,
              cpl: 20.24,
              roas: 3.23
            }
          ]
        },
        {
          id: "as_1_2",
          name: "Interesses - Empresários e E-commerce",
          status: "ACTIVE",
          budget: 250,
          spend: 3570.25,
          impressions: 88500,
          clicks: 2028,
          leads: 167,
          revenue: 13000.00,
          ctr: 2.29,
          cpc: 1.76,
          cpl: 21.37,
          roas: 3.64,
          ads: [
            {
              id: "ad_1_2_1",
              name: "Criativo 03 - Escala de Negócios",
              type: "image",
              status: "ACTIVE",
              previewUrl: MOCK_CREATIVES_SVG.escala_negocios,
              headline: "Escale seu faturamento no digital de verdade",
              spend: 1950.25,
              impressions: 48000,
              clicks: 1152,
              leads: 97,
              revenue: 8000.00,
              ctr: 2.40,
              cpc: 1.69,
              cpl: 20.10,
              roas: 4.10
            },
            {
              id: "ad_1_2_2",
              name: "Criativo 04 - Estilo de Vida e Liberdade",
              type: "video",
              status: "ACTIVE",
              previewUrl: MOCK_CREATIVES_SVG.funil_automatico,
              headline: "Construa sistemas que vendem no automático",
              spend: 1620.00,
              impressions: 40500,
              clicks: 876,
              leads: 70,
              revenue: 5000.00,
              ctr: 2.16,
              cpc: 1.84,
              cpl: 23.14,
              roas: 3.08
            }
          ]
        }
      ]
    },
    {
      id: "c_2",
      name: "🔥 [Conversão] Tráfego Morno - Curso Vendas Rápidas",
      status: "ACTIVE",
      objective: "OUTCOMES",
      budget: 300,
      spend: 4120.00,
      impressions: 112000,
      clicks: 3136,
      leads: 313,
      revenue: 12500.00,
      ctr: 2.80,
      cpc: 1.31,
      cpl: 13.16,
      roas: 3.03,
      adsets: [
        {
          id: "as_2_1",
          name: "Remarketing - Visitantes Instagram 30D",
          status: "ACTIVE",
          budget: 300,
          spend: 4120.00,
          impressions: 112000,
          clicks: 3136,
          leads: 313,
          revenue: 12500.00,
          ctr: 2.80,
          cpc: 1.31,
          cpl: 13.16,
          roas: 3.03,
          ads: [
            {
              id: "ad_2_1_1",
              name: "Criativo 05 - Oferta Exclusiva Cupom",
              type: "image",
              status: "ACTIVE",
              previewUrl: MOCK_CREATIVES_SVG.vendas_lead,
              headline: "Garanta seu acesso com 30% de desconto hoje",
              spend: 2200.00,
              impressions: 60000,
              clicks: 1800,
              leads: 188,
              revenue: 7500.00,
              ctr: 3.00,
              cpc: 1.22,
              cpl: 11.70,
              roas: 3.41
            },
            {
              id: "ad_2_1_2",
              name: "Criativo 06 - Quebra de Objeção Dinheiro",
              type: "video",
              status: "ACTIVE",
              previewUrl: MOCK_CREATIVES_SVG.funil_automatico,
              headline: "Menos de 1 real por dia para mudar seu jogo",
              spend: 1920.00,
              impressions: 52000,
              clicks: 1336,
              leads: 125,
              revenue: 5000.00,
              ctr: 2.57,
              cpc: 1.43,
              cpl: 15.36,
              roas: 2.60
            }
          ]
        }
      ]
    },
    {
      id: "c_3",
      name: "⚡ [Atração] Conteúdo & Isca Digital - E-book Funil WhatsApp",
      status: "ACTIVE",
      objective: "OUTCOMES",
      budget: 150,
      spend: 2150.00,
      impressions: 215000,
      clicks: 8600,
      leads: 1075,
      revenue: 0,
      ctr: 4.00,
      cpc: 0.25,
      cpl: 2.00,
      roas: 0.00,
      adsets: [
        {
          id: "as_3_1",
          name: "Amplo - Brasil 21-45",
          status: "ACTIVE",
          budget: 150,
          spend: 2150.00,
          impressions: 215000,
          clicks: 8600,
          leads: 1075,
          revenue: 0,
          ctr: 4.00,
          cpc: 0.25,
          cpl: 2.00,
          roas: 0.00,
          ads: [
            {
              id: "ad_3_1_1",
              name: "Criativo 07 - Mockup E-book Grátis",
              type: "image",
              status: "ACTIVE",
              previewUrl: MOCK_CREATIVES_SVG.funil_automatico,
              headline: "Baixe o Guia Prático de Funil no WhatsApp",
              spend: 2150.00,
              impressions: 215000,
              clicks: 8600,
              leads: 1075,
              revenue: 0,
              ctr: 4.00,
              cpc: 0.25,
              cpl: 2.00,
              roas: 0.00
            }
          ]
        }
      ]
    },
    {
      id: "c_4",
      name: "📦 [Conceito] Branding & Vídeo de Posicionamento Avante",
      status: "PAUSED",
      objective: "OUTCOMES",
      budget: 0,
      spend: 1850.00,
      impressions: 92500,
      clicks: 1850,
      leads: 37,
      revenue: 1500.00,
      ctr: 2.00,
      cpc: 1.00,
      cpl: 50.00,
      roas: 0.81,
      adsets: [
        {
          id: "as_4_1",
          name: "Público Morno Geral (Engajadores)",
          status: "PAUSED",
          budget: 0,
          spend: 1850.00,
          impressions: 92500,
          clicks: 1850,
          leads: 37,
          revenue: 1500.00,
          ctr: 2.00,
          cpc: 1.00,
          cpl: 50.00,
          roas: 0.81,
          ads: [
            {
              id: "ad_4_1_1",
              name: "Criativo 08 - Manifesto de Posicionamento Avante",
              type: "video",
              status: "PAUSED",
              previewUrl: MOCK_CREATIVES_SVG.mentoria_high,
              headline: "Não vendemos cursos, criamos impérios de escala",
              spend: 1850.00,
              impressions: 92500,
              clicks: 1850,
              leads: 37,
              revenue: 1500.00,
              ctr: 2.00,
              cpc: 1.00,
              cpl: 50.00,
              roas: 0.81
            }
          ]
        }
      ]
    }
  ];

  // 2. Histórico de 30 Dias (Gráficos)
  const dailyHistory: DailyMetrics[] = [];
  const baseDate = new Date();
  
  // Gerar dados dos últimos 30 dias com alguma variação orgânica
  for (let i = 29; i >= 0; i--) {
    const dateObj = new Date(baseDate);
    dateObj.setDate(baseDate.getDate() - i);
    const dateStr = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    
    // Variações aleatórias controladas
    const weekdayFactor = [0, 6].includes(dateObj.getDay()) ? 0.75 : 1.1; // Menos gasto/vendas no final de semana
    const spend = Math.round((450 + Math.sin(i * 0.5) * 50) * weekdayFactor * 100) / 100;
    const roasMultiplier = 2.8 + Math.cos(i * 0.8) * 0.7 + (i % 5 === 0 ? 0.8 : -0.2);
    const revenue = Math.round(spend * roasMultiplier * 100) / 100;
    const leads = Math.round((spend / (11 + Math.sin(i * 0.4) * 2)) * 10) / 10;
    const clicks = Math.round(spend / (0.8 + Math.cos(i * 0.3) * 0.1));

    dailyHistory.push({
      date: dateStr,
      spend,
      revenue,
      leads: Math.round(leads),
      clicks,
      roas: Math.round((revenue / spend) * 100) / 100,
      cpl: Math.round((spend / leads) * 100) / 100
    });
  }

  // 3. Totais Acumulados
  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + c.revenue, 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + c.leads, 0);
  const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
  
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
    campaigns,
    dailyHistory
  };
}
