import { describe, expect, it } from 'vitest';
import { sendWhatsApp, isInternalMessage } from '../../supabase/functions/_shared/whatsapp-router';
const env = (key: string) => key.endsWith('API_URL') ? `https://${key.includes('BACKUP') ? 'backup' : 'primary'}.test` : key.endsWith('INSTANCE_NAME') ? 'instance' : 'test-token';
describe('WhatsApp routing', () => {
  it('prefers backup for internal messages when connected', async () => {
    const calls: string[] = [];
    const fetcher = async (url: any) => { calls.push(String(url)); return new Response(JSON.stringify(String(url).includes('connectionState') ? { instance: { state: 'open' } } : { status: 'PENDING' })); };
    expect((await sendWhatsApp('5511111111111', 'test', 'internal', { env, fetch: fetcher as typeof fetch })).accepted).toBe(true);
    expect(calls.every(u => u.startsWith('https://backup.test'))).toBe(true);
  });
  it('keeps customers on primary after acceptance', async () => {
    const calls: string[] = [];
    const fetcher = async (url: any) => { calls.push(String(url)); return new Response(JSON.stringify(String(url).includes('connectionState') ? { instance: { state: 'open' } } : { status: 'PENDING' })); };
    const result = await sendWhatsApp('5511111111111', 'test', 'customer', { env, fetch: fetcher as typeof fetch });
    expect(result.channel).toBe('primary'); expect(calls).toHaveLength(2);
  });
  it('falls back when primary is disconnected or explicitly rejects the send', async () => {
    for (const disconnected of [true, false]) {
      const fetcher = async (url: any) => {
        const primary = String(url).includes('primary.test');
        return new Response(JSON.stringify(String(url).includes('connectionState') ? { instance: { state: primary && disconnected ? 'close' : 'open' } } : primary ? { status: 'ERROR' } : { status: 'PENDING' }));
      };
      const result = await sendWhatsApp('5511111111111', 'test', 'customer', { env, fetch: fetcher as typeof fetch });
      expect(result.accepted).toBe(true); expect(result.fallback).toBe(true);
    }
  });
  it.each(['internal', 'customer'] as const)('does not resend an ambiguous %s send timeout', async (audience) => {
    const calls: string[] = [];
    const fetcher = async (url: any) => { calls.push(String(url)); if (String(url).includes('sendText')) throw Error('timeout'); return new Response(JSON.stringify({ instance: { state: 'open' } })); };
    const result = await sendWhatsApp('5511111111111', 'test', audience, { env, fetch: fetcher as typeof fetch });
    expect(result.accepted).toBe(false); expect(result.fallback).toBe(false); expect(calls).toHaveLength(2);
    expect(isInternalMessage('support_admin_reminder_1h')).toBe(true);
    expect(isInternalMessage('support_admin_leonardo_reminder_1h')).toBe(true);
    expect(isInternalMessage('reschedule_admin_notice')).toBe(true);
    expect(isInternalMessage('support_student_confirmation')).toBe(false);
  });
  it.each([true, false])('uses primary for internal messages when backup fails (disconnected=%s)', async disconnected => {
    const posts: string[] = [];
    const fetcher = async (url: any) => {
      const backup = String(url).includes('backup.test');
      if (String(url).includes('connectionState')) return new Response(JSON.stringify({ state: backup && disconnected ? 'close' : 'open' }));
      posts.push(String(url));
      return new Response(JSON.stringify({ status: backup ? 'ERROR' : 'PENDING' }));
    };
    const result = await sendWhatsApp('5511111111111', 'test', 'internal', { env, fetch: fetcher as typeof fetch });
    expect(result.accepted).toBe(true);
    expect(result.channel).toBe('primary');
    expect(result.fallback).toBe(true);
    expect(posts.filter(url => url.includes('primary.test'))).toHaveLength(1);
  });
});
