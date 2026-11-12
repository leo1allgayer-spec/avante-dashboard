import { afterEach, describe, expect, it, vi } from 'vitest';
import { supportNotificationExpired, dispatchKey } from '../../supabase/functions/_shared/whatsapp-delivery-policy';
import { sendWhatsAppOnce } from '../../supabase/functions/_shared/whatsapp-dispatch';
import { sendWhatsApp } from '../../supabase/functions/_shared/whatsapp-router';

const env = (key: string) => key.endsWith('API_URL') ? `https://${key.includes('BACKUP') ? 'backup' : 'primary'}.test` : 'test';
afterEach(() => vi.unstubAllGlobals());

describe('WhatsApp delivery safety', () => {
  it('expires late support reminders and old confirmations, including a booking still marked scheduled', () => {
    const now = Date.parse('2026-09-30T14:00:00-03:00');
    expect(supportNotificationExpired('student_reminder_1h', '2026-09-30T13:50:00-03:00', '2026-09-30', '15:00:00', now)).toBe(false);
    expect(supportNotificationExpired('admin_reminder_1h', '2026-09-30T13:30:00-03:00', '2026-09-30', '15:00:00', now)).toBe(true);
    expect(supportNotificationExpired('student_confirmation', '2026-09-28T13:00:00-03:00', '2026-10-01', '15:00:00', now)).toBe(true);
    expect(supportNotificationExpired('student_confirmation', '2026-09-30T12:00:00-03:00', '2026-09-30', '13:00:00', now)).toBe(true);
  });

  it.each([500, 502, 504, 200])('does not try the backup after an ambiguous POST response (%i)', async status => {
    const urls: string[] = [];
    const request = vi.fn(async (url: string) => {
      urls.push(url);
      return url.includes('connectionState') ? new Response('{"state":"open"}') : new Response('<html>unknown</html>', { status });
    });
    const result = await sendWhatsApp('5511111111111', 'test', 'customer', { env, fetch: request as typeof fetch });
    expect(result.accepted).toBe(false);
    expect(result.definitive).toBe(false);
    expect(result.fallback).toBe(false);
    expect(urls).toHaveLength(2);
  });

  it('never POSTs when both numbers are disconnected', async () => {
    const request = vi.fn(async () => new Response('{"state":"close"}'));
    const result = await sendWhatsApp('5511111111111', 'test', 'customer', { env, fetch: request as typeof fetch });
    expect(result.accepted).toBe(false);
    expect(result.definitive).toBe(true);
    expect(request.mock.calls).toHaveLength(2);
  });

  it.each(['processing', 'uncertain', 'error', 'sent'])('does not send or log again for an existing %s claim', async status => {
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    const db = { rpc: vi.fn(async () => ({ data: status, error: null })) };
    const result = await sendWhatsAppOnce(db as any, '5511111111111', 'test', 'customer', 'confirmation', 'booking:date');
    expect(request).not.toHaveBeenCalled();
    expect(result.deduplicated).toBe(true);
    expect(result.accepted).toBe(status === 'sent');
  });

  it('fails closed when the atomic claim is unavailable', async () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    const db = { rpc: vi.fn(async () => ({ error: { message: 'unavailable' } })) };
    await expect(sendWhatsAppOnce(db as any, '5511111111111', 'test', 'customer', 'confirmation', 'booking')).rejects.toThrow('reservar');
    expect(request).not.toHaveBeenCalled();
  });

  it('records a POST timeout as uncertain and not eligible for manual retry', async () => {
    vi.stubGlobal('Deno', { env: { get: env } });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('sendText')) throw new Error('timeout');
      return new Response('{"state":"open"}');
    }));
    const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
    const db = { rpc: vi.fn(async () => ({ data: 'claimed', error: null })), from: vi.fn(() => ({ update })) };
    const result = await sendWhatsAppOnce(db as any, '5511111111111', 'test', 'customer', 'confirmation', 'booking:date');
    expect(result.accepted).toBe(false);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'uncertain', retryable: false }));
  });

  it('separates recipients, event types and rescheduled dates in the dispatch key', async () => {
    const a = await dispatchKey('5511111111111', 'confirmation', 'booking:2026-10-01', '');
    expect(await dispatchKey('5511111111111', 'confirmation', 'booking:2026-10-01', '')).toBe(a);
    expect(await dispatchKey('5522222222222', 'confirmation', 'booking:2026-10-01', '')).not.toBe(a);
    expect(await dispatchKey('5511111111111', 'reminder_1h', 'booking:2026-10-01', '')).not.toBe(a);
    expect(await dispatchKey('5511111111111', 'confirmation', 'booking:2026-10-02', '')).not.toBe(a);
  });
});
