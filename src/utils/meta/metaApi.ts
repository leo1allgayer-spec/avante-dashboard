/**
 * Conector de Integração para a Meta Graph API e Conversions API (CAPI).
 * Permite interagir com as APIs de marketing e de eventos da Meta diretamente do cliente.
 */

export interface MetaCredentials {
  pixelId: string;
  capiToken: string;
  adAccountId: string;
}

export interface CapiEventPayload {
  eventName: "Lead" | "Purchase" | "InitiateCheckout" | "Contact";
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  value?: number;
  currency?: string;
  testEventCode?: string;
}

/**
 * Envia um evento de conversão para a Meta Conversions API (CAPI).
 * Faz o processamento de hashing SHA-256 localmente antes de disparar.
 */
import { hashUserData } from "./crypto";

export async function sendCapiEvent(
  credentials: MetaCredentials,
  event: CapiEventPayload
): Promise<{ success: boolean; data?: any; error?: string }> {
  const { pixelId, capiToken } = credentials;

  if (!pixelId || !capiToken) {
    return { success: false, error: "Pixel ID ou CAPI Access Token ausentes nas configurações." };
  }

  try {
    // 1. Normaliza e hashifica os dados pessoais do usuário
    const hashedUserData = await hashUserData({
      email: event.email,
      phone: event.phone,
      firstName: event.firstName,
      lastName: event.lastName,
      city: event.city,
      state: event.state,
      clientUserAgent: navigator.userAgent,
      clientIpAddress: "127.0.0.1" // Fallback local, CAPI aceita IP fictício em ambiente local
    });

    // 2. Monta o objeto de evento estruturado da Meta
    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = `${event.eventName.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const eventData: any = {
      event_name: event.eventName,
      event_time: eventTime,
      event_id: eventId,
      action_source: "chat", // CAPI via WhatsApp/chat
      user_data: hashedUserData
    };

    // Adiciona valor e moeda se existirem
    if (event.value !== undefined) {
      eventData.custom_data = {
        value: Number(event.value),
        currency: event.currency || "BRL"
      };
    }

    // 3. Monta o payload final
    const payload: any = {
      data: [eventData]
    };

    // Adiciona código de teste do Gerenciador de Eventos se fornecido
    if (event.testEventCode) {
      payload.test_event_code = event.testEventCode.trim();
    }

    // 4. Faz a requisição HTTP direta para a Graph API da Meta
    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: result.error?.message || `Meta API respondeu HTTP ${response.status}` 
      };
    }

    return { success: true, data: result };
  } catch (err: any) {
    console.error("Erro no disparo CAPI:", err);
    return { success: false, error: err.message || "Erro desconhecido de conexão com a Meta." };
  }
}

/**
 * Consulta insights de campanhas reais na Meta Marketing API.
 * Retorna os gastos, impressões, cliques e ações de conversão da Ad Account.
 */
export async function fetchMetaInsights(
  credentials: MetaCredentials,
  daysAgo: number = 30
): Promise<{ success: boolean; data?: any; error?: string }> {
  const { adAccountId, capiToken } = credentials;

  if (!adAccountId || !capiToken) {
    return { success: false, error: "Ad Account ID ou Access Token ausentes." };
  }

  // Remove prefixo 'act_' se o usuário tiver inserido
  const cleanAccountId = adAccountId.toLowerCase().startsWith("act_")
    ? adAccountId.slice(4)
    : adAccountId;

  try {
    const today = new Date().toISOString().split("T")[0];
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysAgo);
    const since = pastDate.toISOString().split("T")[0];

    const timeRange = JSON.stringify({ since, until: today });
    const fields = "campaign_name,campaign_id,spend,clicks,impressions,actions,action_values";
    const url = `https://graph.facebook.com/v19.0/act_${cleanAccountId}/insights` + 
      `?level=campaign` + 
      `&fields=${fields}` +
      `&time_range=${encodeURIComponent(timeRange)}` +
      `&access_token=${capiToken}` +
      `&limit=50`;

    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: result.error?.message || `Meta API respondeu HTTP ${response.status}` 
      };
    }

    return { success: true, data: result.data };
  } catch (err: any) {
    console.error("Erro ao buscar insights da Meta:", err);
    return { success: false, error: err.message || "Erro de conexão com o Facebook Graph API (CORS ou Rede)." };
  }
}
