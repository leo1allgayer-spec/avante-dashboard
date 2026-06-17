/**
 * Utilitários para normalização e hashing SHA-256 de dados do cliente no navegador.
 * Necessário para o envio seguro de eventos à API de Conversões da Meta (CAPI).
 */

/**
 * Normaliza um e-mail: remove espaços, converte para minúsculas.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normaliza um número de telefone no formato internacional:
 * Mantém apenas dígitos e adiciona o código do país (+55 para Brasil) caso falte.
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, ""); // Apenas dígitos
  
  if (!cleaned) return "";

  // Se não tem código de país e parece ser do Brasil (ex: 11999999999 ou 1188888888)
  if (cleaned.length === 10 || cleaned.length === 11) {
    if (cleaned[0] !== "0") {
      cleaned = "55" + cleaned;
    }
  } else if (cleaned.startsWith("0") && (cleaned.length === 11 || cleaned.length === 12)) {
    // Remove zero inicial (ex: 011999999999) e coloca 55
    cleaned = "55" + cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Normaliza uma string de texto genérico (ex: Primeiro Nome, Sobrenome, Cidade).
 * Remove espaços extras e converte para minúsculas.
 */
export function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Gera o hash SHA-256 de uma string utilizando a Web Crypto API nativa.
 * Retorna uma string hexadecimal do hash.
 */
export async function sha256(message: string): Promise<string> {
  if (!message) return "";
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Recebe dados brutos do cliente e retorna a estrutura hashificada necessária para o CAPI.
 */
export interface RawUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string; // ex: SP
  clientIpAddress?: string;
  clientUserAgent?: string;
}

export interface HashedUserData {
  em?: string[]; // Email hashed
  ph?: string[]; // Phone hashed
  fn?: string[]; // First name hashed
  ln?: string[]; // Last name hashed
  ct?: string[]; // City hashed
  st?: string[]; // State hashed
  client_ip_address?: string;
  client_user_agent?: string;
}

export async function hashUserData(data: RawUserData): Promise<HashedUserData> {
  const hashed: HashedUserData = {};

  if (data.email) {
    hashed.em = [await sha256(normalizeEmail(data.email))];
  }
  
  if (data.phone) {
    hashed.ph = [await sha256(normalizePhone(data.phone))];
  }
  
  if (data.firstName) {
    hashed.fn = [await sha256(normalizeText(data.firstName))];
  }
  
  if (data.lastName) {
    hashed.ln = [await sha256(normalizeText(data.lastName))];
  }
  
  if (data.city) {
    hashed.ct = [await sha256(normalizeText(data.city))];
  }
  
  if (data.state) {
    hashed.st = [await sha256(normalizeText(data.state))];
  }

  if (data.clientIpAddress) {
    hashed.client_ip_address = data.clientIpAddress;
  }

  if (data.clientUserAgent) {
    hashed.client_user_agent = data.clientUserAgent;
  }

  return hashed;
}
