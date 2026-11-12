import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';
import { dispatchKey } from './whatsapp-delivery-policy.ts';
import { sendWhatsApp, type WhatsAppAudience } from './whatsapp-router.ts';

export async function sendWhatsAppOnce(
  supabase: SupabaseClient, phone: string, text: string, audience: WhatsAppAudience,
  type: string, identity: string, manualRetry = false,
) {
  const key = await dispatchKey(phone, type, identity, identity ? '' : text);
  const { data: claim, error } = await supabase.rpc('claim_whatsapp_dispatch', { p_key: key, p_manual_retry: manualRetry });
  if (error || !claim) throw new Error('Não foi possível reservar o envio; nenhuma mensagem foi enviada.');
  if (claim !== 'claimed') {
    const sent = claim === 'sent';
    const message = sent ? 'Mensagem já enviada.' : claim === 'error'
      ? 'Tentativa anterior falhou. Reenvio automático suspenso; revisão manual após 15 minutos.'
      : 'Envio em processamento ou sem confirmação. Verifique a entrega antes de qualquer novo envio.';
    return { accepted: sent, deliveryStatus: sent ? 'sent' : 'error', status: sent ? 200 : 409,
      result: { error: message }, resultText: message, definitive: false, channel: '', fallback: false, deduplicated: true };
  }
  try {
    const result = await sendWhatsApp(phone, text, audience);
    const { error: saveError } = await supabase.from('whatsapp_dispatch_attempts').update({
      status: result.accepted ? 'sent' : result.definitive ? 'error' : 'uncertain',
      retryable: !result.accepted && result.definitive, updated_at: new Date().toISOString(),
    }).eq('dispatch_key', key);
    // Keeping a processing claim is safer than replaying an unrecorded delivery.
    if (saveError) console.error('WhatsApp delivery state could not be saved');
    return { ...result, deduplicated: false };
  } catch (error) {
    await supabase.from('whatsapp_dispatch_attempts').update({ status: 'uncertain', retryable: false }).eq('dispatch_key', key);
    throw error;
  }
}
