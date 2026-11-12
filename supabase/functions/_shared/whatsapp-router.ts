import { definitiveSendRejection } from './whatsapp-delivery-policy.ts';
export type WhatsAppAudience = 'internal' | 'customer';
type Config = { url: string; instance: string; token: string };
type Dependencies = { env: (key: string) => string | undefined; fetch: typeof fetch };
export function isInternalMessage(type: string) {
  return ['google_manager_notification', 'new_student_registration', 'reschedule_admin_notice', 'daily_course_summary', 'meeting_reminder'].includes(type)
    || type.startsWith('support_admin_');
}
export async function sendWhatsApp(phone: string, text: string, audience: WhatsAppAudience, dependencies?: Dependencies) {
  const env = dependencies?.env || ((key: string) => Deno.env.get(key));
  const request = dependencies?.fetch || fetch;
  const config = (backup: boolean): Config | null => {
    const prefix = backup ? 'EVOLUTION_BACKUP_' : 'EVOLUTION_';
    const url = env(prefix + 'API_URL'), instance = env(prefix + 'INSTANCE_NAME'), token = env(prefix + 'API_TOKEN');
    return url && instance && token ? { url: url.trim().replace(/\/+$/, '').replace(/\/manager$/i, ''), instance, token } : null;
  };
  const failed = (status: number, message: string, definitive = true) => ({ accepted: false, deliveryStatus: 'error', status, result: { error: message }, resultText: message, definitive });
  const attempt = async (target: Config | null) => {
    if (!target) return failed(503, 'Canal WhatsApp não configurado');
    let name = target.instance;
    // Check connectivity before sending, so a disconnected principal can safely fall back.
    try {
      let response = await request(`${target.url}/instance/connectionState/${encodeURIComponent(name)}`, { headers: { apikey: target.token }, signal: AbortSignal.timeout(8000) });
      if (response.status === 404) {
        await response.text();
        const list = await request(`${target.url}/instance/fetchInstances`, { headers: { apikey: target.token }, signal: AbortSignal.timeout(8000) });
        const instances = await list.json();
        const match = Array.isArray(instances) && instances.find(i => [i.name, i.profileName, i.instance?.instanceName].some(n => String(n || '').toLowerCase() === name.toLowerCase()));
        if (!list.ok || !match) return failed(404, 'Instância WhatsApp não encontrada');
        name = match.name || match.instance.instanceName;
        response = await request(`${target.url}/instance/connectionState/${encodeURIComponent(name)}`, { headers: { apikey: target.token }, signal: AbortSignal.timeout(8000) });
      }
      const state = await response.json();
      if (!response.ok) return failed(response.status, 'Não foi possível consultar o canal WhatsApp');
      if (String(state?.instance?.state ?? state?.state ?? '').toLowerCase() !== 'open') return failed(503, 'Canal WhatsApp desconectado');
    } catch { return failed(503, 'Canal WhatsApp indisponível'); }
    try {
      const response = await request(`${target.url}/message/sendText/${encodeURIComponent(name)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: target.token },
        body: JSON.stringify({ number: phone, text }), signal: AbortSignal.timeout(15000),
      });
      const raw = await response.text();
      let result: any;
      try { result = JSON.parse(raw); } catch { return failed(response.status, 'Resposta de envio não confirmada', definitiveSendRejection(response.status)); }
      const accepted = response.ok && !result?.error && !['ERROR', 'FAILED'].includes(String(result?.status || '').toUpperCase());
      return { accepted, deliveryStatus: accepted ? 'sent' : 'error', status: response.status, result, resultText: raw,
        definitive: accepted || definitiveSendRejection(response.status) || (response.ok && ['ERROR', 'FAILED'].includes(String(result?.status || '').toUpperCase())) };
    } catch {
      // A timeout after POST is ambiguous: resending immediately could duplicate a message.
      return failed(504, 'Envio sem confirmação do provedor; verificar antes de reenviar', false);
    }
  };
  const firstChannel = audience === 'internal' ? 'backup' : 'primary';
  const first = await attempt(config(firstChannel === 'backup'));
  if (first.accepted || !first.definitive) return { ...first, channel: firstChannel, fallback: false };
  const secondChannel = firstChannel === 'backup' ? 'primary' : 'backup';
  const second = await attempt(config(secondChannel === 'backup'));
  return { ...second, channel: secondChannel, fallback: true };
}
